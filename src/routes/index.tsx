import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { Children, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, Globe2, MessageCircle, Star, CookingPot, BedDouble, Coffee, Luggage, Check, ChefHat, Wine, Flame, Droplet, MousePointer2, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { LoginDialog } from "@/components/login-dialog";
import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/logo";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { VenueCard, type VenueCardData } from "@/components/venue-card";
import { VendorServiceCard, type VendorServiceCardData } from "@/components/vendor-service-card";
import { useSavedListings } from "@/hooks/use-saved-listings";

import heroImg from "@/assets/homepage-hero.png";

import venueBaliImg from "@/assets/venue-bali-room.jpg";
import websiteCoupleImg from "@/assets/website-couple-priya-kevin.jpg";
import registryTowelsImg from "@/assets/registry-bath-towels-v2.jpg";
import registryNespressoImg from "@/assets/registry-nespresso-v2.jpg";
import registryDutchOvenImg from "@/assets/registry-dutch-oven-v2.jpg";
import registryCottonSheetsImg from "@/assets/registry-cotton-sheets.jpg";
import registryStandMixerImg from "@/assets/registry-stand-mixer.jpg";
import registryWineGlassesImg from "@/assets/registry-wine-glasses.jpg";
import registryWeekendBagImg from "@/assets/registry-weekend-bag.jpg";
import registryCastIronImg from "@/assets/registry-cast-iron.jpg";

import testimonialLauraJohnImg from "@/assets/testimonial-laura-john.jpg";
import testimonialZuriMarcusImg from "@/assets/testimonial-zuri-marcus.jpg";
import testimonialWeiJonathanImg from "@/assets/testimonial-wei-jonathan.jpg";
import testimonialFatimaDavidImg from "@/assets/testimonial-fatima-david.jpg";
import testimonialKavyaAlexImg from "@/assets/testimonial-kavya-alex.jpg";

export const Route = createFileRoute("/")({ component: Landing });

export function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // [data-reveal] starts at opacity:0 but still reserves its full layout
    // height, so anything that never gets marked visible shows up as a
    // blank gap the exact height of that section, with everything after it
    // reading as "too far down." threshold 0 + a generous positive
    // rootMargin makes the trigger fire as early and reliably as possible.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).dataset.visible = "true";
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px 200px 0px" });

    const observeNew = () => {
      root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-visible])").forEach((el) => io.observe(el));
    };
    observeNew();

    // The real bug this was chasing: sections that render asynchronously
    // (e.g. RealListingsPreview's venues/vendors, fetched from Supabase
    // after mount) insert their own [data-reveal] elements well after this
    // effect's one-time querySelectorAll already ran — without watching for
    // that, those elements are never observed at all and stay stuck at
    // opacity:0 forever. A MutationObserver catches anything added later,
    // for this component or any future one built the same way.
    const mo = new MutationObserver(observeNew);
    mo.observe(root, { childList: true, subtree: true });

    // Last-resort safety net in case a section still somehow never
    // triggers (e.g. it's positioned such that it never intersects).
    const fallback = setTimeout(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => { el.dataset.visible = "true"; });
    }, 1500);

    return () => { io.disconnect(); mo.disconnect(); clearTimeout(fallback); };
  }, []);
  return ref;
}

export const SHOWCASE_FEATURES = [
  {
    slug: "guest-list",
    eyebrow: "Guest List & RSVP",
    title: "Guest list",
    body: "One guest list, RSVPs collected over WhatsApp, no spreadsheets.",
    visual: "guests" as const,
    tint: "bg-[#A8C6E7]/50",
  },
  {
    slug: "venues",
    eyebrow: "Venues",
    title: "Venues",
    body: "Browse venues for every ceremony, wherever you're getting married.",
    visual: "venues" as const,
    tint: "bg-[#A8C6E7]/40",
  },
  {
    slug: "budgeting",
    eyebrow: "Wedding Budget",
    title: "Budgeting",
    body: "Track every dollar, see exactly where it's going, before it's due.",
    visual: "budget" as const,
    tint: "bg-[#A8C6E7]/50",
  },
  {
    slug: "website",
    eyebrow: "Wedding Websites",
    title: "Website",
    body: "A free, beautiful site your guests will actually visit.",
    visual: "website" as const,
    tint: "bg-[#A8C6E7]/40",
  },
  {
    slug: "vendor-marketplace",
    eyebrow: "Vendor Marketplace",
    title: "Vendors",
    body: "Browse trusted vendors for every tradition and budget.",
    visual: "vendors" as const,
    tint: "bg-[#A8C6E7]/50",
  },
  {
    slug: "seating",
    eyebrow: "Seating",
    title: "Seating",
    body: "Drag-and-drop seating that makes sense, table by table.",
    visual: "seating" as const,
    tint: "bg-[#A8C6E7]/40",
  },
  {
    slug: "rsvp-automation",
    eyebrow: "WhatsApp RSVP Automation",
    title: "Automated messages",
    body: "Save-the-dates and RSVP links, sent straight to WhatsApp and email.",
    visual: "whatsapp" as const,
    tint: "bg-[#A8C6E7]/50",
  },
  {
    slug: "registry",
    eyebrow: "Registry",
    title: "Registry",
    body: "Paste any product link, we'll pull the photo, name, and price.",
    visual: "registry" as const,
    tint: "bg-[#A8C6E7]/40",
  },
];

const MID_CTA_HEADLINES = ["Every tradition, one beautiful plan.", "Every family, every custom, one plan."];

