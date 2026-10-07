// Fires the moment a vendor/venue finishes onboarding (BusinessSignupForm's
// `finish()` step, after the businesses row + documents + media are already
// saved). Everything about the submission is already in Supabase by the
// time this runs — this function's only job is the second half of "stored
// in Supabase, and sent to email": emailing owen@wedthread.co so they don't
// have to keep checking the Review vendors/venues page.
//
// Uses Resend (https://resend.com) — requires these Edge Function secrets:
// RESEND_API_KEY, RESEND_FROM_EMAIL (must be a sender on a domain you've
// verified in Resend, e.g. "WedThread <notifications@yourdomain.com>"), plus
// the standard SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY Supabase provides
// automatically. No placeholder values are used — if the secrets aren't
// set, this fails loudly (500) rather than pretending to send.

import { createClient } from "npm:@supabase/supabase-js@2";

const NOTIFY_EMAIL = "owen@wedthread.co";
// Links in the email always point at our own site; never at an address the caller supplies.
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

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !fromEmail) return respond(500, { error: "RESEND_API_KEY / RESEND_FROM_EMAIL not configured" });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Only the signed-in owner of the business may trigger this email.
    const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return respond(401, { error: "Sign in required" });

    const { business_id } = await req.json();
    if (typeof business_id !== "string" || !business_id) return respond(400, { error: "business_id is required" });

    const { data: business, error: bizError } = await service
      .from("businesses")
      .select("id,user_id,legal_business_name,business_type,business_description,country,created_at")
      .eq("id", business_id).single();
    if (bizError || !business) return respond(404, { error: "Business not found" });
    if (business.user_id !== userData.user.id) return respond(403, { error: "Not your business" });

    const reviewPath = business.business_type === "venue" ? "/admin/venues" : "/admin/vendors";
    const reviewUrl = `${APP_URL}${reviewPath}`;
    const noun = business.business_type === "venue" ? "venue" : "vendor";

    const html = `
      <p>A new ${noun} has submitted their profile for review on WedThread:</p>
      <p><strong>${escapeHtml(business.legal_business_name)}</strong>${business.country ? ` — ${escapeHtml(business.country)}` : ""}</p>
      <p>${escapeHtml(business.business_description)}</p>
      <p><a href="${reviewUrl}">Review it →</a></p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [NOTIFY_EMAIL],
        subject: `New ${noun} to review: ${business.legal_business_name}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return respond(502, { error: `Resend error: ${text}` });
    }

    return respond(200, { sent: true, notified: NOTIFY_EMAIL });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
