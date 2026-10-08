import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [
      { title: "Reset your password · WEDthread" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { invited?: boolean } => (s.invited === 1 || s.invited === "1" || s.invited === true ? { invited: true } : {}),
  component: ResetPasswordPage,
});

const MIN_LENGTH = 8;

// The page the emailed link opens. Supabase turns the link into a short-lived session; with it the person
// can choose a new password. A link that has expired or was already used leaves no session behind.
function ResetPasswordPage() {
  const navigate = useNavigate();
  const invited = !!Route.useSearch().invited;
  const [state, setState] = useState<"checking" | "ready" | "expired" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) setState("ready");
    });
    (async () => {
      // The client reads the link on load; give it a moment before deciding the link is no good.
      for (let i = 0; i < 25 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { if (!cancelled) setState((s) => (s === "checking" ? "ready" : s)); return; }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) setState((s) => (s === "checking" ? "expired" : s));
    })();
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(err.message);
    setState("done");
    setTimeout(() => navigate({ to: "/auth/callback", replace: true }), 1500);
  };

  const input = "mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry";

  return (
    <div className="min-h-screen bg-pearl text-ink grid place-items-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center"><Logo /></div>

        {state === "checking" && <p className="text-center text-sm text-muted-foreground animate-pulse">Checking your link…</p>}

        {state === "expired" && (
          <div className="text-center">
            <h1 className="font-serif text-3xl">This link has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">Reset links work once and only for a short time. Request a new one and we'll email it right away.</p>
            <Link to="/auth" search={{ mode: "forgot" } as any} className="mt-6 inline-block rounded-full bg-cherry text-pearl px-6 py-3 text-sm font-medium hover:bg-wine transition-colors">Get a new link</Link>
          </div>
        )}

        {state === "ready" && (
          <>
            <h1 className="font-serif text-4xl">{invited ? "Welcome to WEDthread" : "Choose a new password"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{invited ? "Create a password to join the wedding you were invited to." : "Pick something you haven't used elsewhere."} At least {MIN_LENGTH} characters.</p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label className="text-sm uppercase tracking-widest text-muted-foreground">New password</label>
                <input required type="password" minLength={MIN_LENGTH} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-sm uppercase tracking-widest text-muted-foreground">Confirm password</label>
                <input required type="password" minLength={MIN_LENGTH} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button disabled={saving} className="w-full rounded-full bg-cherry text-pearl py-3 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors">
                {saving ? "Saving…" : invited ? "Create password and continue" : "Update password"}
              </button>
            </form>
          </>
        )}

        {state === "done" && (
          <div className="text-center">
            <h1 className="font-serif text-3xl">{invited ? "You're in" : "Password updated"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{invited ? "Opening the wedding…" : "Taking you to your workspace…"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
