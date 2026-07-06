import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Sparkles, HeartHandshake, Building2, Store, ShoppingBag, ClipboardList } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

type Role = "couple" | "planner" | "venue" | "vendor" | "seller";
type Mode = "signin" | "signup";

const LANDING: Record<Role, string> = {
  couple: "/onboarding",
  planner: "/dashboard",
  venue: "/vendors",
  vendor: "/vendors",
  seller: "/vendors",
};

const SIGNIN_ROLES: { role: Role; label: string; icon: any }[] = [
  { role: "couple", label: "Couple", icon: HeartHandshake },
  { role: "planner", label: "Planner", icon: ClipboardList },
  { role: "venue", label: "Venue", icon: Building2 },
  { role: "vendor", label: "Vendor", icon: Store },
];

const SIGNUP_ROLES: { role: Role; label: string; desc: string; icon: any }[] = [
  { role: "couple", label: "Getting married", desc: "Plan ceremonies, guests, seating, and your website.", icon: HeartHandshake },
  { role: "venue", label: "List a venue", desc: "Reach couples planning a destination wedding.", icon: Building2 },
  { role: "vendor", label: "List services", desc: "Photographers, planners, mehendi artists, florists.", icon: Store },
  { role: "seller", label: "Sell items", desc: "Resell décor, dresses, tableware after your day.", icon: ShoppingBag },
];

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
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setRole(null); setEmail(""); setPassword(""); setLoading(false);
  };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { signup_role: role } },
        });
        if (error) throw error;
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      close(false);
      navigate({ to: LANDING[role] as any });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); return; }
      if (result.redirected) return;
      close(false);
      navigate({ to: role ? (LANDING[role] as any) : "/dashboard" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-3xl bg-pearl border-line p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-line/60 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-cherry text-pearl"><Sparkles className="h-4 w-4" /></span>
          <div>
            <DialogTitle className="font-serif text-xl">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {role ? `As a ${role}` : mode === "signup" ? "Choose how you'll use Vowzy" : "Pick your account type"}
            </DialogDescription>
          </div>
        </div>

        <div className="p-6">
          {!role ? (
            <div className="grid gap-2.5">
              {(mode === "signup" ? SIGNUP_ROLES : SIGNIN_ROLES).map(({ role: r, label, icon: Icon, ...rest }: any) => (
                <button key={r} onClick={() => setRole(r)}
                  className="group flex items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left hover:border-cherry hover:bg-blush-soft transition-all hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine group-hover:bg-cherry group-hover:text-pearl transition-colors"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="font-serif text-lg leading-tight">{label}</p>
                    {rest.desc && <p className="text-xs text-muted-foreground mt-0.5">{rest.desc}</p>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <button onClick={() => setRole(null)} className="text-xs text-muted-foreground hover:text-cherry mb-4">← Change account type</button>
              <button onClick={google} disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-full border border-line py-2.5 text-sm hover:bg-cream disabled:opacity-60 transition-colors">
                <GoogleIcon /> Continue with Google
              </button>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <div className="h-px flex-1 bg-line" /> or email <div className="h-px flex-1 bg-line" />
              </div>
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
              <p className="mt-4 text-xs text-center text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setRole(null); }} className="text-cherry underline underline-offset-4">
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </p>
            </>
          )}
          <p className="mt-5 text-[11px] text-center text-muted-foreground">
            Prefer the full page? <Link to="/auth" onClick={() => close(false)} className="underline underline-offset-2 hover:text-cherry">Open sign-in hub</Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6C12.2 13.4 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.8 7.2l7.4 5.7c4.3-4 6.7-9.9 6.7-17.4z"/><path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.8 16.7 0 20.2 0 24s.8 7.3 2.5 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2.1 1.4-4.8 2.2-7.8 2.2-6.4 0-11.8-3.9-13.7-9.3l-7.8 6C6.4 42.6 14.6 48 24 48z"/></svg>
  );
}
