import { supabase } from "@/integrations/supabase/client";

// The signed-in user, read from the session already stored in the browser. Unlike `supabase.auth.getUser()`,
// this makes no network call, which matters because it is needed on almost every screen. Row-level security in
// the database still decides what that user can actually read or change, so this is only for knowing who is
// signed in, not for trusting them.
export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
