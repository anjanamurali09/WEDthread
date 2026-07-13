import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, Globe2, Users, Calendar, Utensils, MessageCircle, Grid3x3, Gift, Store } from "lucide-react";
import { LoginDialog } from "@/components/login-dialog";

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

function Landing() {
  const rootRef = useReveal();
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);

  return (
    <div ref={rootRef as any} className="min-h-screen bg-pearl text-ink overflow-hidden">
      {/* Ambient curved decorations */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] blob bg-blush-soft/70 animate-float-slow" />
      <div aria-hidden className="pointer-events-none fixed top-[30%] -right-56 h-[560px] w-[560px] blob-2 bg-sage-soft/60 animate-float-slow" style={{ animationDelay: "-3s" }} />
      <div aria-hidden className="pointer-events-none fixed bottom-[-220px] left-[15%] h-[420px] w-[420px] blob bg-wine-soft/60 animate-float-slow" style={{ animationDelay: "-6s" }} />

      {/* Nav */}
      <header className="relative z-20 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-serif text-3xl">Vowzy</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link to="/venues" className="story-link hover:text-cherry transition-colors">Venues</Link>
          <Link to="/vendors" className="story-link hover:text-cherry transition-colors">Marketplace</Link>
          <a href="#how" className="story-link hover:text-cherry transition-colors">How it works</a>
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
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cherry">
            <span className="h-px w-8 bg-cherry" /> For every wedding, anywhere
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
            <p className="font-serif text-xl mt-1">Dubai · Nov 2026</p>
            <div className="mt-3 space-y-1.5 text-xs text-ink/70">
              <p>Nov 12 · Mehendi at Al Barari</p>
              <p>Nov 13 · Sangeet · Bulgari Resort</p>
              <p>Nov 14 · Ceremony · Palm Jumeirah</p>
              <p>Nov 15 · Reception · Atlantis</p>
            </div>
            <p className="mt-3 text-[11px] text-cherry">248 guests, 4 countries</p>
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
        <p className="text-xs uppercase tracking-[0.3em] text-cherry text-center">Built for every kind of wedding</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {["Mehendi","Haldi","Sangeet","Nikah","Baraat","Church ceremony","Registry","Reception","Cocktail hour","Rehearsal dinner","Welcome party","Pool party","Beach ceremony","Chuppah","Tea ceremony","Farewell brunch"].map((t) => (
            <span key={t} className="rounded-full bg-paper border border-line px-4 py-2 text-sm cursor-default transition-all hover:bg-cherry hover:text-pearl hover:border-cherry hover:-translate-y-0.5">{t}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="how" className="relative z-10 px-6 md:px-12 py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-24" data-reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-cherry">The planner</p>
            <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">We handle the details. You bring the love.</h2>
            <p className="mt-6 text-ink/70">One plan for two families. Multiple events, guests across borders, RSVPs on WhatsApp, seating that respects allergies, a website you actually design yourself.</p>
            <div className="mt-8 mx-auto lg:mx-0 w-[min(100%,650px)] aspect-[16/10] rounded-[50%] overflow-hidden shadow-xl transition-transform duration-700 hover:scale-[1.02]">
              <img src={cocktailImg} alt="Beach cocktail hour at a destination wedding" loading="lazy" width={1024} height={1280}
                className="w-full h-full object-cover object-center" />
            </div>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {[
              { i: Calendar, t: "Unlimited ceremonies", b: "Add every event your two cultures ask for. Never a dropdown of just ceremony and reception.", bg: "bg-cream" },
              { i: Users, t: "Smart guest lists", b: "First and last name, per-event invites, plus-ones, dietary tags, allergies, accessibility notes.", bg: "bg-blush-soft" },
              { i: Grid3x3, t: "Seating canvas", b: "Design the room. Drag tables, dance floor, bar. Round, square, rectangle. Warn on capacity and allergy clusters.", bg: "bg-sage-soft" },
              { i: MessageCircle, t: "WhatsApp automation", b: "Save-the-date, RSVP link, T-7 reminder, thank-you. Templates that greet guests by first name.", bg: "bg-wine-soft" },
              { i: Utensils, t: "Food & allergies", b: "Halal, kosher, jain, vegan, nut, dairy, shellfish. Tracked, filterable, flagged when you seat them.", bg: "bg-blush-soft" },
              { i: Gift, t: "Registry, your way", b: "Pick your country, choose from the retailers guests actually shop at, and share one link.", bg: "bg-cream" },
              { i: Store, t: "Buy & sell marketplace", b: "Leftover décor, dresses, tableware. Buy from other couples, resell yours after the day.", bg: "bg-sage-soft" },
              { i: Globe2, t: "Destination-first", b: "Your wedding city isn't always your home city. Travel, stay, vendors, all filtered by where you're actually getting married.", bg: "bg-wine-soft" },
            ].map(({ i: Icon, t, b, bg }) => (
              <div key={t} data-reveal className={`${bg} rounded-3xl p-6 morph-card cursor-default`}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-cherry shadow-sm transition-transform group-hover:scale-110"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-4 font-serif text-2xl leading-tight">{t}</h3>
                <p className="mt-2 text-sm text-ink/70 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-6 md:mx-12 mb-16 rounded-[3rem] bg-cherry text-pearl py-24 px-6 md:px-12 text-center overflow-hidden" data-reveal>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--blush) 0 4%, transparent 5%), radial-gradient(circle at 80% 60%, var(--cream) 0 3%, transparent 4%), radial-gradient(circle at 50% 80%, var(--sage) 0 5%, transparent 6%)" }} />
        <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 blob bg-wine/40" />
        <div aria-hidden className="absolute -bottom-24 -right-24 h-80 w-80 blob-2 bg-blush/40" />
        <p className="relative text-xs uppercase tracking-[0.3em] text-blush">Free while we're launching</p>
        <h2 className="relative mt-4 font-serif text-5xl md:text-7xl max-w-3xl mx-auto leading-[0.95]">Your wedding, every ceremony, in one place.</h2>
        <button onClick={() => setAuthOpen("signup")}
          className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-pearl text-ink px-8 py-4 text-sm font-medium transition-all hover:bg-ink hover:text-pearl hover:rounded-2xl hover:gap-3">
          Start planning free <ArrowRight className="h-4 w-4" />
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
