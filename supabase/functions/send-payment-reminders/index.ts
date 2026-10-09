// Emails couples a reminder for a pending expense whose reminder time has arrived.
//
// Called every 15 minutes by pg_cron (see the schedule_payment_reminders migration). Each run picks up
// expenses that are still pending, have a reminder_at in the past, and haven't been sent yet; emails the
// wedding owner's registered address (and, when the reminder asks for it, every collaborator who has accepted
// their invitation); then stamps reminder_sent_at so it only ever goes out once. A
// failed send is left unstamped and retried on the next run.
//
// Uses Resend (https://resend.com) — requires RESEND_API_KEY and RESEND_FROM_EMAIL (same secrets as
// notify-business-submission), plus the standard SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Optionally set
// APP_URL (e.g. https://wedthread.com) to add an "Open your budget" link to the email.

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
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: due, error } = await service
    .from("expenses")
    .select("id,name,amount,due_date,wedding_id,reminder_include_collaborators,weddings(owner_id,partner_a,partner_b,budget_currency)")
    .eq("status", "pending")
    .is("reminder_sent_at", null)
    .not("reminder_at", "is", null)
    .lte("reminder_at", new Date().toISOString())
    .limit(200);
  if (error) return respond(500, { error: error.message });

  const emailCache = new Map<string, string | null>();
  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const exp of due ?? []) {
    const wedding = (exp as any).weddings;
    const ownerId: string | undefined = wedding?.owner_id;
    if (!ownerId) { skipped++; continue; }

    if (!emailCache.has(ownerId)) {
      const { data } = await service.auth.admin.getUserById(ownerId);
      emailCache.set(ownerId, data?.user?.email ?? null);
    }
    const ownerEmail = emailCache.get(ownerId);
    if (!ownerEmail) { skipped++; continue; }
    const recipients = [ownerEmail];
    if ((exp as any).reminder_include_collaborators) {
      const { data: collabs } = await service
        .from("wedding_collaborators").select("email").eq("wedding_id", exp.wedding_id).not("accepted_at", "is", null);
      for (const c of collabs ?? []) {
        const e = String(c.email ?? "").trim();
        if (e && !recipients.some((r) => r.toLowerCase() === e.toLowerCase())) recipients.push(e);
      }
    }

    const currency = wedding.budget_currency || "USD";
    let amount = `${currency} ${Number(exp.amount).toLocaleString("en-US")}`;
    try { amount = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(exp.amount)); } catch { /* keep fallback */ }
    const dueText = exp.due_date
      ? new Date(`${exp.due_date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
      : null;

    const html = `
      <p>A friendly reminder from WEDthread:</p>
      <p><strong>${escapeHtml(exp.name)}</strong>: ${escapeHtml(amount)}${dueText ? ` is due on <strong>${escapeHtml(dueText)}</strong>` : " is waiting to be paid"}.</p>
      ${appUrl ? `<p><a href="${appUrl}/budget">Open your budget →</a></p>` : ""}
      <p style="color:#6b7a88;font-size:12px">You're getting this because you set a payment reminder on this expense. Mark it as paid in your budget and nothing more will be sent.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: recipients, subject: `Payment reminder: ${exp.name}`, html }),
    });
    if (!res.ok) {
      failed++;
      const detail = `${res.status} ${await res.text()}`;
      console.error("Resend refused reminder", exp.id, detail);
      errors.push(detail);
      continue;
    }

    await service.from("expenses").update({ reminder_sent_at: new Date().toISOString() }).eq("id", exp.id);
    sent++;
  }

  return respond(200, { sent, skipped, failed, ...(errors.length ? { errors: [...new Set(errors)] } : {}) });
});
