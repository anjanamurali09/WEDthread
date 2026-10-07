// Connects a wedding to a Google account (for the Sheets integration).
//
//   POST {action:"start", wedding_id, return_to}  (user JWT)  -> {url} to send the browser to Google
//   GET  ?code=...&state=...                      (Google)    -> stores the refresh token, redirects back to the app
//
// Only the drive.file scope is requested: WEDthread can see and edit just the spreadsheets
// it creates itself, never anything else in the couple's Drive.
//
// Edge Function secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. In Google Cloud Console add
// this function's URL (https://<project>.supabase.co/functions/v1/google-oauth) as an
// Authorized redirect URI. SUPABASE_* are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const SCOPES = ["https://www.googleapis.com/auth/drive.file", "openid", "email"].join(" ");

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const redirectUri = `${supabaseUrl}/functions/v1/google-oauth`;

const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(serviceKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body)}`;
}

async function readState(state: string): Promise<Record<string, any> | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  try {
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
  const service = createClient(supabaseUrl, serviceKey);
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  // ---- Google redirects back here ----
  if (req.method === "GET") {
    const url = new URL(req.url);
    const state = await readState(url.searchParams.get("state") ?? "");
    if (!state) return new Response("This link has expired. Go back to WEDthread and try connecting again.", { status: 400 });
    const back = (flag: string) => Response.redirect(`${state.return_to}${state.return_to.includes("?") ? "&" : "?"}integration=${flag}`, 302);
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.get("error")) return back("denied");
    if (!clientId || !clientSecret) return back("error");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) return back("error");

    let email: string | null = null;
    try {
      const info = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } })).json();
      email = info.email ?? null;
    } catch { /* email is cosmetic */ }

    const { data: integ, error } = await service.from("integrations")
      .upsert({ wedding_id: state.wedding_id, provider: "google", account_email: email }, { onConflict: "wedding_id,provider" })
      .select("id").single();
    if (error || !integ) return back("error");
    await service.from("integration_secrets").upsert({ integration_id: integ.id, refresh_token: tokens.refresh_token });
    return back("connected");
  }

  // ---- App asks for the Google consent URL ----
  try {
    const { action, wedding_id, return_to } = await req.json();
    if (action !== "start") return respond(400, { error: "Unknown action" });
    if (!clientId || !clientSecret) return respond(500, { error: "Google isn't configured yet (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." });

    const authed = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: user } = await authed.auth.getUser();
    if (!user.user) return respond(401, { error: "Not signed in" });
    const { data: wedding } = await authed.from("weddings").select("id").eq("id", wedding_id).maybeSingle(); // RLS: owner only
    if (!wedding) return respond(403, { error: "No access to this wedding" });

    const state = await signState({ wedding_id, return_to, exp: Date.now() + 10 * 60_000 });
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.search = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPES,
      access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
    }).toString();
    return respond(200, { url: auth.toString() });
  } catch (e) {
    return respond(500, { error: String(e) });
  }
});
