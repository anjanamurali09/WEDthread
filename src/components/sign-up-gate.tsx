import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { LoginDialog } from "@/components/login-dialog";
import { Lock, X } from "lucide-react";

// A fixed overlay shown once a signed-out visitor has used up their free
// previews (see useAnonViewGate) — the caller renders the real page behind
// it (blurred + pointer-events-none), so the listing itself still shows
// through rather than being replaced by a blank page.
export function SignUpGate({ backTo }: {
  // Where the close button sends them if there's no real browser history to
  // go back to (e.g. this listing was opened directly, not from browsing
  // the marketplace) — the marketplace grid they'd have come from.
  backTo: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const close = () => {
    // Prefer real back-navigation so they land exactly where they were
    // (same scroll position, same filters) — falls back to the
    // marketplace when this listing was opened directly, since there's
    // nothing to go back to.
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: backTo });
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/10 backdrop-blur-[2px] px-6">
      <div className="relative max-w-sm w-full rounded-3xl bg-paper border border-line shadow-2xl p-8 text-center">
        <button type="button" onClick={close} aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-ink hover:bg-stone cursor-pointer">
          <X className="h-4 w-4" />
        </button>
        <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-cherry/10 text-cherry"><Lock className="h-5 w-5" /></span>
        <h1 className="mt-4 font-serif text-3xl">You've run out of previews.</h1>
        <p className="mt-2 text-muted-foreground">
          Sign up free to keep exploring, save favorites, and enquire directly.
        </p>
        <button onClick={() => setOpen(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-cherry text-pearl px-6 py-3 text-sm font-medium hover:bg-wine cursor-pointer">
          Sign up free
        </button>
      </div>
      <LoginDialog open={open} onOpenChange={setOpen} initialMode="signup" />
    </div>
  );
}
