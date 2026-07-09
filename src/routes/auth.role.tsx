import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, HeartHandshake, Building2, Store, ShoppingBag, ClipboardList } from "lucide-react";
import { z } from "zod";
import { addRoleForCurrentUser, ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";

const searchSchema = z.object({
  add: z.enum(["1"]).optional(),
});

export const Route = createFileRoute("/auth/role")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Choose your role — Vowzy" },
      { name: "description", content: "Tell us how you'll use Vowzy." },
    ],
  }),
  component: RolePicker,
});

const OPTIONS: { role: AppRole; label: string; desc: string; icon: any }[] = [
  { role: "couple",  label: "Getting married", desc: "Plan ceremonies, guests, seating, and your website.", icon: HeartHandshake },
  { role: "planner", label: "Planner",         desc: "Coordinate every couple you work with, side by side.", icon: ClipboardList },
  { role: "venue",   label: "List a venue",    desc: "Reach couples planning a destination wedding.",       icon: Building2 },
  { role: "vendor",  label: "List services",   desc: "Photographers, planners, mehendi artists, florists.", icon: Store },
  { role: "seller",  label: "Sell items",      desc: "Resell décor, dresses, tableware after your day.",    icon: ShoppingBag },
];

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
      setReady(true);
    })();
  }, [navigate]);

  const pick = async (role: AppRole) => {
    setSaving(role);
    try {
      await addRoleForCurrentUser(role);
      toast.success(`You're set up as ${role === "couple" ? "a couple" : `a ${role}`}.`);
      if (role === "couple") {
        const { data: u } = await supabase.auth.getUser();
        const { data: w } = await supabase
          .from("weddings")
          .select("id")
          .eq("owner_id", u.user!.id)
          .limit(1)
          .maybeSingle();
        navigate({ to: (w ? "/dashboard" : "/onboarding") as any, replace: true });
        return;
      }
      navigate({ to: ROLE_LANDING[role] as any, replace: true });
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
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-cherry text-pearl"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-2xl">Vowzy</span>
        </Link>

        <div className="mt-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cherry">
            {add ? "Add another role" : "One more step"}
          </p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl leading-[1.05]">
            {add ? "How else will you use Vowzy?" : "How will you use Vowzy?"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {add
              ? "Add another role to your account. You can switch between them anytime."
              : "Pick one to get started. You can always add more roles later."}
          </p>

          <div className="mt-8 space-y-3">
            {OPTIONS.map(({ role, label, desc, icon: Icon }) => (
              <button
                key={role}
                onClick={() => pick(role)}
                disabled={saving !== null}
                className="w-full flex items-start gap-4 rounded-3xl border border-line bg-paper p-5 text-left hover:border-cherry hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-wine-soft text-wine">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-xl">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {saving === role && (
                  <span className="ml-auto text-xs text-cherry self-center">Setting up…</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