const CULTURE_ITEMS = [
  "Planner", "Guest list", "Venues & Vendors", "Marketplace", "Budgeting tool",
  "Messaging automation", "Seating chart", "Registry", "Website",
];

const TESTIMONIALS = [
  { quote: "We had four ceremonies across two continents and somehow WedThread made it feel like one wedding, not four separate headaches. Our families finally knew what was happening, when.", name: "Laura & John", loc: "Lake Como", photo: testimonialLauraJohnImg },
  { quote: "Sending RSVPs over WhatsApp instead of a website nobody would click sounds small, but it's the reason we actually got responses back from grandparents.", name: "Zuri & Marcus", loc: "London", photo: testimonialZuriMarcusImg },
  { quote: "I built our seating chart on a plane. Drag, drop, done, allergy warnings and all. I still don't understand how it used to take people weeks.", name: "Wei & Jonathan", loc: "San Francisco", photo: testimonialWeiJonathanImg },
  { quote: "Two cultures, two guest lists, one registry link we could actually share. WedThread is the only tool that didn't ask us to pick a side.", name: "Fatima & David", loc: "Dubai", photo: testimonialFatimaDavidImg },
  { quote: "Between the Mehendi and the reception we had six events to track. WedThread is the only reason nothing slipped through the cracks.", name: "Alex & Kaavya", loc: "Austin → Udaipur", photo: testimonialKavyaAlexImg },
];

const FAQS = [
  { q: "Can I use WedThread for a single-day wedding?", a: "Of course, WedThread scales down as easily as it scales up. Whether you're planning one ceremony or six, you only add the events you're actually having." },
  { q: "Is WedThread free to use?", a: "Yes, core planning tools, guest lists, RSVPs, seating, and your wedding website are free. Optional extras like premium vendor placements are available if you want them." },
  { q: "Do my guests need to download an app?", a: "No. Guests RSVP through a simple link sent over WhatsApp or text, no account, no app, no password to forget." },
  { q: "Can I track multiple ceremonies with different guest lists?", a: "Yes, add as many events as your celebration needs, tag each guest to the ones they're invited to, and WedThread keeps every list, RSVP, and seating chart organized under one wedding." },
  { q: "Does WedThread work for destination weddings?", a: "It's built for them. Track travel details, filter vendors by the city you're actually getting married in, and keep guests across time zones updated automatically." },
  { q: "How does WhatsApp RSVP work?", a: "We send your guests a personalized RSVP link over WhatsApp. They tap, answer your questions, and their response updates your guest list instantly, no spreadsheets, no chasing." },
];

const REGISTRY_ITEMS = [
  { n: "Le Creuset Dutch Oven", p: "$380", icon: CookingPot, swatch: "bg-[#A8C6E7]", photo: registryDutchOvenImg },
  { n: "Egyptian Cotton Sheets", p: "$140", icon: BedDouble, swatch: "bg-[#A8C6E7]", photo: registryCottonSheetsImg },
  { n: "Nespresso Machine", p: "$210", icon: Coffee, swatch: "bg-[#A8C6E7]", photo: registryNespressoImg },
  { n: "Weekend Bags", p: "$95", icon: Luggage, swatch: "bg-[#A8C6E7]", photo: registryWeekendBagImg },
  { n: "Stand Mixer", p: "$320", icon: ChefHat, swatch: "bg-[#A8C6E7]", photo: registryStandMixerImg },
  { n: "Wine Glasses", p: "$120", icon: Wine, swatch: "bg-[#A8C6E7]", photo: registryWineGlassesImg },
  { n: "Cast Iron Skillet", p: "$65", icon: Flame, swatch: "bg-[#A8C6E7]", photo: registryCastIronImg },
  { n: "Bath Towel Set", p: "$95", icon: Droplet, swatch: "bg-[#A8C6E7]", photo: registryTowelsImg },
];

// Fixed 3-per-column grid (see the vendors block below) — each of the 6
// positions cross-fades between two categories over a shared 10s loop
// Driven by VendorPills below: each of the 6 stays in its fixed grid slot
// (uniform positions), popping in one at a time, holding together, then all
// fading out at once before the next set pops in the same way.
const VENDOR_SLOTS: [string, string][] = [
  ["Florist", "Live Painting"],
  ["Photographer", "Videographer"],
  ["DJ", "Custom Favours"],
  ["Caterer", "Baker"],
  ["Decorator", "Mehendi Artist"],
  ["Makeup Artist", "Officiant"],
];

// A slight, alternating slant per slot so the grid reads as hand-placed
// rather than mechanical.
const VENDOR_SLOT_ROTATIONS = [-3, 2, -4, 3, -2, 4];

