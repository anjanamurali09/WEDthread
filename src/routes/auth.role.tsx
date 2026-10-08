import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { resolveCoupleLanding } from "@/lib/wedding-hooks";
import { ROLE_OPTIONS } from "@/lib/role-options";
import { Logo } from "@/components/logo";
import { z } from "zod";
import { addRoleForCurrentUser, ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";

const searchSchema = z.object({
  add: z.enum(["1"]).optional(),
});

export const Route = createFileRoute("/auth/role")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Choose your role · WEDthread" },
      { name: "description", content: "Tell us how you'll use WEDthread." },
    ],
  }),
  component: RolePicker,
});

const OPTIONS = ROLE_OPTIONS;

function RolePicker() {
  const navigate = useNavigate();
  const { add } = useSearch({ from: "/auth/role" });
  const [saving, setSaving] = useState<AppRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      // Skip the picker on later visits: if the user already has a role
      // and isn't explicitly adding another, send them to their dashboard.
      if (!add) {
        const { data: existing } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .limit(1);
        if (existing && existing.length > 0) {
          window.localStorage.setItem("wedthread.activeRole", existing[0].role);
          navigate({ to: "/dashboard" as any, replace: true });
          return;
        }
      }
      setReady(true);
    })();
  }, [navigate, add]);

  const pick = async (role: AppRole) => {
    setSaving(role);
    try {
      await addRoleForCurrentUser(role);
      toast.success(`You're set up as ${role === "couple" ? "a couple" : `a ${role}`}.`);
      if (role === "couple") {
        const { data: u } = await supabase.auth.getUser();
        navigate({ to: (await resolveCoupleLanding(u.user!.id)) as any, replace: true });
        return;
      }
      // Send new roles straight to their onboarding surface (dashboards
      // render inline onboarding for vendor/venue/seller/planner), never
      // to the generic marketplace.
      navigate({ to: "/dashboard" as any, replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Could not set role");
    } finally {
      setSaving(null);
    }
  };

  if (!ready) return <div className="min-h-screen bg-pearl" />;

  return (
    <div className="min-h-screen bg-pearl text-ink">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <Link to="/" data-static className="inline-flex items-center gap-2">
          <Logo />
        </Link>

        <div className="mt-12">
          <p className="text-sm uppercase tracking-[0.2em] text-cherry">
            {add ? "Add another role" : "One more step"}
          </p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl leading-[1.05]">
            {add ? "How else will you use WEDthread?" : "How will you use WEDthread?"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {add
              ? "Add another role to your account. You can switch between them anytime."
              : "Pick one to get started. You can always add more roles later."}
          </p>

          <div className="mt-8 space-y-3">
            {OPTIONS.map(({ role, label, desc, icon: Icon, comingSoon }) => (
              <button
                key={role}
                onClick={() => pick(role)}
                disabled={saving !== null || comingSoon}
                className="w-full flex items-start gap-4 rounded-3xl border border-line bg-paper p-5 text-left hover:border-cherry hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:border-line disabled:hover:translate-y-0"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-wine-soft text-wine">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-xl">{label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {comingSoon && <span className="ml-auto self-center shrink-0 rounded-full bg-[#FFE08A] px-3 py-1 text-xs font-medium text-[#243746]">Coming soon</span>}
                {saving === role && (
                  <span className="ml-auto text-sm text-cherry self-center">Setting up…</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
