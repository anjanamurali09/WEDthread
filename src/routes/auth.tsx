import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Let's set up your wedding.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper text-ink">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-ink text-paper">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-2xl">Vowzy</span>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-clay">For weddings that don't fit in one box</p>
          <h2 className="mt-6 font-serif text-5xl leading-tight">
            Two families.<br />
            <span className="italic">Many ceremonies.</span><br />
            One place to plan them all.
          </h2>
        </div>
        <p className="text-xs text-paper/50">Launching in India. Built for the world.</p>
      </div>

      {/* Right: auth form */}
      <div className="flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
            <span className="font-serif text-2xl">Vowzy</span>
          </Link>
          <h1 className="font-serif text-4xl">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? "One account for both partners and your co-planners." : "Sign in to keep planning."}
          </p>

          <button onClick={onGoogle} disabled={loading} className="mt-8 w-full flex items-center justify-center gap-3 rounded-full border border-line py-3 text-sm hover:bg-stone/60 disabled:opacity-60">
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-line" /> or email <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onEmail} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </div>
            <button disabled={loading} className="w-full rounded-full bg-ink text-paper py-3 text-sm font-medium hover:bg-clay disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Vowzy?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-clay underline underline-offset-4">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6C12.2 13.4 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.8 7.2l7.4 5.7c4.3-4 6.7-9.9 6.7-17.4z"/><path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.8 16.7 0 20.2 0 24s.8 7.3 2.5 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2.1 1.4-4.8 2.2-7.8 2.2-6.4 0-11.8-3.9-13.7-9.3l-7.8 6C6.4 42.6 14.6 48 24 48z"/></svg>
  );
}
