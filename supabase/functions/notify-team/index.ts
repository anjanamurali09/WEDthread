// Emails the WEDthread team (owen@wedthread.co) when a couple joins a feature waitlist or sends feedback. Both are
// already saved in the database by the app; this is the "and it lands in your inbox" step, called right after.
//
// Only a signed-in user can trigger it, and only for a wedding they can read. What is emailed is read back from the
// database (the couple's own latest waitlist row or feedback), never taken from the request, so it cannot be used to
// send arbitrary text.
//
// Uses Resend. Requires RESEND_API_KEY and RESEND_FROM_EMAIL (same secrets as the other email functions), plus the
// standard SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";

const TEAM_EMAIL = "owen@wedthread.co";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const FEATURE_NAMES: Record<string, string> = { whatsapp_direct_send: "WhatsApp direct send" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !fromEmail) return respond(500, { error: "RESEND_API_KEY / RESEND_FROM_EMAIL not configured" });

  try {
    const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return respond(401, { error: "Sign in required" });

    const { kind, wedding_id } = await req.json();
    if ((kind !== "waitlist" && kind !== "feedback") || typeof wedding_id !== "string" || !wedding_id) {
      return respond(400, { error: "kind (waitlist or feedback) and wedding_id are required" });
    }

    // Read through the caller's own client so row-level security decides whether they may see this wedding's rows.
    const { data: wedding } = await authed.from("weddings").select("partner_a,partner_b,destination_city,destination_country").eq("id", wedding_id).maybeSingle();
    if (!wedding) return respond(403, { error: "Not your wedding" });
    const couple = `${wedding.partner_a?.trim() || "Partner 1"} & ${wedding.partner_b?.trim() || "Partner 2"}`;
    const place = [wedding.destination_city, wedding.destination_country].filter(Boolean).join(", ");
    const who = `${escapeHtml(couple)}${place ? ` (${escapeHtml(place)})` : ""}<br/>Account: ${escapeHtml(userData.user.email ?? "unknown")}`;

    let subject: string;
    let html: string;
    if (kind === "waitlist") {
      const { data: row } = await (authed as any).from("feature_waitlist").select("feature,created_at").eq("wedding_id", wedding_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return respond(404, { error: "No waitlist entry found" });
      const feature = FEATURE_NAMES[row.feature as string] ?? String(row.feature);
      subject = `Waitlist: ${feature} - ${couple}`;
      html = `<p>A couple joined the <strong>${escapeHtml(feature)}</strong> waitlist.</p><p>${who}</p>`;
    } else {
      const { data: row } = await (authed as any).from("feedback").select("rating,message,created_at").eq("wedding_id", wedding_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return respond(404, { error: "No feedback found" });
      subject = `Feedback (${row.rating}/5) - ${couple}`;
      html = `<p><strong>${escapeHtml(String(row.rating))}/5</strong></p>${row.message ? `<p style="white-space:pre-line">${escapeHtml(String(row.message))}</p>` : "<p><em>No message.</em></p>"}<p>${who}</p>`;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [TEAM_EMAIL], ...(userData.user.email ? { reply_to: userData.user.email } : {}), subject, html }),
    });
    if (!res.ok) return respond(502, { error: `Resend error: ${await res.text()}` });
    return respond(200, { sent: true });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
