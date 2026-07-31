import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, Globe2, Users, Calendar, Utensils, MessageCircle, Grid3x3, Gift, Store, Star, CookingPot, BedDouble, Coffee, Luggage, Check, MousePointer2, ChefHat, Wine, Flame, Droplet } from "lucide-react";
import { LoginDialog } from "@/components/login-dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import heroAsset from "@/assets/homepage-hero.png.asset.json";
import cocktailAsset from "@/assets/wedding-8ffa935d.jpg.asset.json";
const heroImg = heroAsset.url;
const cocktailImg = cocktailAsset.url;

export const Route = createFileRoute("/")({ component: Landing });

function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).dataset.visible = "true";
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const SHOWCASE_FEATURES = [
  {
    eyebrow: "Multi-Event Planning",
    title: "Every celebration, one place",
    body: "Track every ceremony separately, or see it all at a glance.",
    visual: "events" as const,
    tint: "bg-sage-soft/50",
    reverse: false,
  },
  {
    eyebrow: "Guest List & RSVP",
    title: "Know exactly who's coming",
    body: "One guest list, RSVPs collected over WhatsApp, no spreadsheets.",
    visual: "guests" as const,
    tint: "bg-blush-soft/50",
    reverse: true,
  },
  {
    eyebrow: "Seating",
    title: "Every seat, thoughtfully placed",
    body: "Drag-and-drop seating that makes sense, table by table.",
    visual: "seating" as const,
    tint: "bg-wine-soft/40",
    reverse: false,
  },
  {
    eyebrow: "Registry",
    title: "Ask for exactly what you want",
    body: "Paste any product link, we'll pull the photo, name, and price.",
    visual: "registry" as const,
    tint: "bg-sage-soft/50",
    reverse: true,
  },
  {
    eyebrow: "WhatsApp RSVP Automation",
    title: "Meet guests where they already are",
    body: "Save-the-dates and RSVP links, sent straight to WhatsApp.",
    visual: "whatsapp" as const,
    tint: "bg-blush-soft/50",
    reverse: false,
  },
  {
    eyebrow: "Vendor Marketplace",
    title: "Find the people who'll bring it to life",
    body: "Browse trusted vendors for every tradition and budget.",
    visual: "vendors" as const,
    tint: "bg-wine-soft/40",
    reverse: true,
  },
];

const MID_CTA_HEADLINES = ["Every tradition, one beautiful plan.", "Every family, every custom, one plan."];

const TESTIMONIALS = [
  { quote: "We had four ceremonies across two continents and somehow Vowzy made it feel like one wedding, not four separate headaches. Our families finally knew what was happening, when.", name: "Priya & Rohan", loc: "Jaipur → Lake Como" },
  { quote: "Sending RSVPs over WhatsApp instead of a website nobody would click sounds small, but it's the reason we actually got responses back from grandparents.", name: "Aaliyah & Marcus", loc: "Lagos" },
  { quote: "I built our seating chart on a plane. Drag, drop, done, allergy warnings and all. I still don't understand how it used to take people weeks.", name: "Wei & Jonathan", loc: "San Francisco" },
  { quote: "Two cultures, two guest lists, one registry link we could actually share. Vowzy is the only tool that didn't ask us to pick a side.", name: "Fatima & David", loc: "Dubai" },
  { quote: "Between the Mehendi and the reception we had six events to track. Vowzy is the only reason nothing slipped through the cracks.", name: "Kavya & Alex", loc: "Austin → Udaipur" },
];

const FAQS = [
  { q: "Can I use Vowzy for a single-day wedding?", a: "Of course, Vowzy scales down as easily as it scales up. Whether you're planning one ceremony or six, you only add the events you're actually having." },
  { q: "Is Vowzy free to use?", a: "Yes, core planning tools, guest lists, RSVPs, seating, and your wedding website are free. Optional extras like premium vendor placements are available if you want them." },
  { q: "Do my guests need to download an app?", a: "No. Guests RSVP through a simple link sent over WhatsApp or text, no account, no app, no password to forget." },
  { q: "Can I track multiple ceremonies with different guest lists?", a: "Yes, add as many events as your celebration needs, tag each guest to the ones they're invited to, and Vowzy keeps every list, RSVP, and seating chart organized under one wedding." },
  { q: "Does Vowzy work for destination weddings?", a: "It's built for them. Track travel details, filter vendors by the city you're actually getting married in, and keep guests across time zones updated automatically." },
  { q: "How does WhatsApp RSVP work?", a: "We send your guests a personalized RSVP link over WhatsApp. They tap, answer your questions, and their response updates your guest list instantly, no spreadsheets, no chasing." },
];

