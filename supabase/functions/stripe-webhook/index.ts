// Reconciles async Stripe events. Two concerns:
//  - setup_intent.succeeded: persists the card-on-file (payment_methods row)
//    once a couple finishes the Add Payment Method flow — the Payment
//    Element confirms client-side, but card brand/last4 and the durable
//    payment_methods row are only ever written here, from Stripe's own
//    webhook payload.
//  - payment_intent.succeeded / payment_intent.payment_failed: reconciles
//    enquiry_charges.status. Only relevant once enquiry_charging_enabled is
//    true — submit-enquiry already writes the charge synchronously, so this
//    is a backstop for anything that changes status asynchronously later
//    (e.g. a delayed payment method).
//
//  - checkout.session.completed / customer.subscription.*: the monthly venue and vendor subscription. The
//    business is listed (verification_status = 'verified') while the subscription is active or past due, and
//    goes back to 'pending' (unlisted) when it ends. Businesses that never subscribed are not touched.
//
// Requires these Edge Function secrets: STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Register this function's URL as a webhook endpoint in the Stripe
// dashboard listening for: setup_intent.succeeded, payment_intent.succeeded,
// payment_intent.payment_failed, checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted.

import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// Records the subscription and lists or unlists the business to match it.
async function syncSubscription(service: ReturnType<typeof createClient>, subscription: Stripe.Subscription, businessIdHint?: string | null) {
  let businessId = businessIdHint ?? subscription.metadata?.business_id ?? null;
  if (!businessId) {
    const { data: row } = await service.from("business_subscriptions").select("business_id").eq("stripe_subscription_id", subscription.id).maybeSingle();
    businessId = row?.business_id ?? null;
  }
  if (!businessId) return;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await service.from("business_subscriptions").upsert({
    business_id: businessId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id" });

  // A business an admin rejected stays rejected whatever happens with the payment.
  if (["active", "trialing", "past_due"].includes(subscription.status)) {
    await service.from("businesses").update({ verification_status: "verified" }).eq("id", businessId).eq("verification_status", "pending");
  } else if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
    await service.from("businesses").update({ verification_status: "pending" }).eq("id", businessId).eq("verification_status", "verified");
  }
}

Deno.serve(async (req: Request) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe env vars not configured" }), { status: 500 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Invalid signature: ${err instanceof Error ? err.message : err}` }), { status: 400 });
  }

  try {
    switch (event.type) {
      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const userId = setupIntent.metadata?.supabase_user_id;
        const paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
        const customerId = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id;
        if (userId && paymentMethodId && customerId) {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          const { data: existingCount } = await service.from("payment_methods").select("id").eq("user_id", userId);
          await service.from("payment_methods").upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_payment_method_id: paymentMethodId,
            card_brand: pm.card?.brand ?? null,
            card_last4: pm.card?.last4 ?? null,
            is_default: (existingCount?.length ?? 0) === 0,
          }, { onConflict: "user_id,stripe_payment_method_id" });
        }
        break;
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await service.from("enquiry_charges").update({ status: "succeeded" }).eq("stripe_payment_intent_id", intent.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await service.from("enquiry_charges").update({ status: "failed" }).eq("stripe_payment_intent_id", intent.id);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(service, subscription, session.metadata?.business_id ?? session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(service, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }), { status: 500 });
  }
});
