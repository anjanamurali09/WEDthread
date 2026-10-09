import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { OPEN_COOKIE_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/cookie-consent";
import { CookieIcon } from "@/components/cookie-icon";

// Asks, once, whether the optional cookies (site analytics) are allowed. "Accept all" and "Accept only necessary" are equally easy; the
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
  const base = "rounded-full border border-[#243746] px-5 py-2.5 text-sm font-medium text-[#243746] transition-colors";
  const reject = `${base} hover:bg-[#FFF7D6]`;
  // Accept is filled in the brand yellow so it clearly reads as the button to press.
  const accept = `${base} bg-[#FFE08A] shadow-sm hover:bg-[#F2C94C]`;

  return (
    <div role="dialog" aria-label="Cookie choices" className="fixed inset-x-0 bottom-0 z-[95] border-t border-line bg-paper px-6 py-4 shadow-[0_-8px_30px_-12px_rgba(36,55,70,0.25)] md:px-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex items-center gap-3">
          <CookieIcon className="h-10 w-10 shrink-0" />
          <p className="text-sm text-[#243746]">
            We use cookies to keep you signed in and, if you allow, to improve the site.{" "}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-[#7FA8D6]">Privacy</Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button type="button" data-static onClick={() => choose(false)} className={reject}>Accept only necessary cookies</button>
          <button type="button" data-static onClick={() => choose(true)} className={accept}>Accept all cookies</button>
        </div>
      </div>
    </div>
  );
}
