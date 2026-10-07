// "Book a viewing" (the in-app fallback used when a business hasn't set an
// external calendar link) already lands in the vendor/venue's normal
// Enquiries inbox via submit-enquiry — this function is purely the extra
// "and it gets sent on email" step, called right after that succeeds. It
// never blocks or reverses the enquiry itself if it fails.
//
// Unclaimed businesses (user_id IS NULL) have no owner account yet, so
// there's nobody to email — this responds 200 with sent:false rather than
// erroring, since the enquiry itself is still valid and already recorded.
//
// Uses Resend (https://resend.com) — requires RESEND_API_KEY,
// RESEND_FROM_EMAIL (same secrets as notify-business-submission), plus the
// standard SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !fromEmail) return respond(500, { error: "RESEND_API_KEY / RESEND_FROM_EMAIL not configured" });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { business_id, wedding_id, preferred_date, preferred_time, message, origin } = await req.json();
    if (typeof business_id !== "string" || !business_id) return respond(400, { error: "business_id is required" });
    if (typeof wedding_id !== "string" || !wedding_id) return respond(400, { error: "wedding_id is required" });

    const [{ data: business, error: bizError }, { data: wedding }] = await Promise.all([
      service.from("businesses").select("id,legal_business_name,user_id").eq("id", business_id).single(),
      service.from("weddings").select("partner_a,partner_b").eq("id", wedding_id).maybeSingle(),
    ]);
    if (bizError || !business) return respond(404, { error: "Business not found" });
    if (!business.user_id) return respond(200, { sent: false, reason: "unclaimed" });

    const { data: ownerData, error: ownerError } = await service.auth.admin.getUserById(business.user_id);
    const ownerEmail = ownerData?.user?.email;
    if (ownerError || !ownerEmail) return respond(200, { sent: false, reason: "no_owner_email" });

    const coupleName = wedding ? `${wedding.partner_a} & ${wedding.partner_b}` : "A couple";
    const messagesUrl = typeof origin === "string" && origin ? `${origin}/business/messages` : "/business/messages";

    const html = `
      <p><strong>${escapeHtml(coupleName)}</strong> would like to book a viewing at <strong>${escapeHtml(business.legal_business_name)}</strong>.</p>
      <p>Preferred date: ${escapeHtml(preferred_date || "Not specified")}<br/>
      Preferred time: ${escapeHtml(preferred_time || "Not specified")}</p>
      ${message ? `<p>${escapeHtml(message)}</p>` : ""}
      <p><a href="${messagesUrl}">Reply on WedThread →</a></p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [ownerEmail],
        subject: `New viewing request — ${business.legal_business_name}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return respond(502, { error: `Resend error: ${text}` });
    }

    return respond(200, { sent: true });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
