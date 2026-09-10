import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";
import { resolveCoupleLanding } from "@/lib/wedding-hooks";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in · WedThread" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const route = async () => {
      // Wait briefly for the Supabase client to hydrate the session from the URL.
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);

      if (!roles || roles.length === 0) {
        navigate({ to: "/auth/role" as any, replace: true });
        return;
      }

      const active = roles[0].role as AppRole;
      window.localStorage.setItem("wedthread.activeRole", active);

      if (active === "couple") {
        const landing = await resolveCoupleLanding(u.user.id);
        navigate({ to: landing as any, replace: true });
        return;
      }
      navigate({ to: ROLE_LANDING[active] as any, replace: true });
    };

    route();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-pearl text-ink grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-cherry text-pearl animate-pulse">
          <Sparkles className="h-5 w-5" />
        </span>
        <p className="font-serif text-2xl">Signing you in…</p>
        <p className="text-sm text-muted-foreground">One moment while we set things up.</p>
      </div>
    </div>
  );
}
