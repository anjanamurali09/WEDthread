import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { OPEN_COOKIE_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/cookie-consent";

// Asks, once, whether analytics cookies are allowed. Accept and Reject are equally easy and look alike; the
// banner stays until one is chosen, and "Cookie settings" in the footer reopens it so the choice can change.
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (analytics: boolean) => { saveConsent(analytics); setOpen(false); };
  const button = "rounded-full border border-[#243746] px-6 py-2.5 text-sm font-medium text-[#243746] transition-colors hover:bg-[#FFE08A]";

  return (
    <div role="dialog" aria-label="Cookie choices" className="fixed inset-x-0 bottom-0 z-[95] border-t border-line bg-paper px-6 py-5 shadow-[0_-8px_30px_-12px_rgba(36,55,70,0.25)] md:px-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-3xl text-sm leading-relaxed text-[#243746]">
          <p className="font-medium">Cookies on WEDthread</p>
          <p className="mt-1 text-muted-foreground">
            We use essential cookies to keep you signed in. We would also like to use analytics cookies (Google Analytics) to see how the site is used and improve it.
            They stay off unless you accept. <Link to="/privacy" className="underline underline-offset-4 hover:text-[#7FA8D6]">Read our privacy page</Link>.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button type="button" data-static onClick={() => choose(false)} className={button}>Reject analytics</button>
          <button type="button" data-static onClick={() => choose(true)} className={button}>Accept analytics</button>
        </div>
      </div>
    </div>
  );
}
