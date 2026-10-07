// Emails someone an invitation to help plan a wedding as a collaborator.
//
// The collaborator row itself is created by the app (row-level security lets only the wedding's owner
// insert it). This function then sends the email. It only sends when the caller is signed in, owns the
// wedding, and has already added that exact email as a collaborator, so it can't be used to email
// arbitrary people. Access itself is matched by email, so the person just needs a WedThread account
// (new or existing) with the invited address.
//
// Uses Resend — requires RESEND_API_KEY and RESEND_FROM_EMAIL (same secrets as the other email
// functions), plus the standard SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
// Optional APP_URL (defaults to https://www.wedthread.co) is the address the links point to.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = (Deno.env.get("APP_URL") ?? "https://www.wedthread.co").replace(/\/$/, "");

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

  try {
    const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    const user = userData?.user;
    if (!user) return respond(401, { error: "Sign in required" });

    const { wedding_id, email } = await req.json();
    if (typeof wedding_id !== "string" || typeof email !== "string" || !email) return respond(400, { error: "wedding_id and email are required" });
    const to = email.trim().toLowerCase();

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: wedding } = await service.from("weddings").select("id,owner_id,partner_a,partner_b").eq("id", wedding_id).maybeSingle();
    if (!wedding) return respond(404, { error: "Wedding not found" });
    if (wedding.owner_id !== user.id) return respond(403, { error: "Only the wedding's owner can send invites" });

    const { data: collaborator } = await service.from("wedding_collaborators").select("id").eq("wedding_id", wedding_id).eq("email", to).maybeSingle();
    if (!collaborator) return respond(404, { error: "Add this person as a collaborator first" });

    const { data: profile } = await service.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const inviter = profile?.display_name?.trim() || wedding.partner_a || "Someone";
    const couple = `${wedding.partner_a} & ${wedding.partner_b}`;
    const signIn = `${APP_URL}/auth`;
    const signUp = `${APP_URL}/auth?mode=signup`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>You're invited to help plan a wedding</title></head>
<body style="margin:0;padding:0;background-color:#FDFCF7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFCF7;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #DCE6F2;border-radius:24px;">
<tr><td align="center" style="padding:40px 40px 8px 40px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#243746;letter-spacing:1px;">WED<span style="font-style:italic;">thread</span></span></td></tr>
<tr><td align="center" style="padding:24px 40px 0 40px;"><h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:normal;color:#243746;">Help plan ${escapeHtml(couple)}'s wedding</h1></td></tr>
<tr><td align="center" style="padding:16px 40px 0 40px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4A5B6A;"><strong style="color:#243746;">${escapeHtml(inviter)}</strong> has invited you to plan together on WEDthread. You'll be able to edit guests, events, seating, the budget and more.</p></td></tr>
<tr><td align="center" style="padding:28px 40px 8px 40px;"><a href="${signIn}" style="display:inline-block;background-color:#FFE08A;color:#243746;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:999px;">Accept the invitation</a></td></tr>
<tr><td align="center" style="padding:20px 40px 0 40px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6B7C8C;">Already have a WEDthread account? Sign in with <strong>${escapeHtml(to)}</strong> and the wedding appears in your workspace.<br>New to WEDthread? <a href="${signUp}" style="color:#4A7CAD;text-decoration:underline;">Create an account</a> with this same email address.</p></td></tr>
<tr><td style="padding:32px 40px 0 40px;"><div style="height:1px;background-color:#DCE6F2;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td align="center" style="padding:20px 40px 36px 40px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A98A6;">You're getting this because ${escapeHtml(inviter)} added ${escapeHtml(to)} as a collaborator. If you weren't expecting it, you can ignore this email.</p></td></tr>
</table>
<p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A98A6;">© WEDthread &middot; www.wedthread.co</p>
</td></tr></table></body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [to], subject: `${inviter} invited you to help plan ${couple}'s wedding`, html }),
    });
    if (!res.ok) return respond(502, { error: `Resend error: ${await res.text()}` });

    return respond(200, { sent: true });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