const REGISTRY_ITEMS = [
  { n: "Le Creuset Dutch Oven", p: "$380", icon: CookingPot, swatch: "bg-blush-soft" },
  { n: "Egyptian Cotton Sheets", p: "$140", icon: BedDouble, swatch: "bg-blush-soft" },
  { n: "Nespresso Machine", p: "$210", icon: Coffee, swatch: "bg-periwinkle-soft" },
  { n: "Weekend Bags", p: "$95", icon: Luggage, swatch: "bg-blush-soft" },
  { n: "Stand Mixer", p: "$320", icon: ChefHat, swatch: "bg-blush-soft" },
  { n: "Wine Glasses", p: "$120", icon: Wine, swatch: "bg-blush-soft" },
  { n: "Cast Iron Skillet", p: "$65", icon: Flame, swatch: "bg-blush-soft" },
  { n: "Bath Towel Set", p: "$95", icon: Droplet, swatch: "bg-blush-soft" },
];

const VENDOR_CATEGORIES = [
  "Florist", "DJ", "Mehendi Artist", "Live Painting", "Custom Favours",
  "Photographer", "Caterer", "Decorator", "Makeup Artist", "Live Band",
];
const VENDOR_SLOTS = [
  { left: 4, top: 10 },
  { left: 100, top: 56 },
  { left: 170, top: 4 },
  { left: 14, top: 112 },
  { left: 165, top: 106 },
];

