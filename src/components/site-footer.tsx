import { Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { ArrowRight, Instagram } from "lucide-react";
import { Logo } from "@/components/logo";
import { openCookieSettings } from "@/lib/cookie-consent";

// Where "Contact" goes. Change this one line to switch the public contact address.
export const CONTACT_EMAIL = "owen@wedthread.co";

// Social profiles shown as icons in the bottom bar. To add TikTok later, add a line here with its icon and address.
const SOCIALS = [
  { name: "Instagram", href: "https://www.instagram.com/wed.thread/", Icon: Instagram },
];

const linkClass = "text-sm text-[#243746] hover:text-[#7FA8D6] transition-colors";

// The footer for every public page (homepage, marketplace, feature pages, privacy). Spans the same
// full width as the rest of the page, between the standard side margins.
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-paper">
      <div className="grid gap-10 px-6 py-14 md:px-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="text-base font-medium text-[#243746]">About</h4>
          <ul className="mt-5 space-y-3">
            <li><Link to="/auth" search={{ mode: "signup" } as any} data-static className={linkClass} onClick={() => track("partner_cta_click", { location: "footer" })}>Become a partner</Link></li>
            <li><Link to="/venue" data-static className={linkClass}>Browse venues</Link></li>
            <li><Link to="/v" data-static className={linkClass}>Browse vendors</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-base font-medium text-[#243746]">Advice and support</h4>
          <ul className="mt-5 space-y-3">
            <li><Link to="/" hash="faq" data-static className={linkClass}>FAQs</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} data-static className={linkClass}>Contact us</a></li>
            <li><Link to="/privacy" data-static className={linkClass}>Privacy</Link></li>
            <li><Link to="/auth" data-static className={linkClass}>Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-base font-medium text-[#243746]">Plan your wedding</h4>
          <ul className="mt-5 space-y-3">
            <li><Link to="/features/$slug" params={{ slug: "guest-list" }} data-static className={linkClass}>Guest list</Link></li>
            <li><Link to="/features/$slug" params={{ slug: "seating" }} data-static className={linkClass}>Seating</Link></li>
            <li><Link to="/features/$slug" params={{ slug: "rsvp-automation" }} data-static className={linkClass}>RSVPs</Link></li>
            <li><Link to="/features/$slug" params={{ slug: "registry" }} data-static className={linkClass}>Registry</Link></li>
            <li><Link to="/features/$slug" params={{ slug: "website" }} data-static className={linkClass}>Wedding website</Link></li>
          </ul>
        </div>

        <div>
          <Logo sizeClassName="text-3xl" />
          <p className="mt-3 font-serif text-lg text-[#243746]">For every wedding, anywhere.</p>
          <div className="mt-6 space-y-3 text-sm font-medium text-[#243746]">
            <Link to="/auth" search={{ mode: "signup" } as any} data-static className="flex items-center gap-1.5 hover:text-[#7FA8D6] transition-colors">Start planning <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/venue" data-static className="flex items-center gap-1.5 hover:text-[#7FA8D6] transition-colors">Find a venue <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/v" data-static className="flex items-center gap-1.5 hover:text-[#7FA8D6] transition-colors">Find a vendor <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line px-6 py-6 text-sm text-muted-foreground md:px-12">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/privacy" data-static className="hover:text-[#243746] transition-colors">Privacy</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} data-static className="hover:text-[#243746] transition-colors">Contact</a>
          <button type="button" data-static onClick={openCookieSettings} className="hover:text-[#243746] transition-colors">Cookie settings</button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`WedThread on ${name}`} data-static
                className="text-[#243746] hover:text-[#7FA8D6] transition-colors"><Icon className="h-5 w-5" /></a>
            ))}
          </div>
          <span>© {new Date().getFullYear()} WedThread. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
