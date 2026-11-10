import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { LoginDialog } from "@/components/login-dialog";

// The homepage's own nav header (Venues / Vendors / How it works / Blog, Sign in,
// Start planning), extracted so signed-out visitors keep it on every public
// page they can reach while browsing — not just the homepage — instead of
// landing on a bare logo-only header once they click into the marketplace
// or a listing.
export function PublicMarketingHeader({ sticky = true }: {
  // Listing detail pages (venue_.$businessId.tsx, v_.$businessId.tsx) have
  // their own sticky section sub-nav right below this — stacking two sticky
  // top-0 bars would overlap them. There, this renders as a plain
  // (non-sticky) header that scrolls away, and the page's own sub-nav takes
  // over as the sticky bar once you scroll past it.
  sticky?: boolean;
}) {
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);
  const navigate = useNavigate();

  return (
    <>
      <header className={`${sticky ? "sticky top-0" : ""} z-20 bg-white/85 backdrop-blur-md border-b border-line/50 px-6 md:px-12 py-6 flex items-center justify-between`}>
        <Link to="/" data-static className="group flex items-center gap-2">
          <Logo sizeClassName="text-3xl" className="transition-colors group-hover:text-[#7FA8D6]" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-lg text-[#243746]">
          <Link to="/venue" data-static className="story-link hover:text-[#7FA8D6] transition-colors">Venues</Link>
          <Link to="/v" data-static className="story-link hover:text-[#7FA8D6] transition-colors">Vendors</Link>
          <a href="/#how" data-static className="story-link hover:text-[#7FA8D6] transition-colors">How it works</a>
          <Link to="/blog" data-static className="story-link hover:text-[#7FA8D6] transition-colors">Blog</Link>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => setAuthOpen("signin")} className="text-sm text-[#243746] hover:text-[#7FA8D6] transition-colors hidden sm:inline">Sign in</button>
          <button onClick={() => navigate({ to: "/signup" })}
            className="rounded-full bg-[#243746] text-[#FFF7D6] px-5 py-2 text-sm transition-all hover:bg-[#FFE08A] hover:text-[#243746] hover:rounded-2xl">
            Start planning
          </button>
        </div>
      </header>
      <LoginDialog
        open={!!authOpen}
        onOpenChange={(v) => setAuthOpen(v ? (authOpen || "signin") : false)}
        initialMode={authOpen || "signin"}
      />
    </>
  );
}
