import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSessionUser } from "@/lib/session-user";
import { fetchCurrentWedding } from "@/lib/wedding-hooks";

// People whose roles have already been confirmed in this tab, so moving between pages does not repeat the check.
const rolesConfirmed = new Set<string>();

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    // Read from the stored session: no network round trip on every page change. The database's row-level
    // security still protects the data itself.
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/auth" });

    // If the user has no role yet (e.g. just signed up), send them to the role picker, except when they're
    // already there. Checked once per person per tab.
    if (!location.pathname.startsWith("/auth") && !rolesConfirmed.has(user.id)) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles || roles.length === 0) throw redirect({ to: "/auth/role" as any });
      rolesConfirmed.add(user.id);
      // The page needs these straight away, so save it asking for them again.
      context.queryClient.setQueryData(["my-roles"], roles.map((r) => r.role));
    }

    // Start loading the wedding now, in parallel with the page code, rather than after the page appears.
    void context.queryClient.prefetchQuery({ queryKey: ["current-wedding"], queryFn: fetchCurrentWedding, staleTime: 30_000 });

    return { user };
  },
  component: () => <Outlet />,
});
