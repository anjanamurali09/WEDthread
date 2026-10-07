// Turns a Phase 3 lead_form_submission into a real enquiry: creates (or
// reuses) the couple<->vendor conversation, posts the lead form answers as
// the thread's first message, and records an enquiry_charges row either way.
//
// Charging is gated entirely behind app_settings.enquiry_charging_enabled
// (default false). While it's false — today's state — no payment method is
// ever required and no couple is ever blocked: the enquiry is created
// immediately and the charge row is written with status='skipped', purely
// for future record-keeping once real pricing ships.
//
// Requires these Edge Function secrets: STRIPE_SECRET_KEY, SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (the last three are provided
// automatically in every Supabase project).

import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function formatResponsesAsMessage(responses: Record<string, string>): string {
  const lines = Object.entries(responses)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`);
  return lines.length > 0 ? lines.join("\n") : "(No details provided.)";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return respond(401, { error: "Not signed in" });
    const user = userData.user;

    const { lead_form_submission_id } = await req.json();
    if (typeof lead_form_submission_id !== "string" || !lead_form_submission_id) {
      return respond(400, { error: "lead_form_submission_id is required" });
    }

    // Read the submission through the CALLER's own client, not the service
    // client — this enforces "lead_form_submissions couple read own" RLS, so
    // a user can never submit-enquiry on someone else's submission id.
    const { data: submission, error: subError } = await userClient
      .from("lead_form_submissions")
      .select("id, lead_form_id, vendor_service_id, business_id, wedding_id, responses")
      .eq("id", lead_form_submission_id)
      .single();
    if (subError || !submission) return respond(404, { error: "Submission not found" });

    // An enquiry is one-per-submission — if this was already processed
    // (e.g. a retried request), return the existing enquiry instead of
    // creating a duplicate.
    const { data: existingEnquiry } = await service
      .from("enquiries")
      .select("id, conversation_id")
      .eq("lead_form_submission_id", submission.id)
      .maybeSingle();
    if (existingEnquiry) return respond(200, { success: true, enquiryId: existingEnquiry.id, conversationId: existingEnquiry.conversation_id, alreadyProcessed: true });

    // Two entry points: a vendor's service (vendor_service_id set — Phase 4)
    // or a venue's business directly (business_id set, no service — Phase
    // 5, venues have no sub-services).
    let businessId: string;
    let listingName: string;
    if (submission.vendor_service_id) {
      const { data: vendorService, error: vsError } = await service
        .from("vendor_services").select("id, business_id, service_name")
        .eq("id", submission.vendor_service_id).single();
      if (vsError || !vendorService) return respond(404, { error: "Service not found" });
      businessId = vendorService.business_id;
      listingName = vendorService.service_name;
    } else if (submission.business_id) {
      const { data: business, error: bizError } = await service
        .from("businesses").select("id, legal_business_name")
        .eq("id", submission.business_id).single();
      if (bizError || !business) return respond(404, { error: "Business not found" });
      businessId = business.id;
      listingName = business.legal_business_name;
    } else {
      return respond(400, { error: "Submission has neither a service nor a business" });
    }

    const { data: wedding } = await service
      .from("weddings")
      .select("destination_country")
      .eq("id", submission.wedding_id)
      .maybeSingle();

    // Best-available proxy for "the couple's billing country": there is no
    // dedicated couple/billing-country field anywhere in this schema, only
    // the wedding's own destination. This is a plain string match against
    // free-text country names (e.g. "India"), not an ISO code lookup — real
    // enquiry_rates rows need to be entered using the same text couples type
    // into their wedding's destination_country field.
    const country = wedding?.destination_country ?? null;
    let rate: { amount_cents: number; currency: string } | null = null;
    if (country) {
      const { data: countryRate } = await service
        .from("enquiry_rates").select("amount_cents, currency")
        .ilike("country_code", country).maybeSingle();
      rate = countryRate ?? null;
    }
    if (!rate) {
      const { data: fallbackRate } = await service
        .from("enquiry_rates").select("amount_cents, currency")
        .is("country_code", null).maybeSingle();
      rate = fallbackRate ?? { amount_cents: 300, currency: "usd" };
    }

    const { data: settingRow } = await service.from("app_settings").select("value").eq("key", "enquiry_charging_enabled").maybeSingle();
    const chargingEnabled = settingRow?.value === true;

    const messageBody = formatResponsesAsMessage((submission.responses as Record<string, string>) ?? {});

    const createEnquiryAndPostMessage = async (chargeStatus: "succeeded" | "skipped", stripePaymentIntentId: string | null) => {
      // Reuse the couple<->vendor conversation across every service/enquiry
      // between them, creating it on first contact.
      let conversationId: string;
      const { data: existingConvo } = await service
        .from("conversations").select("id")
        .eq("wedding_id", submission.wedding_id).eq("business_id", businessId).maybeSingle();
      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error: convoError } = await service
          .from("conversations").insert({ wedding_id: submission.wedding_id, business_id: businessId }).select("id").single();
        if (convoError || !newConvo) throw new Error(convoError?.message ?? "Could not create conversation");
        conversationId = newConvo.id;
      }

      const { data: enquiry, error: enquiryError } = await service
        .from("enquiries")
        .insert({
          wedding_id: submission.wedding_id,
          business_id: businessId,
          vendor_service_id: submission.vendor_service_id ?? null,
          lead_form_submission_id: submission.id,
          conversation_id: conversationId,
        })
        .select("id").single();
      if (enquiryError || !enquiry) throw new Error(enquiryError?.message ?? "Could not create enquiry");

      await service.from("enquiry_charges").insert({
        enquiry_id: enquiry.id,
        stripe_payment_intent_id: stripePaymentIntentId,
        amount_cents: rate!.amount_cents,
        currency: rate!.currency,
        status: chargeStatus,
      });

      await service.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_role: "couple",
        sender_user_id: user.id,
        body: `New enquiry — ${listingName}\n\n${messageBody}`,
      });

      return { enquiryId: enquiry.id, conversationId };
    };

    if (!chargingEnabled) {
      const result = await createEnquiryAndPostMessage("skipped", null);
      return respond(200, { success: true, ...result });
    }

    // Charging-enabled path (not active while the flag defaults false).
    const { data: paymentMethod } = await service
      .from("payment_methods").select("stripe_customer_id, stripe_payment_method_id")
      .eq("user_id", user.id).eq("is_default", true).maybeSingle();
    if (!paymentMethod) return respond(402, { error: "no_payment_method" });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return respond(500, { error: "STRIPE_SECRET_KEY is not configured" });
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    try {
      const intent = await stripe.paymentIntents.create({
        amount: rate.amount_cents,
        currency: rate.currency,
        customer: paymentMethod.stripe_customer_id,
        payment_method: paymentMethod.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { supabase_user_id: user.id, lead_form_submission_id: submission.id },
      });

      if (intent.status === "succeeded") {
        const result = await createEnquiryAndPostMessage("succeeded", intent.id);
        return respond(200, { success: true, ...result });
      }
      await service.from("enquiry_charges").insert({
        enquiry_id: null, stripe_payment_intent_id: intent.id,
        amount_cents: rate.amount_cents, currency: rate.currency, status: "failed",
      });
      return respond(402, { error: "charge_failed" });
    } catch (chargeErr) {
      const pi = (chargeErr as Stripe.errors.StripeError).raw?.payment_intent as { id?: string } | undefined;
      await service.from("enquiry_charges").insert({
        enquiry_id: null, stripe_payment_intent_id: pi?.id ?? null,
        amount_cents: rate.amount_cents, currency: rate.currency, status: "failed",
      });
      return respond(402, { error: "charge_failed" });
    }
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
