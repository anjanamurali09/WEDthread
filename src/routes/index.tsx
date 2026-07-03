import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Globe2, Users, Calendar, Utensils, MessageCircle, Grid3x3, Gift, Store } from "lucide-react";
import heroImg from "@/assets/hero-wedding.jpg";
import cocktailImg from "@/assets/cocktail-beach.jpg";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Nav */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-3xl">Vowzy</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link to="/venues" className="hover:text-clay transition-colors">Venues</Link>
          <Link to="/vendors" className="hover:text-clay transition-colors">Marketplace</Link>
          <a href="#how" className="hover:text-clay transition-colors">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-ink/70 hover:text-ink hidden sm:inline">Sign in</Link>
          <Link to="/auth" className="rounded-full bg-ink text-paper px-4 py-2 text-sm hover:bg-clay transition-colors">Start planning</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-8 md:pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 relative z-10">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-clay">
            <span className="h-px w-8 bg-clay" /> For weddings that cross cultures &amp; continents
          </p>
          <h1 className="mt-6 font-serif text-6xl md:text-8xl leading-[0.9] tracking-tight">
            Many ceremonies.<br/>
            <span className="italic text-clay">Many cultures.</span><br/>
            One plan.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-xl leading-relaxed">
            Plan a mehendi, a church ceremony, a cocktail hour, a nikah, a pool party, or a Sunday farewell brunch. Vowzy handles as many events as your two families need, wherever in the world you're getting married.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-clay transition-colors">
              Start your plan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/venues" className="inline-flex items-center gap-2 rounded-full border border-clay text-clay px-6 py-3 text-sm hover:bg-blush-soft">
              Browse destinations
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Destination-native</span>
            <span className="text-clay">·</span>
            <span>WhatsApp built in</span>
            <span className="text-clay">·</span>
            <span>Every culture, every ceremony</span>
          </div>
        </div>
        <div className="lg:col-span-6 relative">
          <div className="relative rounded-[2rem] overflow-hidden shadow-2xl">
            <img src={heroImg} alt="Warm golden-hour destination wedding table setting with terracotta and blush florals under string lights" className="w-full h-[560px] object-cover" width={1600} height={1280} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />
          </div>
          <div className="hidden md:block absolute -bottom-6 -left-6 paper-card p-5 rotate-[-2deg] max-w-[260px] bg-paper">
            <p className="text-[10px] uppercase tracking-widest text-clay">The Rao–Beckett Wedding</p>
            <p className="font-serif text-xl mt-1">Udaipur · Nov 2026</p>
            <div className="mt-3 space-y-1.5 text-xs text-ink/70">
              <p>Nov 12 · Mehendi</p>
              <p>Nov 13 · Sangeet</p>
              <p>Nov 14 · Ceremony</p>
              <p>Nov 15 · Reception</p>
            </div>
            <p className="mt-3 text-[11px] text-clay">248 guests, 4 countries</p>
          </div>
          <div className="hidden md:flex absolute -top-4 -right-4 paper-card p-4 rotate-[2deg] bg-paper items-center gap-3 max-w-[240px]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/40 text-ink"><MessageCircle className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-medium">RSVP reminder sent</p>
              <p className="text-[11px] text-muted-foreground">via WhatsApp · 42 guests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Culture strip */}
      <section className="bg-blush-soft border-y border-line py-14 px-6 md:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-clay text-center">Built for every kind of wedding</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {["Mehendi","Haldi","Sangeet","Nikah","Baraat","Church ceremony","Registry","Reception","Cocktail hour","Rehearsal dinner","Welcome party","Pool party","Beach ceremony","Chuppah","Tea ceremony","Farewell brunch"].map((t) => (
            <span key={t} className="rounded-full bg-paper border border-line px-4 py-2 text-sm">{t}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="how" className="px-6 md:px-12 py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <p className="text-xs uppercase tracking-[0.2em] text-clay">The planner</p>
            <h2 className="mt-3 font-serif text-5xl md:text-6xl leading-[0.95]">Every tool a modern wedding needs.</h2>
            <p className="mt-6 text-ink/70">One plan for two families. Multiple events, guests across borders, RSVPs on WhatsApp, seating that respects allergies, a website you actually design yourself.</p>
            <img src={cocktailImg} alt="Beach cocktail hour at a destination wedding" loading="lazy" width={1024} height={1280} className="mt-8 rounded-[2rem] w-full h-64 object-cover shadow-xl" />
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {[
              { i: Calendar, t: "Unlimited ceremonies", b: "Add every event your two cultures ask for. Never a dropdown of just ceremony and reception.", bg: "bg-cream" },
              { i: Users, t: "Smart guest lists", b: "First and last name, per-event invites, plus-ones, dietary tags, allergies, accessibility notes.", bg: "bg-blush-soft" },
              { i: Grid3x3, t: "Seating canvas", b: "Design the room. Drag tables, dance floor, bar. Round, square, rectangle. Warn on capacity and allergy clusters.", bg: "bg-sage/25" },
              { i: MessageCircle, t: "WhatsApp automation", b: "Save-the-date, RSVP link, T-7 reminder, thank-you. Templates that greet guests by first name.", bg: "bg-clay-soft" },
              { i: Utensils, t: "Food &amp; allergies", b: "Halal, kosher, jain, vegan, nut, dairy, shellfish. Tracked, filterable, flagged when you seat them.", bg: "bg-blush-soft" },
              { i: Gift, t: "Registry, your way", b: "Pick your country, choose from the retailers guests actually shop at, and share one link.", bg: "bg-cream" },
              { i: Store, t: "Buy &amp; sell marketplace", b: "Leftover décor, dresses, tableware. Buy from other couples, resell yours after the day.", bg: "bg-sage/25" },
              { i: Globe2, t: "Destination-first", b: "Your wedding city isn't always your home city. Travel, stay, vendors, all filtered by where you're actually getting married.", bg: "bg-clay-soft" },
            ].map(({ i: Icon, t, b, bg }) => (
              <div key={t} className={`${bg} rounded-3xl p-6 hover:-translate-y-1 transition-transform`}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-clay shadow-sm"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-4 font-serif text-2xl leading-tight">{t}</h3>
                <p className="mt-2 text-sm text-ink/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: b }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-6 md:mx-12 mb-16 rounded-[3rem] bg-clay text-paper py-24 px-6 md:px-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--blush) 0 4%, transparent 5%), radial-gradient(circle at 80% 60%, var(--cream) 0 3%, transparent 4%), radial-gradient(circle at 50% 80%, var(--sage) 0 5%, transparent 6%)" }} />
        <p className="relative text-xs uppercase tracking-[0.3em] text-blush">Free while we're launching</p>
        <h2 className="relative mt-4 font-serif text-5xl md:text-7xl max-w-3xl mx-auto leading-[0.95]">Your wedding, every ceremony, in one place.</h2>
        <Link to="/auth" className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-paper text-ink px-8 py-4 text-sm font-medium hover:bg-cream transition-colors">
          Start planning free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-line py-8 px-6 md:px-12 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <span>© {new Date().getFullYear()} Vowzy</span>
        <span>Designed for weddings, everywhere.</span>
      </footer>
    </div>
  );
}
