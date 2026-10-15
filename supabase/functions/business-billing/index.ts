// Sends a venue or vendor owner to Stripe: Checkout to start their monthly subscription, or the billing portal to
// change card, see invoices or cancel. The listing goes live from the stripe-webhook function once Stripe confirms
// the payment, never from here.
//
// Requires these Edge Function secrets (set via the dashboard or CLI, never committed): STRIPE_SECRET_KEY,
// STRIPE_PRICE_VENDOR, STRIPE_PRICE_VENUE (the recurring monthly prices created in Stripe). SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically. Optional: APP_URL.

import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// Where Stripe sends people back to. Always our own site, never an address the caller supplies.
const APP_URL = (Deno.env.get("APP_URL") ?? "https://www.wedthread.co").replace(/\/$/, "");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return respond(500, { error: "STRIPE_SECRET_KEY is not configured" });
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return respond(401, { error: "Not signed in" });
    const user = userData.user;

    const { action, business_id } = await req.json().catch(() => ({}));
    if ((action !== "checkout" && action !== "portal") || typeof business_id !== "string") {
      return respond(400, { error: "Expected an action (checkout or portal) and a business_id" });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only the owner of the business can bill it.
    const { data: business } = await service
      .from("businesses")
      .select("id,business_type,verification_status,user_id")
      .eq("id", business_id)
      .maybeSingle();
    if (!business || business.user_id !== user.id) return respond(403, { error: "This is not your business" });

    const { data: subscription } = await service
      .from("business_subscriptions")
      .select("stripe_customer_id,status")
      .eq("business_id", business_id)
      .maybeSingle();

    if (action === "portal") {
      if (!subscription) return respond(400, { error: "There is no subscription to manage yet" });
      const portal = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${APP_URL}/business/dashboard`,
      });
      return respond(200, { url: portal.url });
    }

    if (business.verification_status === "rejected") return respond(403, { error: "This listing was not approved. Contact hello@wedthread.co" });
    if (subscription && ["active", "trialing", "past_due"].includes(subscription.status)) {
      return respond(409, { error: "This business already has a subscription" });
    }

    const price = Deno.env.get(business.business_type === "venue" ? "STRIPE_PRICE_VENUE" : "STRIPE_PRICE_VENDOR");
    if (!price) return respond(500, { error: "The subscription price is not configured" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(subscription?.stripe_customer_id ? { customer: subscription.stripe_customer_id } : { customer_email: user.email ?? undefined }),
      client_reference_id: business_id,
      metadata: { business_id },
      subscription_data: { metadata: { business_id } },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/business/dashboard?subscribed=1`,
      cancel_url: `${APP_URL}/business/dashboard`,
    });
    return respond(200, { url: session.url });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
