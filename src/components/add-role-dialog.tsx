import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HeartHandshake, Building2, Store, ShoppingBag, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { addRoleForCurrentUser, useActiveRole, type AppRole } from "@/hooks/use-active-role";

const OPTIONS: { role: AppRole; label: string; desc: string; icon: any }[] = [
  { role: "couple",  label: "Getting married", desc: "Plan ceremonies, guests, seating, and your website.", icon: HeartHandshake },
  { role: "planner", label: "Planner",         desc: "Coordinate every couple you work with, side by side.", icon: ClipboardList },
  { role: "venue",   label: "List a venue",    desc: "Reach couples planning a destination wedding.",       icon: Building2 },
  { role: "vendor",  label: "List services",   desc: "Photographers, planners, mehendi artists, florists.", icon: Store },
  { role: "seller",  label: "Sell items",      desc: "Resell décor, dresses, tableware after your day.",    icon: ShoppingBag },
];

export function AddRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { roles, setActive } = useActiveRole();
  const [saving, setSaving] = useState<AppRole | null>(null);

  const pick = async (role: AppRole) => {
    // Vendor and venue both get the same multi-step business signup (legal
    // details, verification documents, media, and — venue only — venue
    // details + lead form) instead of the instant add-and-land every other
    // role uses — the role itself isn't added until that wizard is actually
    // completed (see BusinessSignupForm's `finish` step).
    if (role === "vendor" || role === "venue") {
      onOpenChange(false);
      router.navigate({ to: (role === "venue" ? "/business/onboarding/venue" : "/business/onboarding") as any });
      return;
    }
    setSaving(role);
    try {
      await addRoleForCurrentUser(role);
      setActive(role);
      toast.success(`Switched to ${role === "couple" ? "couple" : role}.`);
      onOpenChange(false);
      // Land on the dashboard, which renders role-specific onboarding
      // inline. Never bounce through /auth — the user is already signed in.
      router.navigate({ to: "/dashboard" as any });
    } catch (err: any) {
      toast.error(err.message ?? "Could not add role");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-pearl border-line p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-line/60">
          <DialogTitle className="font-serif text-2xl">Add another role</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Pick another way to use WedThread. You can switch between roles anytime.
          </DialogDescription>
        </div>
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {OPTIONS.map(({ role, label, desc, icon: Icon }) => {
            const already = roles.includes(role);
            return (
              <button
                key={role}
                onClick={() => !already && pick(role)}
                disabled={already || saving !== null}
                className="w-full flex items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left hover:border-cherry hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-line"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg">{label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {already && <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center">Added</span>}
                {saving === role && <span className="text-[10px] uppercase tracking-widest text-cherry self-center">Adding…</span>}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
