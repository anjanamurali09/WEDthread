import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Globe2, Users, Calendar, Utensils, MessageCircle, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Nav */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-2xl">Vowzy</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link to="/venues" className="hover:text-ink">Venues</Link>
          <Link to="/vendors" className="hover:text-ink">Vendors</Link>
          <a href="#how" className="hover:text-ink">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-ink/70 hover:text-ink hidden sm:inline">Sign in</Link>
          <Link to="/auth" className="rounded-full bg-ink text-paper px-4 py-2 text-sm hover:bg-clay transition-colors">Start planning</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-8 md:pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-clay">
            <span className="h-px w-8 bg-clay" /> For multicultural &amp; destination weddings
          </p>
          <h1 className="mt-6 font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight">
            Many ceremonies.<br/>
            <span className="italic text-clay">Many cultures.</span><br/>
            One plan.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-xl leading-relaxed">
            Vowzy is the wedding platform built for couples whose story crosses continents. Plan mehendi, sangeet, nikah, church, registry, reception — as many events as your two families need, in whatever destination you choose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-clay transition-colors">
              Start your plan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/venues" className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm hover:bg-stone/60">
              Browse destinations
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Launching India first</span>
            <span>·</span>
            <span>Destination-native</span>
            <span>·</span>
            <span>WhatsApp built in</span>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="relative">
            <div className="paper-card p-6 rotate-[-1deg]">
              <p className="text-[11px] uppercase tracking-widest text-clay">The Rao–Beckett Wedding</p>
              <p className="font-serif text-2xl mt-1">Udaipur · Nov 2026</p>
              <div className="mt-5 space-y-3">
                {[
                  { d: "Nov 12", n: "Mehendi", v: "Jag Mandir · courtyard" },
                  { d: "Nov 13", n: "Sangeet", v: "Taj Lake Palace · terrace" },
                  { d: "Nov 14", n: "Hindu Ceremony", v: "City Palace · Zenana Mahal" },
                  { d: "Nov 15", n: "Reception", v: "Oberoi Udaivilas · lawn" },
                ].map((e) => (
                  <div key={e.n} className="flex items-center gap-4 border-t border-line pt-3 first:border-0 first:pt-0">
                    <div className="w-14 text-xs text-muted-foreground font-mono">{e.d}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.n}</p>
                      <p className="text-xs text-muted-foreground">{e.v}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-clay">Confirmed</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">248 guests · 4 countries</span>
                <span className="text-clay">78% RSVP'd</span>
              </div>
            </div>
            <div className="paper-card p-4 mt-4 -ml-2 rotate-[1.5deg] max-w-xs">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-clay-soft text-clay"><MessageCircle className="h-3.5 w-3.5" /></span>
                <div>
                  <p className="text-xs font-medium">RSVP reminder sent</p>
                  <p className="text-[11px] text-muted-foreground">via WhatsApp · 42 guests</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="px-6 md:px-12 py-24 bg-stone/40 border-y border-line">
        <p className="text-xs uppercase tracking-[0.2em] text-clay text-center">The planner</p>
        <h2 className="mt-3 font-serif text-4xl md:text-5xl text-center max-w-3xl mx-auto">Every tool a modern wedding needs, none of the ones it doesn't.</h2>
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { i: Calendar, t: "Unlimited ceremonies", b: "Add every event your two cultures ask for. Not a dropdown of 'ceremony' and 'reception'." },
            { i: Users, t: "Smart guest lists", b: "Per-event invites, plus-ones, dietary tags, food allergies, accessibility notes — one row per human." },
            { i: Grid3x3Icon, t: "Drag-and-drop seating", b: "Layout tables for each event. See capacity, unseated attendees, dietary clusters at a glance." },
            { i: MessageCircle, t: "WhatsApp automation", b: "Save-the-date, RSVP link, T-7 reminder, thank-you — scheduled and sent, not typed one by one." },
            { i: Utensils, t: "Food & allergies at a table level", b: "Halal, kosher, jain, vegan, nut, dairy, shellfish — tracked, filterable, warned about at seating." },
            { i: Globe2, t: "Destination-first", b: "Your wedding city ≠ your home city. Travel info, accommodations, and vendors serviced by destination." },
          ].map(({ i: Icon, t, b }) => (
            <div key={t} className="paper-card p-7">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-soft text-clay"><Icon className="h-4 w-4" /></span>
              <h3 className="mt-5 font-serif text-2xl">{t}</h3>
              <p className="mt-2 text-sm text-ink/70 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-32 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-clay">Free while we're launching in India</p>
        <h2 className="mt-4 font-serif text-5xl md:text-6xl max-w-3xl mx-auto">Your wedding, from mehendi to registry, in one place.</h2>
        <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-7 py-3.5 text-sm font-medium hover:bg-clay transition-colors">
          Start planning free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-line py-8 px-6 md:px-12 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <span>© {new Date().getFullYear()} Vowzy</span>
        <span className="inline-flex items-center gap-2"><MapPin className="h-3 w-3" /> Launching in India · designed for the world</span>
      </footer>
    </div>
  );
}

function Grid3x3Icon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
}
