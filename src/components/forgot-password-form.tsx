import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Asks Supabase to email a reset link. The wording after sending is the same whether or not an account
// exists for the address, so this can't be used to find out who has an account.
export function ForgotPasswordForm({ initialEmail = "", onBack, compact = false }: { initialEmail?: string; onBack: () => void; compact?: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass = compact
    ? "w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry"
    : "mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/reset` });
    setSending(false);
    if (err) return setError(err.message);
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className="space-y-3">
        <p className="text-sm">If there's an account for <span className="font-medium">{sentTo}</span>, a link to reset your password is on its way. It can take a minute, and it may land in spam.</p>
        <button type="button" onClick={() => setSentTo(null)} className="text-sm text-cherry underline underline-offset-4">Use a different email</button>
        <div><button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-ink">Back to sign in</button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        {!compact && <label className="text-sm uppercase tracking-widest text-muted-foreground">Email</label>}
        <input required type="email" placeholder={compact ? "Email" : undefined} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button disabled={sending || !email.trim()}
        className={compact
          ? "w-full rounded-full bg-cherry text-pearl py-2.5 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors"
          : "w-full rounded-full bg-cherry text-pearl py-3 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors"}>
        {sending ? "Sending…" : "Send reset link"}
      </button>
      <div className="text-center"><button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-ink">Back to sign in</button></div>
    </form>
  );
}
