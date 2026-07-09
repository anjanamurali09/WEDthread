import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // If the user has no role yet (e.g. just signed up with email+google),
    // send them to the role picker — except when they're already there.
    if (!location.pathname.startsWith("/auth")) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1);
      if (!roles || roles.length === 0) {
        throw redirect({ to: "/auth/role" as any });
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
