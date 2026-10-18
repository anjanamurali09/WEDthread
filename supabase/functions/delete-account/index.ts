// Deletes the signed-in person's WEDthread account: their profile, sign-in, and everything that belongs to it (any
// wedding they own, their venue or vendor listings, saved items and so on, all of which follow the account when it is
// removed). Deleting only a wedding stays a separate action in the app.
//
// Only the account's own owner can do this, and only by sending their own email address back as confirmation. It
// needs the service role (a signed-in person cannot remove their own sign-in from the browser), which is provided
// automatically: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

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

  try {
    const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    const user = userData?.user;
    if (!user) return respond(401, { error: "Sign in required" });

    const { confirm_email } = await req.json().catch(() => ({}));
    if (typeof confirm_email !== "string" || confirm_email.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return respond(400, { error: "Type your email address to confirm" });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Remove this person's own weddings first, and any invitations sent to their address, so nothing refers to
    // the account when it goes.
    await service.from("weddings").delete().eq("owner_id", user.id);
    if (user.email) await service.from("wedding_collaborators").delete().ilike("email", user.email);

    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) return respond(500, { error: error.message });
    return respond(200, { deleted: true });
  } catch (err) {
    return respond(500, { error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