function SeatedTable({ cx, cy, radius, label, ringColor, seatColor, seatInitials, drag = false }: {
  cx: number; cy: number; radius: number; label: string; ringColor: string; seatColor: string; seatInitials: string[]; drag?: boolean;
}) {
  const orbit = radius + 14;
  return (
    <div className="absolute inset-0" style={drag ? { animation: "table-drag 9s ease-in-out infinite", zIndex: 10 } : undefined}>
      <div className={cn("absolute rounded-full border-2 bg-paper grid place-items-center text-[9px] font-medium text-ink/50", ringColor)}
        style={{ left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }}>
        {label}
      </div>
      {seatInitials.map((init, i) => {
        const angle = (i / seatInitials.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(angle) * orbit;
        const sy = cy + Math.sin(angle) * orbit;
        return (
          <div key={init} className={cn("absolute h-[18px] w-[18px] rounded-full border border-paper shadow-sm grid place-items-center text-[7px] font-semibold", seatColor)}
            style={{ left: sx - 9, top: sy - 9 }}>
            {init}
          </div>
        );
      })}
    </div>
  );
}

function FeatureVisual({ kind }: { kind: (typeof SHOWCASE_FEATURES)[number]["visual"] }) {
  return (
    <div className="relative w-full h-full grid place-items-center p-4">
      {kind === "events" && (
        <div className="relative w-full max-w-[270px] h-[190px]">
          <div className="absolute top-6 left-1 paper-card bg-paper px-4 py-3 shadow-lg -rotate-6"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 0s infinite" }}>
            <p className="text-[9px] uppercase tracking-widest text-cherry">Nov 12</p>
            <p className="font-serif text-lg mt-0.5">Pool Party</p>
          </div>
          <div className="absolute top-9 right-1 paper-card bg-paper px-4 py-3 shadow-lg rotate-3"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 2s infinite" }}>
            <p className="text-[9px] uppercase tracking-widest text-cherry">Nov 13</p>
            <p className="font-serif text-lg mt-0.5">Reception</p>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 paper-card bg-paper px-4 py-3 shadow-lg -rotate-2"
            style={{ animation: "pop-once 6s cubic-bezier(.34,1.56,.64,1) 4s infinite" }}>
            <p className="text-[9px] uppercase tracking-widest text-cherry">Nov 15</p>
            <p className="font-serif text-lg mt-0.5">Wedding</p>
          </div>
        </div>
      )}
      {kind === "guests" && (
        <div className="relative w-full max-w-[300px] h-[190px]">
          <div className="absolute left-0 top-6 w-[260px] paper-card bg-paper p-4 shadow-lg -rotate-1">
            <p className="text-[10px] uppercase tracking-widest text-cherry">Guest list</p>
            <div className="mt-3 space-y-2">
              {[
                { n: "Priya Rao", s: "Attending", delay: 1.6 },
                { n: "Sam Lee", s: "Pending", delay: 0 },
                { n: "Jordan Kim", s: "Attending", delay: 3.2 },
                { n: "Aisha Khan", s: "Attending", tag: "Peanut allergy", delay: 4.8, tagDelay: 6.4 },
              ].map(({ n, s, tag, delay, tagDelay }) => (
                <div key={n} className="flex items-center gap-1.5 text-xs">
                  <span className="truncate">{n}</span>
                  {tag && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[9px]"
                      style={{ animation: `pop-once 8s cubic-bezier(.34,1.56,.64,1) ${tagDelay}s infinite` }}>⚠ {tag}</span>
                  )}
                  <span className={cn("shrink-0 ml-auto rounded-full px-2 py-0.5 text-[10px]", s === "Attending" ? "bg-sage-soft text-sage-deep" : "bg-gold-soft text-gold-deep")}
                    style={{ animation: `pop-once 8s cubic-bezier(.34,1.56,.64,1) ${delay}s infinite` }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-0 paper-card bg-paper px-3 py-2.5 shadow-lg rotate-3 flex items-center gap-2 z-10">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep"><Check className="h-3 w-3" /></span>
            <div>
              <p className="text-[9px] font-medium leading-tight whitespace-nowrap">42 confirmed</p>
              <p className="text-[8px] text-muted-foreground leading-tight whitespace-nowrap">of 58 invited</p>
            </div>
          </div>
        </div>
      )}
      {kind === "seating" && (
        <div className="relative w-full max-w-[270px] h-[190px]">
          <SeatedTable cx={42} cy={48} radius={16} label="T1" ringColor="border-sage-deep/60"
            seatColor="bg-sage-soft text-sage-deep" seatInitials={["AM", "SL", "JK", "RB", "TW", "CP"]} />
          <SeatedTable cx={42} cy={142} radius={16} label="T2" ringColor="border-rose-deep/60"
            seatColor="bg-blush-soft text-rose-deep" seatInitials={["FD", "KA", "NW", "PQ"]} />
          <SeatedTable cx={228} cy={95} radius={16} label="T3" ringColor="border-clay/50" drag
            seatColor="bg-cream text-clay" seatInitials={["JR", "EL", "OM", "NR"]} />
          <div className="absolute top-1 right-1 h-8 w-16 rounded-lg border-2 border-wine/40 bg-paper grid place-items-center text-[8px] text-wine">Bar</div>
          <div className="absolute h-[90px] w-[90px] rounded-xl border-2 border-clay/40 bg-paper grid place-items-center text-[9px] text-clay text-center leading-tight"
            style={{ left: 135 - 45, top: 95 - 45 }}>Dance<br />floor</div>
          <MousePointer2 className="absolute h-4 w-4 text-ink drop-shadow-md z-20" strokeWidth={2.5}
            style={{ left: 250, top: 90, animation: "cursor-drag 9s ease-in-out infinite" }} />
        </div>
      )}
      {kind === "registry" && (
        <div className="absolute inset-0 overflow-hidden flex items-center">
          <div className="flex items-center gap-3 pl-4" style={{ width: "max-content", animation: "marquee-scroll 22s linear infinite" }}>
            {[...REGISTRY_ITEMS, ...REGISTRY_ITEMS].map(({ n, p, icon: Icon, swatch }, i) => (
              <div key={i} className="w-[85px] shrink-0 paper-card bg-paper p-3 shadow-md flex flex-col items-center text-center">
                <div className={cn("h-12 w-full rounded-lg grid place-items-center", swatch)}>
                  <Icon className="h-5 w-5 text-cherry" />
                </div>
                <p className="mt-2 text-[10px] leading-tight">{n}</p>
                <p className="text-[10px] text-cherry font-medium">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {kind === "whatsapp" && (
        <div className="relative w-full max-w-[280px] h-[190px]">
          <div className="absolute left-0 top-3 w-[190px] rounded-[2rem] bg-paper shadow-xl p-4 space-y-2 -rotate-1">
            <div className="relative ml-auto max-w-[85%]">
              <div className="rounded-2xl rounded-tr-sm bg-cherry text-pearl text-[11px] px-3 py-2"
                style={{ animation: "wa-bubble-1 9s ease-in-out infinite" }}>You're invited! Tap to RSVP →</div>
              <span className="absolute -bottom-1.5 -left-1.5 grid h-4 w-4 place-items-center rounded-full bg-sage-deep text-pearl"
                style={{ animation: "wa-check 9s ease-in-out infinite" }}><Check className="h-2.5 w-2.5" /></span>
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-sage-soft text-ink text-[11px] px-3 py-2"
              style={{ animation: "wa-bubble-2 9s ease-in-out infinite" }}>Joyfully accept ✓</div>
          </div>
          <div className="absolute right-0 bottom-3 max-w-[125px] rounded-2xl rounded-tl-sm bg-wine-soft text-wine text-[11px] px-3 py-2 shadow-lg rotate-3"
            style={{ animation: "wa-bubble-3 9s ease-in-out infinite" }}>Regretfully decline</div>
        </div>
      )}
      {kind === "vendors" && (
        <div className="relative w-full max-w-[280px] h-[190px]">
          {VENDOR_CATEGORIES.map((n, idx) => (
            <span key={n} className="absolute rounded-full border border-line bg-paper px-3.5 py-2 text-xs shadow-sm whitespace-nowrap"
              style={{ ...VENDOR_SLOTS[idx % 5], animation: `vendor-${idx} 10s ease-in-out infinite` } as any}>
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: (typeof SHOWCASE_FEATURES)[number]; index: number }) {
  return (
    <div data-reveal style={{ transitionDelay: `${(index % 3) * 60}ms` }}
      className="rounded-2xl border border-line/60 bg-paper overflow-hidden flex flex-col morph-card">
      <div className={cn("relative overflow-hidden h-56", feature.tint)}>
        <FeatureVisual kind={feature.visual} />
      </div>
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-cherry">{feature.eyebrow}</p>
        <h3 className="mt-2 font-serif text-lg leading-tight">{feature.title}</h3>
        <p className="mt-2 text-sm text-ink/70 leading-relaxed">{feature.body}</p>
      </div>
    </div>
  );
}

const CTA_TONE_STYLES: Record<"cherry" | "sage" | "pearl", { wrap: string; eyebrow: string; button: string }> = {
  cherry: { wrap: "bg-cherry text-pearl", eyebrow: "text-blush", button: "bg-pearl text-ink hover:bg-ink hover:text-pearl" },
  sage: { wrap: "bg-sage-deep text-pearl", eyebrow: "text-sage-soft", button: "bg-pearl text-ink hover:bg-ink hover:text-pearl" },
  pearl: { wrap: "bg-paper text-ink border border-line", eyebrow: "text-cherry", button: "bg-ink text-pearl hover:bg-cherry" },
};

function CompactCta({ headline, onClick, tone = "cherry" }: { headline: string; onClick: () => void; tone?: "cherry" | "sage" | "pearl" }) {
  const s = CTA_TONE_STYLES[tone];
  return (
    <div className={cn("relative rounded-[2.5rem] py-12 px-6 md:px-12 text-center overflow-hidden", s.wrap)} data-reveal>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 15% 30%, var(--blush) 0 4%, transparent 5%), radial-gradient(circle at 85% 70%, var(--cream) 0 3%, transparent 4%), radial-gradient(circle at 50% 20%, var(--sage) 0 4%, transparent 5%)" }} />
      <div aria-hidden className="absolute -top-16 -left-16 h-48 w-48 blob bg-wine/40" />
      <div aria-hidden className="absolute -bottom-16 -right-16 h-52 w-52 blob-2 bg-blush/40" />
      <p className={cn("relative text-xs uppercase tracking-[0.3em]", s.eyebrow)}>FOR EVERY WEDDING, ANYWHERE</p>
      <h3 className="relative mt-3 font-serif text-3xl md:text-4xl max-w-xl mx-auto leading-tight">{headline}</h3>
      <button onClick={onClick}
        className={cn("relative mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all hover:rounded-2xl hover:gap-3", s.button)}>
        Start planning for free <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div aria-hidden={!visible}
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center bg-pearl transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}>
      <div className="text-center">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-cherry text-pearl"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-3xl">Vowzy</span>
        </span>
        <div className="mt-7 mx-auto h-7 w-7 rounded-full border-2 border-cherry/25 border-t-cherry animate-spin" />
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Loading your wedding…</p>
      </div>
    </div>
  );
}

function Landing() {
  const rootRef = useReveal();
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);
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
    <div ref={rootRef as any} className="min-h-screen bg-pearl text-ink overflow-hidden">
      <LoadingScreen visible={!ready} />
      {/* Ambient curved decorations */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] blob bg-blush-soft/70 animate-float-slow" />
      <div aria-hidden className="pointer-events-none fixed top-[30%] -right-56 h-[560px] w-[560px] blob-2 bg-sage-soft/60 animate-float-slow" style={{ animationDelay: "-3s" }} />
      <div aria-hidden className="pointer-events-none fixed bottom-[-220px] left-[15%] h-[420px] w-[420px] blob bg-wine-soft/60 animate-float-slow" style={{ animationDelay: "-6s" }} />

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-pearl/85 backdrop-blur-md border-b border-line/50 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" data-static className="flex items-center gap-2 group">
          <span className="font-serif text-3xl transition-colors group-hover:text-cherry">Vowzy</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link to="/venues" data-static className="story-link hover:text-cherry transition-colors">Venues</Link>
          <Link to="/vendors" data-static className="story-link hover:text-cherry transition-colors">Marketplace</Link>
          <a href="#how" data-static className="story-link hover:text-cherry transition-colors">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => setAuthOpen("signin")} className="text-sm text-ink/70 hover:text-cherry transition-colors hidden sm:inline">Sign in</button>
          <button onClick={() => setAuthOpen("signup")}
            className="rounded-full bg-ink text-pearl px-5 py-2 text-sm transition-all hover:bg-cherry hover:rounded-2xl">
            Start planning
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-8 md:pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6" data-reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-cherry">
            For every wedding, anywhere
          </p>
          <h1 className="mt-6 font-serif text-6xl md:text-8xl leading-[0.9] tracking-tight">
            One place for every <span className="italic text-cherry">event</span> your wedding needs.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-xl leading-relaxed">
            Big, small, traditional, or entirely your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setAuthOpen("signup")}
              className="inline-flex items-center gap-2 rounded-full bg-cherry text-pearl px-6 py-3 text-sm font-medium transition-all hover:bg-wine hover:rounded-2xl hover:gap-3">
              Start your plan <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/venues"
              className="inline-flex items-center gap-2 rounded-full border border-cherry text-cherry px-6 py-3 text-sm transition-all hover:bg-cherry hover:text-pearl hover:rounded-2xl">
              Browse destinations
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Multi-event planning</span>
            <span className="text-cherry">·</span>
            <span>Find venues &amp; vendors</span>
            <span className="text-cherry">·</span>
            <span>Sell &amp; buy with us</span>
          </div>
        </div>

        <div className="lg:col-span-6 relative" data-reveal>
          <div className="relative overflow-hidden shadow-2xl blob-2 group">
            <img src={heroImg} alt="Bride and groom embraced beneath ivy-covered arches overlooking a lake at sunset"
              className="w-full h-[560px] object-cover object-bottom transition-transform duration-[1200ms] group-hover:scale-105"
              width={1200} height={1500} loading="eager" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />
          </div>
          <div className="hidden md:block absolute -bottom-6 -left-6 paper-card p-5 rotate-[-2deg] max-w-[260px] bg-paper transition-transform hover:rotate-0 hover:-translate-y-1">
            <p className="text-[10px] uppercase tracking-widest text-cherry">The Rao–Beckett Wedding</p>
            <p className="font-serif text-xl mt-1">Lake Como · Nov 2026</p>
            <div className="mt-3 space-y-1.5 text-xs text-ink/70">
              <p>Nov 12 · Pool Party</p>
              <p>Nov 13 · Ceremony</p>
              <p>Nov 14 · Reception</p>
            </div>
            <p className="mt-3 text-[11px] text-cherry">Villa Balbiano, 100 guests</p>
          </div>
          <div className="hidden md:flex absolute -top-4 -right-4 paper-card p-4 rotate-[2deg] bg-paper items-center gap-3 max-w-[240px] transition-transform hover:rotate-0 hover:-translate-y-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/40 text-ink"><MessageCircle className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-medium">RSVP reminder sent</p>
              <p className="text-[11px] text-muted-foreground">via WhatsApp · 42 guests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Culture strip */}
      <section className="relative z-10 bg-blush-soft/70 border-y border-line py-14 px-6 md:px-12" data-reveal>
        <p className="text-xs uppercase tracking-[0.3em] text-cherry text-center">Built for every event</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-5xl mx-auto">
          {[
            { t: "Wedding ceremony", bg: "bg-cream", hover: "hover:bg-cream-hover" },
            { t: "Reception", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
            { t: "Welcome party", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
            { t: "Sangeet", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
            { t: "Cocktail hour", bg: "bg-cream", hover: "hover:bg-cream-hover" },
            { t: "Rehearsal dinner", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
            { t: "Mehendi", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
            { t: "Haldi", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
            { t: "Nikah", bg: "bg-cream", hover: "hover:bg-cream-hover" },
            { t: "Baraat", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
            { t: "Church ceremony", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
            { t: "Chuppah", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
            { t: "Tea ceremony", bg: "bg-cream", hover: "hover:bg-cream-hover" },
            { t: "Pool party", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
            { t: "Beach ceremony", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
            { t: "Farewell brunch", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
          ].map(({ t, bg, hover }) => (
            <span key={t} className={`rounded-full ${bg} border border-line px-4 py-2 text-sm cursor-default transition-all ${hover} hover:-translate-y-0.5`}>{t}</span>
          ))}
        </div>
      </section>

      {/* The Planner */}
      <section id="how" className="relative z-10 px-6 md:px-12 py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-24" data-reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-cherry">The planner</p>
            <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">We handle the details. You bring the love.</h2>
            <p className="mt-6 text-ink/70">One plan for two families. Multiple events, guests across borders, RSVPs on WhatsApp, seating that respects allergies, a website you actually design yourself.</p>
            <div className="mt-8 mx-auto lg:mx-0 w-[min(100%,650px)] lg:w-full aspect-[4/3] lg:aspect-auto lg:h-[560px] rounded-[2.5rem] lg:[border-radius:42%_58%_65%_35%/45%_40%_60%_55%] overflow-hidden shadow-xl transition-transform duration-700 hover:scale-[1.02]">
              <img src={cocktailImg} alt="Beach cocktail hour at a destination wedding" loading="lazy" width={1024} height={1280}
                className="w-full h-full object-cover object-center" />
            </div>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4 items-stretch">
            {[
              { i: Calendar, t: "Unlimited ceremonies", b: "Add every event your two cultures and traditions need. No limits.", bg: "bg-cream", hover: "hover:bg-cream-hover" },
              { i: Users, t: "Smart guest lists", b: "First and last name, per-event invites, plus-ones, dietary tags, allergies, accessibility notes.", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
              { i: Grid3x3, t: "Seating canvas", b: "Design the room. Drag tables, dance floor, bar. Round, square, rectangle. Warn on capacity and allergy clusters.", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
              { i: MessageCircle, t: "WhatsApp automation", b: "Save-the-date, RSVP link, T-7 reminder, thank-you. Templates that greet guests by first name.", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
              { i: Utensils, t: "Food & allergies", b: "Halal, kosher, jain, vegan, nut, dairy, shellfish. Tracked, filterable, flagged when you seat them.", bg: "bg-blush-soft", hover: "hover:bg-blush-soft-hover" },
              { i: Gift, t: "Registry, your way", b: "Pick your country, choose from the retailers guests actually shop at, and share one link.", bg: "bg-cream", hover: "hover:bg-cream-hover" },
              { i: Store, t: "Buy & sell marketplace", b: "Leftover décor, dresses, tableware. Buy from other couples, resell yours after the day.", bg: "bg-sage-soft", hover: "hover:bg-sage-soft-hover" },
              { i: Globe2, t: "Destination-first", b: "Your wedding city isn't always your home city. Travel, stay, vendors, all filtered by where you're actually getting married.", bg: "bg-wine-soft", hover: "hover:bg-wine-soft-hover" },
            ].map(({ i: Icon, t, b, bg, hover }) => (
              <div key={t} data-reveal className={`${bg} ${hover} rounded-3xl p-6 morph-card cursor-default transition-colors duration-500 flex flex-col h-full`}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-cherry shadow-sm transition-transform group-hover:scale-110"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-4 font-serif text-2xl leading-tight">{t}</h3>
                <p className="mt-2 text-sm text-ink/70 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <section className="relative z-10 px-6 md:px-12 py-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-cherry">Everything, in one plan</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl leading-[0.95]">Built for the way you actually celebrate.</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          {SHOWCASE_FEATURES.map((f, i) => <FeatureCard key={f.eyebrow} feature={f} index={i} />)}
        </div>

        <div className="pt-4">
          <CompactCta headline={MID_CTA_HEADLINES[0]} tone="sage" onClick={() => setAuthOpen("signup")} />
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 bg-blush-soft/40 border-y border-line py-24 px-6 md:px-12">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-cherry">What couples say</p>
          <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">Real weddings, real relief.</h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto items-stretch">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              className="rounded-3xl bg-paper p-6 shadow-sm border border-line/60 flex flex-col h-full">
              <div className="flex gap-0.5 text-cherry">
                {Array.from({ length: 5 }).map((_, si) => <Star key={si} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="mt-4 text-sm text-ink/80 leading-relaxed flex-1">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep font-serif text-sm">
                  {t.name.split(" & ").map((n) => n[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mid CTA */}
      <section className="relative z-10 px-6 md:px-12 py-16">
        <CompactCta headline={MID_CTA_HEADLINES[1]} tone="pearl" onClick={() => setAuthOpen("signup")} />
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-cherry">Questions</p>
          <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">Everything you're wondering about.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-12 max-w-3xl mx-auto space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} data-reveal style={{ transitionDelay: `${i * 60}ms` }}
              className="rounded-3xl bg-paper border border-line/60 px-6 border-b-0">
              <AccordionTrigger data-static className="font-sans text-lg font-medium hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-ink/70 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-6 md:mx-12 mb-16 rounded-[3rem] bg-cherry text-pearl py-24 px-6 md:px-12 text-center overflow-hidden" data-reveal>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--blush) 0 4%, transparent 5%), radial-gradient(circle at 80% 60%, var(--cream) 0 3%, transparent 4%), radial-gradient(circle at 50% 80%, var(--sage) 0 5%, transparent 6%)" }} />
        <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 blob bg-wine/40" />
        <div aria-hidden className="absolute -bottom-24 -right-24 h-80 w-80 blob-2 bg-blush/40" />
        <p className="relative text-xs uppercase tracking-[0.3em] text-blush">FOR EVERY WEDDING, ANYWHERE</p>
        <h2 className="relative mt-4 font-serif text-5xl md:text-7xl max-w-3xl mx-auto leading-[0.95]">Your wedding, every ceremony, in one place.</h2>
        <button onClick={() => setAuthOpen("signup")}
          className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-pearl text-ink px-8 py-4 text-sm font-medium transition-all hover:bg-ink hover:text-pearl hover:rounded-2xl hover:gap-3">
          Start planning for free <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <footer className="relative z-10 border-t border-line py-8 px-6 md:px-12 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <span>© {new Date().getFullYear()} Vowzy</span>
        <span>Designed for weddings, everywhere.</span>
      </footer>

      <LoginDialog
        open={!!authOpen}
        onOpenChange={(v) => setAuthOpen(v ? (authOpen || "signin") : false)}
        initialMode={authOpen || "signin"}
      />
    </div>
  );
}
