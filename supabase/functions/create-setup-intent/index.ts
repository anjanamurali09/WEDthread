// Creates (or reuses) a Stripe Customer for the calling user and returns a
// SetupIntent client secret, for the "Add Payment Method" flow (Stripe
// Payment Element, client-side confirmation). Card-on-file is entirely
// optional — nothing in the enquiry flow requires this to have ever run.
//
// Requires these Supabase Edge Function secrets (set via the dashboard, not
// committed anywhere): STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. The last three are provided automatically in
// every Supabase project's edge function environment.

import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return respond(401, { error: "Not signed in" });
    const user = userData.user;

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Reuse an existing Stripe customer if this user already has one on file
    // (from a previously saved card) instead of creating a duplicate.
    const { data: existing } = await service
      .from("payment_methods")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const customerId = existing?.stripe_customer_id ?? (await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })).id;

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { supabase_user_id: user.id },
    });

    return respond(200, { clientSecret: setupIntent.client_secret, customerId });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
