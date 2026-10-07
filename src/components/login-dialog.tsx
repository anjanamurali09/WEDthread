import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";
import { resolveCoupleLanding } from "@/lib/wedding-hooks";

type Mode = "signin" | "signup";

async function routeAfterSignIn(navigate: ReturnType<typeof useNavigate>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  let active = (roles?.[0]?.role as AppRole | undefined) ?? null;
  if (!active) {
    await supabase.from("user_roles").insert({ user_id: u.user.id, role: "couple" });
    active = "couple";
  }
  window.localStorage.setItem("wedthread.activeRole", active);
  if (active === "couple") {
    const landing = await resolveCoupleLanding(u.user.id);
    navigate({ to: landing as any });
    return;
  }
  navigate({ to: ROLE_LANDING[active] as any });
}

async function routeAfterSignUp(navigate: ReturnType<typeof useNavigate>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  navigate({ to: "/auth/role" as any });
}

export function LoginDialog({
  open,
  onOpenChange,
  initialMode = "signin",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialMode?: Mode;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setEmail(""); setPassword(""); setLoading(false); };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created.");
        close(false);
        await routeAfterSignUp(navigate);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        close(false);
        await routeAfterSignIn(navigate);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-3xl bg-pearl border-line p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-3 border-b border-line/60 flex items-center gap-3">
          <div>
            <DialogTitle className="font-serif text-xl">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {mode === "signup" ? "You'll pick your role next" : "Sign in to continue"}
            </DialogDescription>
          </div>
        </div>

        <div className="px-6 pt-4 pb-6">
          <form onSubmit={submit} className="space-y-3">
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            <input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            <button disabled={loading}
              className="w-full rounded-full bg-cherry text-pearl py-2.5 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              onClick={() => {
                // Creating an account happens on the full page; this popup is just for signing in.
                if (mode === "signin") { close(false); navigate({ to: "/auth", search: { mode: "signup" } as any }); }
                else setMode("signin");
              }}
              className="text-cherry underline underline-offset-4">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