// Timed pop-in sequence: all 6 hidden, then slot 1 pops in, then 2, 3...
// through 6 (staggered), a brief hold with all 6 visible, then all 6 fade
// out together, then the next set (round) runs the same sequence.
function VendorPills() {
  const [round, setRound] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const STAGGER = 350;
    const HOLD = 1600;
    const FADE = 350;
    const GAP = 350;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    function runRound() {
      if (cancelled) return;
      setVisibleCount(0);
      for (let i = 1; i <= 6; i++) {
        timers.push(setTimeout(() => !cancelled && setVisibleCount(i), i * STAGGER));
      }
      const fadeAt = 6 * STAGGER + HOLD;
      timers.push(setTimeout(() => !cancelled && setVisibleCount(0), fadeAt));
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setRound((r) => (r === 0 ? 1 : 0));
        runRound();
      }, fadeAt + FADE + GAP));
    }
    runRound();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="w-[calc(100%+2rem)] -mx-4 h-[190px] grid grid-cols-2 gap-x-5 gap-y-7 content-center px-2">
      {VENDOR_SLOTS.map(([a, b], slotIdx) => {
        const visible = slotIdx < visibleCount;
        const rotation = VENDOR_SLOT_ROTATIONS[slotIdx % VENDOR_SLOT_ROTATIONS.length];
        return (
          <div key={slotIdx} className="min-w-0 flex justify-center">
            <span
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-2 py-1 text-[10.5px] shadow-sm whitespace-nowrap max-w-full truncate transition-all duration-300 ease-out"
              style={{ opacity: visible ? 1 : 0, transform: `rotate(${rotation}deg) scale(${visible ? 1 : 0.7})` }}>
              {round === 0 ? a : b}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Mini table, styled like the real seating canvas: a filled mat-colored shape (round or
// rect, same border-radius rule as SeatTable in seating.tsx) with small initials chips
// orbiting it, rather than an outline ring. `drag` plays the table-drag keyframe used by
// the cursor-drag illustration below.
function SeatedTable({ cx, cy, shape = "round", radius = 20, width, height, label, fill, seatColor, seatInitials, drag = false }: {
  cx: number; cy: number; shape?: "round" | "rect"; radius?: number; width?: number; height?: number;
  label: string; fill: string; seatColor: string; seatInitials: string[]; drag?: boolean;
}) {
  const w = shape === "rect" ? (width ?? radius * 2.6) : radius * 2;
  const h = shape === "rect" ? (height ?? radius * 1.6) : radius * 2;
  const orbitX = w / 2 + 12;
  const orbitY = h / 2 + 12;
  return (
    <div className="absolute inset-0" style={drag ? { animation: "table-drag 9s ease-in-out infinite", zIndex: 10 } : undefined}>
      <div className={cn("absolute grid place-items-center text-[8px] font-medium text-[#243746] shadow-sm", fill)}
        style={{ left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: shape === "round" ? "50%" : 10 }}>
        {label}
      </div>
      {seatInitials.map((init, i) => {
        const angle = (i / seatInitials.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(angle) * orbitX;
        const sy = cy + Math.sin(angle) * orbitY;
        return (
          <div key={init} className={cn("absolute h-[20px] w-[20px] rounded-full bg-paper border shadow-sm grid place-items-center text-[6px] font-semibold text-[#7FA8D6]", seatColor)}
            style={{ left: sx - 10, top: sy - 10 }}>
            {init}
          </div>
        );
      })}
    </div>
  );
}

export function FeatureVisual({ kind }: { kind: (typeof SHOWCASE_FEATURES)[number]["visual"] }) {
  return (
    <div className="relative w-full h-full grid place-items-center p-4">
      {kind === "guests" && (
        <div className="relative w-full max-w-[300px] h-[190px]">
          <div className="absolute left-0 top-6 w-[216px] paper-card bg-paper border border-line p-4 shadow-lg -rotate-1">
            <p className="text-[10px] uppercase tracking-widest text-[#7FA8D6]">Guest list</p>
            <div className="mt-3 space-y-2">
              {[
                { n: "Priya Rao", s: "Attending", delay: 1.6 },
                { n: "Sam Lee", s: "Pending", delay: 0 },
                { n: "Jordan Kim", s: "Attending", delay: 3.2 },
                { n: "Aisha Khan", s: "Attending", tag: "Peanut allergy", delay: 4.8, tagDelay: 6.4 },
              ].map(({ n, s, tag, delay, tagDelay }) => (
                <div key={n} className="flex items-center gap-1.5 text-xs">
                  <span className="flex-1 min-w-0 truncate">{n}</span>
                  {tag && (
                    <span className="shrink-0 text-[8px] leading-none" title={tag}
                      style={{ animation: `pop-once 8s cubic-bezier(.34,1.56,.64,1) ${tagDelay}s infinite` }}>🥜</span>
                  )}
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] bg-[#A8C6E7] text-[#FFF7D6]"
                    style={{ animation: `pop-once 8s cubic-bezier(.34,1.56,.64,1) ${delay}s infinite` }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-0 paper-card bg-paper border border-line px-3 py-2.5 shadow-lg rotate-3 flex items-center gap-2 z-10">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#A8C6E7] text-[#FFF7D6]"><Check className="h-3 w-3" /></span>
            <div>
              <p className="text-[8px] font-medium leading-tight whitespace-nowrap">42 confirmed</p>
              <p className="text-[8px] text-muted-foreground leading-tight whitespace-nowrap">of 58 invited</p>
            </div>
          </div>
        </div>
      )}
      {kind === "seating" && (
        <div className="relative w-full max-w-[270px] h-[190px]">
          {/* Dance floor as the centered anchor, one table to its left (the one the
              cursor drags down and back up), two tables to its right — same
              table-drag/cursor-drag keyframes as before restoring this, just retimed to a
              straight down-then-up motion instead of a diagonal one. */}
          <div className="absolute grid place-items-center rounded-xl border-2 border-[#7FA8D6]/40 bg-paper text-xs text-[#7FA8D6] text-center leading-tight"
            style={{ left: 135 - 50, top: 95 - 27, width: 100, height: 54 }}>
            Dance<br />Floor
          </div>

          {/* T1 and T2 are the same round table (radius + fill) — only position differs.
              T1 sits further from the dance floor than its old cx=44: with 4 seat chips,
              one lands due-east (angle 0) of the table, and at the old position that
              chip's edge landed exactly on the dance floor's edge. T3 keeps its own
              rect styling. */}
          <SeatedTable cx={32} cy={95} radius={18} label="T1" fill="bg-[#FFF2B2]" seatColor="border-[#7FA8D6]/50"
            seatInitials={["JR", "EL", "OM", "NR"]} drag />
          <SeatedTable cx={226} cy={46} radius={18} label="T2" fill="bg-[#FFF2B2]" seatColor="border-[#7FA8D6]/50"
            seatInitials={["AM", "SL", "JK"]} />
          <SeatedTable cx={208} cy={148} shape="rect" width={64} height={38} label="T3" fill="bg-[#A8C6E7]" seatColor="border-[#7FA8D6]/50"
            seatInitials={["FD", "KA", "NW", "PQ"]} />

          <MousePointer2 className="absolute h-4 w-4 text-[#243746] drop-shadow-md z-20" strokeWidth={2.5}
            style={{ left: 48, top: 88, animation: "cursor-drag 9s ease-in-out infinite" }} />
        </div>
      )}
      {kind === "registry" && (
        <div className="relative w-full max-w-[280px] h-[190px] overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="flex items-center gap-3 pl-4" style={{ width: "max-content", animation: "marquee-scroll 22s linear infinite" }}>
              {[...REGISTRY_ITEMS, ...REGISTRY_ITEMS].map(({ n, p, icon: Icon, swatch, photo }, i) => (
                <div key={i} className="w-[85px] shrink-0 paper-card bg-paper border border-line p-3 shadow-md flex flex-col items-center text-center">
                  <div className={cn("h-12 w-full rounded-lg grid place-items-center overflow-hidden", swatch)}>
                    {photo ? <img src={photo} alt={n} className="w-full h-full object-cover" /> : <Icon className="h-5 w-5 text-[#FFF7D6]" />}
                  </div>
                  <p className="mt-2 text-xs leading-tight">{n}</p>
                  <p className="text-xs text-[#7FA8D6] font-medium">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {kind === "whatsapp" && (
        <div className="relative w-full max-w-[280px] h-[190px]">
          <div className="absolute left-0 top-3 w-[170px] rounded-[1.5rem] bg-paper border border-line shadow-xl p-3 space-y-1.5 -rotate-1">
            <div className="relative ml-auto max-w-[85%]">
              <div className="rounded-xl rounded-tr-sm bg-[#FFE08A] text-[#243746] text-[10px] leading-snug px-2.5 py-1.5"
                style={{ animation: "wa-bubble-1 9s ease-in-out infinite" }}>You're invited! Tap to RSVP →</div>
              <span className="absolute -bottom-1.5 -left-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#FFE08A] text-[#243746]"
                style={{ animation: "wa-check 9s ease-in-out infinite" }}><Check className="h-2 w-2" /></span>
            </div>
            <div className="mr-auto max-w-[85%] rounded-xl rounded-tl-sm bg-[#A8C6E7] text-white text-[10px] leading-snug px-2.5 py-1.5"
              style={{ animation: "wa-bubble-2 9s ease-in-out infinite" }}>Joyfully accept ✓</div>
          </div>
          <div className="absolute right-2 top-[130px] max-w-[115px] rounded-xl rounded-tl-sm bg-[#E5E5E5] text-black text-[10px] leading-snug px-2.5 py-1.5 shadow-lg rotate-3"
            style={{ animation: "wa-bubble-3 9s ease-in-out infinite" }}>Regretfully decline</div>
        </div>
      )}
      {kind === "venues" && (
        <div className="relative w-full max-w-[270px] h-[190px]">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 w-[210px] paper-card bg-paper border border-line shadow-lg rotate-1 overflow-hidden">
            <div className="h-20 overflow-hidden">
              <img src={venueBaliImg} alt="Villa Kirana, a Bali wedding venue" className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium">Villa Kirana</p>
              <div className="mt-1 flex items-center gap-0.5 text-[#7FA8D6]">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </div>
            </div>
          </div>
          <div className="absolute right-1 bottom-2 paper-card bg-paper border border-line px-3 py-2.5 shadow-lg -rotate-3 flex items-center gap-2"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 2s infinite" }}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#A8C6E7] text-[#FFF7D6]"><Globe2 className="h-3 w-3" /></span>
            <div>
              <p className="text-xs font-medium leading-tight whitespace-nowrap">12 venues nearby</p>
              <p className="text-[8px] text-muted-foreground leading-tight whitespace-nowrap">Bali, Indonesia</p>
            </div>
          </div>
        </div>
      )}
      {kind === "vendors" && <VendorPills />}
      {kind === "budget" && (
        <div className="relative w-full max-w-[270px] h-[190px]">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 w-[220px] paper-card bg-paper border border-line p-4 shadow-lg -rotate-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[#7FA8D6]">
              <span>Total budget</span><span>$45,000</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#A8C6E7] overflow-hidden">
              <div className="h-full bg-[#FFE08A] rounded-full" style={{ width: "62%" }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">$27,900 spent so far</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Paid by</span>
              <span className="flex -space-x-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#A8C6E7] text-[7px] font-semibold text-white ring-1 ring-paper">P</span>
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#FFE08A] text-[7px] font-semibold text-[#243746] ring-1 ring-paper">R</span>
              </span>
            </div>
          </div>
          <div className="absolute right-1 bottom-2 paper-card bg-paper border border-line px-3 py-2.5 shadow-lg rotate-3 flex items-center gap-2"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 2s infinite" }}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#A8C6E7] text-[#FFF7D6]"><Bell className="h-3 w-3" /></span>
            <div>
              <p className="text-xs font-medium leading-tight whitespace-nowrap">Payment reminder</p>
              <p className="text-[8px] text-muted-foreground leading-tight whitespace-nowrap">Caterer due in 3 days</p>
            </div>
          </div>
        </div>
      )}
      {kind === "website" && (
        <div className="relative w-full max-w-[260px] h-[190px] grid place-items-center">
          <div className="w-[230px] overflow-hidden shadow-xl bg-paper border border-line -rotate-1"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 0s infinite" }}>
            <div className="h-7 bg-paper border-b border-line/60 flex items-center px-3">
              <span className="text-xs text-muted-foreground truncate">priyaandkevin.com</span>
            </div>
            <div className="relative h-[120px]">
              <img src={websiteCoupleImg} alt="Priya and Kevin" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#243746]/70 via-[#243746]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 pb-2.5 text-center">
                <p className="font-serif text-2xl italic text-white leading-none">Priya & Kevin</p>
                <p className="mt-1.5 text-xs uppercase tracking-widest text-white/90">Nov 15, 2026</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: (typeof SHOWCASE_FEATURES)[number]; index: number }) {
  return (
    <Link to="/features/$slug" params={{ slug: feature.slug }} data-reveal style={{ transitionDelay: `${(index % 4) * 60}ms` }}
      className="group border-b border-r border-line/60 p-6 sm:p-8 flex flex-col h-full">
      <h3 className="font-serif text-2xl leading-tight inline-flex items-center gap-1.5">
        {feature.title}
        <ArrowRight className="h-4 w-4 text-[#7FA8D6] transition-transform group-hover:translate-x-1" />
      </h3>
      <p className="mt-2 text-sm text-[#243746] leading-relaxed">{feature.body}</p>
      <div className="mt-auto pt-6">
        <div className="relative overflow-hidden h-56 rounded-2xl">
          <FeatureVisual kind={feature.visual} />
        </div>
      </div>
    </Link>
  );
}

// One line of cards that scrolls sideways, with arrows. Used for venues, vendors and reviews so every
// section spans the same full width as the call-to-action bars. Each child is one card; `cardClass`
// sets its width (about four across on a wide screen, fewer on smaller ones).
function ScrollRow({ title, cardClass, children }: { title?: string; cardClass: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const t = setTimeout(update, 600); // cards and photos finish loading after first paint
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); clearTimeout(t); };
  }, [children]);

  const scrollBy = (dir: 1 | -1) => { const el = ref.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" }); };
  const arrow = "grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-[#243746] transition-colors hover:bg-[#FFE08A] disabled:opacity-30 disabled:hover:bg-paper";

  return (
    // The row breaks out of the page margins so cards run edge to edge; its own padding lines the first
    // card up with the rest of the page, and the arrows and heading keep the page margins.
    <div data-reveal className="-mx-6 md:-mx-12">
      <div className="mb-3 flex items-center justify-between gap-4 px-6 md:px-12">
        <p className="text-sm uppercase tracking-widest text-[#7FA8D6]">{title}</p>
        {!(edge.start && edge.end) && (
          <div className="flex gap-2">
            <button type="button" aria-label="Scroll left" disabled={edge.start} onClick={() => scrollBy(-1)} data-static className={arrow}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" aria-label="Scroll right" disabled={edge.end} onClick={() => scrollBy(1)} data-static className={arrow}><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 md:px-12 scroll-px-6 md:scroll-px-12 pb-2">
        {Children.toArray(children).map((c, i) => <div key={i} className={cn("shrink-0 snap-start [&>*]:h-full", cardClass)}>{c}</div>)}
      </div>
    </div>
  );
}

// The last card in the vendors row: invites businesses to list themselves.
function BecomePartnerCard() {
  return (
    <Link to="/auth" search={{ mode: "signup" } as any} data-static onClick={() => track("partner_cta_click", { location: "homepage_vendors_row" })}
      className="group flex min-h-[320px] flex-col justify-between rounded-2xl border border-[#FFE08A] bg-[#FFF7D6] p-6 text-[#243746] transition-colors hover:bg-[#FFE08A]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#4A7CAD]">For venues and vendors</p>
        <h3 className="mt-3 font-serif text-3xl leading-tight">Become a partner</h3>
        <p className="mt-3 text-sm leading-relaxed">List your venue or services and meet couples planning weddings around the world.</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
        List your business <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

// Card widths: six across on a wide screen, fewer on smaller ones. Percentages are of the row's content
// width (page width minus the side margins), less the 16px gaps between cards.
const SIX_ACROSS = "w-[78%] sm:w-[calc((100%-16px)/2)] md:w-[calc((100%-32px)/3)] lg:w-[calc((100%-48px)/4)] xl:w-[calc((100%-80px)/6)]";

const CTA_TONE_STYLES: Record<"cherry" | "sage" | "pearl" | "ink", { wrap: string; eyebrow: string; button: string }> = {
  cherry: { wrap: "bg-[#FFE08A] text-[#243746]", eyebrow: "text-[#243746]/70", button: "bg-[#243746] text-[#FFF7D6] hover:bg-[#7FA8D6] hover:text-[#243746]" },
  sage: { wrap: "bg-[#7FA8D6] text-[#FFF7D6]", eyebrow: "text-[#FFF2B2]", button: "bg-[#FFF7D6] text-[#243746] hover:bg-[#FFE08A] hover:text-[#243746]" },
  ink: { wrap: "bg-[#243746] text-[#FFF7D6]", eyebrow: "text-[#FFE08A]", button: "bg-[#FFE08A] text-[#243746] hover:bg-[#FFF7D6] hover:text-[#243746]" },
  pearl: { wrap: "bg-paper text-[#243746] border border-[#FFE08A]", eyebrow: "text-[#7FA8D6]", button: "bg-[#243746] text-[#FFF7D6] hover:bg-[#FFE08A] hover:text-[#243746]" },
};

function CompactCta({ headline, onClick, tone = "cherry", cta = "Start planning for free" }: { headline: string; onClick: () => void; tone?: "cherry" | "sage" | "pearl" | "ink"; cta?: string }) {
  const s = CTA_TONE_STYLES[tone];
  return (
    <div className={cn("relative rounded-[2.5rem] py-12 px-6 md:px-12 text-center overflow-hidden", s.wrap)} data-reveal>
      <p className={cn("relative text-sm uppercase tracking-[0.3em]", s.eyebrow)}>FOR EVERY WEDDING, ANYWHERE</p>
      <h3 className="relative mt-3 font-serif text-3xl md:text-4xl max-w-xl mx-auto leading-tight">{headline}</h3>
      <button onClick={onClick}
        className={cn("relative mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all hover:rounded-2xl hover:gap-3", s.button)}>
        {cta} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// A real, live teaser of the marketplace — three actual venues and three
// actual vendor services, each linking straight to its real public page.
// Anyone can click in; useAnonViewGate (wired into the detail pages
// themselves, not here) is what actually caps a signed-out visitor at 3
// listing views before asking them to sign up, so this section doesn't need
// its own click-counting logic. Reuses the exact same VenueCard/
// VendorServiceCard as the marketplace pages (photo carousel, heart/save)
// rather than a simplified duplicate, so the teaser behaves identically to
// the real thing.
function RealListingsPreview() {
  const [venues, setVenues] = useState<VenueCardData[]>([]);
  const [services, setServices] = useState<VendorServiceCardData[]>([]);
  const { signedIn, saved, toggle } = useSavedListings();
  const [authOpen, setAuthOpen] = useState(false);

  const handleToggleVenueSaved = (businessId: string) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId });
  };
  const handleToggleServiceSaved = (service: VendorServiceCardData) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId: service.business_id, listingId: service.id });
  };

  useEffect(() => {
    (async () => {
      const { data: venueBiz } = await supabase
        .from("businesses").select("id,legal_business_name,verification_status,city,country")
        .eq("business_type", "venue").eq("verification_status", "verified")
        .order("created_at", { ascending: false }).limit(12);
      if (venueBiz && venueBiz.length > 0) {
        const ids = venueBiz.map((b) => b.id);
        const [{ data: details }, { data: media }] = await Promise.all([
          supabase.from("venue_details").select("business_id,capacity_min,capacity_max,type_of_space,price_range_min").in("business_id", ids),
          supabase.from("business_media").select("business_id,url,sort_order").in("business_id", ids).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
        ]);
        const detailsByBiz = new Map((details ?? []).map((d) => [d.business_id, d]));
        const photosByBiz = new Map<string, string[]>();
        for (const m of media ?? []) {
          const list = photosByBiz.get(m.business_id) ?? [];
          list.push(m.url);
          photosByBiz.set(m.business_id, list);
        }
        setVenues(venueBiz.map((b) => {
          const d = detailsByBiz.get(b.id);
          return {
            id: b.id, legal_business_name: b.legal_business_name, verified: b.verification_status === "verified",
            city: b.city, country: b.country,
            capacity_min: d?.capacity_min ?? null, capacity_max: d?.capacity_max ?? null,
            type_of_space: d?.type_of_space ?? [], price_range_min: d?.price_range_min ?? null,
            photos: photosByBiz.get(b.id) ?? [],
          };
        }));
      }

      const { data: svcRows } = await supabase
        .from("vendor_services").select("id,business_id,category_ids")
        .eq("status", "active").order("created_at", { ascending: false }).limit(24);
      if (svcRows && svcRows.length > 0) {
        const bizIds = Array.from(new Set(svcRows.map((s) => s.business_id)));
        const [{ data: biz }, { data: cats }] = await Promise.all([
          supabase.from("businesses").select("id,legal_business_name,city,country").in("id", bizIds).eq("verification_status", "verified"),
          supabase.from("vendor_categories").select("id,name"),
        ]);
        const bizById = new Map((biz ?? []).map((b) => [b.id, b]));
        const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
        const eligible = svcRows.filter((s) => bizById.has(s.business_id)).slice(0, 12);
        const svcIds = eligible.map((s) => s.id);
        const [{ data: media }, { data: bizMedia }] = await Promise.all([
          svcIds.length > 0
            ? supabase.from("business_media").select("listing_id,url,sort_order").in("listing_id", svcIds).eq("media_type", "photo").order("sort_order")
            : Promise.resolve({ data: [] as { listing_id: string | null; url: string; sort_order: number }[] }),
          // Falls back to the business's general photos when a service has
          // none of its own (see v.tsx for why this can happen).
          supabase.from("business_media").select("business_id,url,sort_order").in("business_id", bizIds).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
        ]);
        const photosByService = new Map<string, string[]>();
        for (const m of media ?? []) {
          if (!m.listing_id) continue;
          const list = photosByService.get(m.listing_id) ?? [];
          list.push(m.url);
          photosByService.set(m.listing_id, list);
        }
        const photosByBusiness = new Map<string, string[]>();
        for (const m of bizMedia ?? []) {
          const list = photosByBusiness.get(m.business_id) ?? [];
          list.push(m.url);
          photosByBusiness.set(m.business_id, list);
        }
        setServices(eligible.map((s) => {
          const b = bizById.get(s.business_id)!;
          return {
            id: s.id, business_id: s.business_id,
            categoryNames: (s.category_ids ?? []).map((id: string) => catName.get(id)).filter((n): n is string => !!n),
            city: b.city ?? null, country: b.country ?? null,
            photos: photosByService.get(s.id) ?? photosByBusiness.get(s.business_id) ?? [],
            businessName: b.legal_business_name, verified: true,
          };
        }));
      }
    })();
  }, []);

  if (venues.length === 0 && services.length === 0) return null;

  return (
    <section className="relative z-10 py-10 px-6 md:px-12">
      <div className="text-center max-w-2xl mx-auto" data-reveal>
        <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">Take a look around</p>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl leading-[0.95]">Real venues, real vendors, right now.</h2>
      </div>

      {venues.length > 0 && (
        <div className="mt-10">
          <ScrollRow title="Venues" cardClass={SIX_ACROSS}>
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} saved={saved.has(v.id)} onToggleSaved={handleToggleVenueSaved} compact />
            ))}
          </ScrollRow>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-10">
          <ScrollRow title="Vendors" cardClass={SIX_ACROSS}>
            {services.map((s) => (
              <VendorServiceCard key={s.id} service={s} saved={saved.has(s.id)} onToggleSaved={handleToggleServiceSaved} compact />
            ))}
            <BecomePartnerCard key="become-a-partner" />
          </ScrollRow>
        </div>
      )}

      <LoginDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
    </section>
  );
}

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div aria-hidden={!visible}
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center bg-white transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}>
      <div className="text-center">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7FA8D6] text-[#FFF7D6]"><Sparkles className="h-4 w-4" /></span>
          <Logo sizeClassName="text-3xl" />
        </span>
        <div className="mt-7 mx-auto h-7 w-7 rounded-full border-2 border-[#7FA8D6]/25 border-t-[#7FA8D6] animate-spin" />
        <p className="mt-4 text-sm uppercase tracking-[0.25em] text-muted-foreground">Loading your wedding…</p>
      </div>
    </div>
  );
}

function Landing() {
  const rootRef = useReveal();
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);
  const navigate = useNavigate();
  // "Start planning" goes to the full sign-up page; only "Sign in" uses the small popup.
  const goSignup = () => navigate({ to: "/auth", search: { mode: "signup" } as any });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fallback = setTimeout(() => { if (!cancelled) setReady(true); }, 1200);
    const fontsReady: Promise<unknown> = (document as any).fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (cancelled) return;
      clearTimeout(fallback);
      requestAnimationFrame(() => setReady(true));
    });
    return () => { cancelled = true; clearTimeout(fallback); };
  }, []);

  return (
    <div ref={rootRef as any} className="min-h-screen bg-white text-[#243746] overflow-hidden">
      <LoadingScreen visible={!ready} />

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-line/50 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" data-static className="flex items-center gap-2">
          <Logo sizeClassName="text-3xl" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-lg text-[#243746]">
          <Link to="/venue" data-static className="story-link hover:text-[#7FA8D6] transition-colors">Venues</Link>
          <Link to="/v" data-static className="story-link hover:text-[#7FA8D6] transition-colors">Vendors</Link>
          <a href="#how" data-static className="story-link hover:text-[#7FA8D6] transition-colors">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => setAuthOpen("signin")} className="text-sm text-[#243746] hover:text-[#7FA8D6] transition-colors hidden sm:inline">Sign in</button>
          <button onClick={() => goSignup()}
            className="rounded-full bg-[#243746] text-[#FFF7D6] px-5 py-2 text-sm transition-all hover:bg-[#FFE08A] hover:text-[#243746] hover:rounded-2xl">
            Start planning
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-8 md:pt-16 pb-10 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6" data-reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">
            For every wedding, anywhere
          </p>
          <h1 className="mt-6 font-serif text-6xl md:text-8xl leading-[0.9] tracking-tight">
            One place for every <span className="italic text-[#7FA8D6]">event</span> your wedding needs.
          </h1>
          <p className="mt-6 text-lg text-[#243746] max-w-xl leading-relaxed">
            Big, small, traditional, or entirely your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => goSignup()}
              className="inline-flex items-center gap-2 rounded-full bg-[#FFE08A] text-[#243746] px-6 py-3 text-sm font-medium transition-all hover:bg-[#243746] hover:text-[#FFF7D6] hover:rounded-2xl hover:gap-3">
              Start your plan <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/venue"
              className="inline-flex items-center gap-2 rounded-full border border-[#7FA8D6] text-[#7FA8D6] px-6 py-3 text-sm transition-all hover:bg-[#7FA8D6] hover:text-[#FFF7D6] hover:rounded-2xl">
              Browse destinations
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 relative" data-reveal>
          <div className="relative overflow-hidden shadow-2xl blob-2 group [mask-image:linear-gradient(to_top,black_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_78%,transparent_100%)]">
            <img src={heroImg} alt="Bride and groom embraced beneath ivy-covered arches overlooking a lake at sunset"
              className="w-full h-[420px] object-cover object-bottom transition-transform duration-[1200ms] group-hover:scale-105"
              width={1200} height={1500} loading="eager" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#243746]/30 via-transparent to-transparent" />
          </div>
          <div className="hidden md:block absolute -bottom-6 -left-6 paper-card p-5 rotate-[-2deg] max-w-[260px] bg-paper transition-transform hover:rotate-0 hover:-translate-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[#7FA8D6]">The Rao–Beckett Wedding</p>
            <p className="font-serif text-xl mt-1">Lake Como · Nov 2026</p>
            <div className="mt-3 space-y-1.5 text-sm text-[#243746]">
              <p>Nov 12 · Pool Party</p>
              <p>Nov 13 · Ceremony</p>
              <p>Nov 14 · Reception</p>
            </div>
            <p className="mt-3 text-sm text-[#7FA8D6]">Villa Balbiano, 100 guests</p>
          </div>
          <div className="hidden md:flex absolute -top-4 -right-4 paper-card p-4 rotate-[2deg] bg-paper items-center gap-3 max-w-[240px] transition-transform hover:rotate-0 hover:-translate-y-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#A8C6E7]/40 text-[#243746]"><MessageCircle className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-medium">RSVP reminder sent</p>
              <p className="text-sm text-muted-foreground">via WhatsApp · 42 guests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Culture strip */}
      <section id="how" className="relative z-10 bg-white py-10 px-6 md:px-12" data-reveal>
        <div className="flex flex-nowrap items-center justify-center overflow-x-auto">
          {CULTURE_ITEMS.map((t, i) => (
            <span key={t} className="flex shrink-0 items-center whitespace-nowrap">
              <span className="px-1.5 text-[12.5px] font-medium text-[#243746]">{t}</span>
              {i < CULTURE_ITEMS.length - 1 && <span className="text-muted-foreground">•</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Feature showcase */}
      <section className="relative z-10 py-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto px-6 md:px-12" data-reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">Everything, in one plan</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl leading-[0.95]">Built for the way you actually celebrate.</h2>
        </div>

        <div className="px-6 md:px-12">
          <div className="overflow-hidden rounded-3xl border border-line/60">
            <div className="-mb-px -mr-px grid sm:grid-cols-2 lg:grid-cols-4">
              {SHOWCASE_FEATURES.map((f, i) => <FeatureCard key={f.eyebrow} feature={f} index={i} />)}
            </div>
          </div>
        </div>

        <div className="px-6 md:px-12 pt-4">
          <CompactCta headline={MID_CTA_HEADLINES[0]} tone="sage" onClick={() => goSignup()} />
        </div>
      </section>

      <RealListingsPreview />

      {/* Testimonials */}
      <section className="relative z-10 bg-[#7FA8D6]/40 border-y border-line py-24 px-6 md:px-12">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">What couples say</p>
          <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">Real weddings, real relief.</h2>
        </div>
        <div className="mt-14">
          <ScrollRow cardClass="w-[85%] sm:w-[380px]">
            {TESTIMONIALS.map((t) => (
              <div key={t.name}
                className="rounded-3xl bg-paper p-6 shadow-sm border border-line/60 flex flex-col h-full">
                <div className="flex gap-0.5 text-[#7FA8D6]">
                  {Array.from({ length: 5 }).map((_, si) => <Star key={si} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="mt-4 text-sm text-[#243746] leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <img src={t.photo} alt={t.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{t.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      </section>

      {/* Mid CTA */}
      <section className="relative z-10 px-6 md:px-12 py-16">
        <CompactCta headline={MID_CTA_HEADLINES[1]} tone="ink" cta="Wedding venues and vendors" onClick={() => navigate({ to: "/venue" })} />
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 bg-[#FFE08A] px-6 md:px-12 pt-20 pb-24 scroll-mt-24 text-[#243746]">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-[#243746]/70">Questions</p>
          <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95] text-[#243746]">Everything you're wondering about.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-12 grid items-start gap-3 lg:grid-cols-2">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} data-reveal style={{ transitionDelay: `${i * 60}ms` }}
              className="rounded-3xl bg-[#FFF7D6] border border-[#243746]/10 px-6 border-b-0 text-[#243746]">
              <AccordionTrigger data-static className="font-sans text-lg font-medium text-[#243746] hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[#243746] leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-6 md:mx-12 mt-16 mb-16 rounded-[3rem] bg-[#FFE08A] text-[#243746] py-24 px-6 md:px-12 text-center overflow-hidden" data-reveal>
        <p className="relative text-sm uppercase tracking-[0.3em] text-[#243746]">FOR EVERY WEDDING, ANYWHERE</p>
        <h2 className="relative mt-4 font-serif text-5xl md:text-7xl max-w-3xl mx-auto leading-[0.95]">Your wedding, every ceremony, in one place.</h2>
        <button onClick={() => goSignup()}
          className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-[#243746] text-[#FFF7D6] px-8 py-4 text-sm font-medium transition-all hover:bg-[#FFF7D6] hover:text-[#243746] hover:rounded-2xl hover:gap-3">
          Plan your wedding <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <SiteFooter />

      <LoginDialog
        open={!!authOpen}
        onOpenChange={(v) => setAuthOpen(v ? (authOpen || "signin") : false)}
        initialMode={authOpen || "signin"}
      />
    </div>
  );
}
