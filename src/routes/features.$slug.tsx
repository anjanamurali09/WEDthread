import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, ArrowLeft, Users, Bell, Smartphone,
  Armchair, ShieldCheck, Gift, Link2, Check, MessageCircle, Mail, Store, Package, Globe2,
  Wallet, PieChart, Palette, MapPin, Star,
} from "lucide-react";
import { LoginDialog } from "@/components/login-dialog";
import { Logo } from "@/components/logo";
import { SHOWCASE_FEATURES, FeatureVisual, useReveal } from "@/routes/index";

const FEATURE_PAGES: Record<string, {
  headline: string;
  sub: string;
  benefits: { icon: typeof Users; title: string; body: string }[];
}> = {
  "guest-list": {
    headline: "Know exactly who's coming.",
    sub: "One guest list, RSVPs collected over WhatsApp and email, no spreadsheets, no chasing.",
    benefits: [
      { icon: Users, title: "Smart guest lists", body: "First and last name, per-event invites, plus-ones, dietary tags, allergies, accessibility notes." },
      { icon: Bell, title: "Real-time RSVPs", body: "Watch your guest count update the moment someone responds." },
      { icon: Smartphone, title: "No app required", body: "Guests tap a link and reply, nothing to download, nothing to install." },
    ],
  },
  seating: {
    headline: "Every seat, thoughtfully placed.",
    sub: "Drag-and-drop seating that makes sense, table by table.",
    benefits: [
      { icon: Armchair, title: "Visual seating canvas", body: "Drag tables, dance floor, bar. Round, square, rectangle, arranged exactly how you picture it." },
      { icon: ShieldCheck, title: "Capacity & allergy warnings", body: "Get warned before a table's overfilled or an allergy's seated too close for comfort." },
      { icon: Users, title: "Built on your real guest list", body: "Every seat pulls straight from your RSVPs, always in sync." },
    ],
  },
  registry: {
    headline: "Ask for exactly what you want.",
    sub: "Paste any product link, we'll pull the photo, name, and price.",
    benefits: [
      { icon: Gift, title: "Any store, any country", body: "Link gifts from the retailers your guests actually shop at." },
      { icon: Link2, title: "One link to share", body: "No more juggling five different registry sites." },
      { icon: Check, title: "Track what's been bought", body: "Know what's claimed without guests spoiling the surprise." },
    ],
  },
  "rsvp-automation": {
    headline: "Meet guests where they already are.",
    sub: "Save-the-dates and RSVP links, sent straight to WhatsApp and email.",
    benefits: [
      { icon: MessageCircle, title: "Save-the-date to thank-you", body: "Automated messages for every stage of the RSVP journey, timed for you." },
      { icon: Users, title: "Personalized by name", body: "Templates greet every guest by name, for every event they're invited to." },
      { icon: Mail, title: "WhatsApp and email", body: "Reach guests however they're most likely to actually respond." },
    ],
  },
  "vendor-marketplace": {
    headline: "Find the people who'll bring it to life.",
    sub: "Browse trusted vendors for every tradition and budget.",
    benefits: [
      { icon: Store, title: "Every tradition covered", body: "Mehendi artists, live painters, caterers, and more, for every kind of celebration." },
      { icon: Package, title: "Buy & sell marketplace", body: "Leftover décor, dresses, tableware. Buy from other couples, resell yours after the day." },
      { icon: Star, title: "Trusted by real couples", body: "Browse reviews and photos from weddings just like yours." },
    ],
  },
  venues: {
    headline: "Find the perfect place to say I do.",
    sub: "Browse venues for every ceremony, wherever you're actually getting married.",
    benefits: [
      { icon: MapPin, title: "Every destination", body: "Browse venues wherever you're getting married, not just your home city." },
      { icon: Globe2, title: "Destination-first filtering", body: "Filtered by city, capacity, and the traditions you're planning for." },
      { icon: Star, title: "Real reviews, real photos", body: "See exactly what you're booking, rated by couples who've been there." },
    ],
  },
  budgeting: {
    headline: "Track every dollar, before it's due.",
    sub: "See exactly what's spent, what's left, and what's coming due, without a single spreadsheet.",
    benefits: [
      { icon: Wallet, title: "Real-time totals", body: "See exactly what's spent and what's left, updated the moment you log a cost." },
      { icon: Bell, title: "Payment reminders", body: "Never miss a vendor deposit or final payment again." },
      { icon: PieChart, title: "Smart breakdowns", body: "See where your money's really going, by category and by event." },
    ],
  },
  website: {
    headline: "A website that's actually you.",
    sub: "A free, beautiful site for every ceremony, live in minutes, no design skills needed.",
    benefits: [
      { icon: Palette, title: "Designed for you", body: "Pick a template, add your story, and it's live in minutes." },
      { icon: Globe2, title: "One link for everyone", body: "Share ceremony details, travel info, and RSVPs, all in one place." },
      { icon: Smartphone, title: "Looks great everywhere", body: "Beautiful on phones, tablets, and desktops, no design skills needed." },
    ],
  },
};

export const Route = createFileRoute("/features/$slug")({ component: FeaturePage });

function FeaturePage() {
  const { slug } = Route.useParams();
  const rootRef = useReveal();
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);

  const feature = SHOWCASE_FEATURES.find((f) => f.slug === slug);
  const page = FEATURE_PAGES[slug];

  if (!feature || !page) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-[#243746] px-6 text-center">
        <div>
          <p className="font-serif text-3xl">We couldn't find that page.</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm text-[#7FA8D6] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef as any} className="min-h-screen bg-white text-[#243746]">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-line/50 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo sizeClassName="text-3xl" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#243746] hover:text-[#7FA8D6] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <button onClick={() => setAuthOpen("signup")}
            className="rounded-full bg-[#243746] text-[#FFF7D6] px-5 py-2 text-sm transition-all hover:bg-[#FFE08A] hover:text-[#243746] hover:rounded-2xl">
            Start planning
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-12 md:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6" data-reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">{feature.eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl md:text-6xl leading-[0.95] tracking-tight">{page.headline}</h1>
          <p className="mt-6 text-lg text-[#243746] max-w-xl leading-relaxed">{page.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setAuthOpen("signup")}
              className="inline-flex items-center gap-2 rounded-full bg-[#FFE08A] text-[#243746] px-6 py-3 text-sm font-medium transition-all hover:bg-[#243746] hover:text-[#FFF7D6] hover:rounded-2xl hover:gap-3">
              Start planning for free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className={`lg:col-span-6 relative overflow-hidden rounded-[2.5rem] h-[360px] md:h-[440px] ${feature.tint}`} data-reveal>
          <FeatureVisual kind={feature.visual} />
        </div>
      </section>

      {/* Benefits */}
      <section className="relative px-6 md:px-12 py-16 border-t border-line/60">
        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {page.benefits.map(({ icon: Icon, title, body }) => (
            <div key={title} data-reveal>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF2B2] text-[#243746]"><Icon className="h-4 w-4" /></span>
              <h3 className="mt-4 font-serif text-xl leading-tight">{title}</h3>
              <p className="mt-2 text-sm text-[#243746] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-6 md:mx-12 mb-16 rounded-[3rem] bg-[#FFE08A] text-[#243746] py-20 px-6 md:px-12 text-center overflow-hidden" data-reveal>
        <p className="relative text-sm uppercase tracking-[0.3em] text-[#243746]">For every wedding, anywhere</p>
        <h2 className="relative mt-4 font-serif text-4xl md:text-5xl max-w-2xl mx-auto leading-[0.95]">Ready to plan it your way?</h2>
        <button onClick={() => setAuthOpen("signup")}
          className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#243746] text-[#FFF7D6] px-8 py-4 text-sm font-medium transition-all hover:bg-[#FFF7D6] hover:text-[#243746] hover:rounded-2xl hover:gap-3">
          Start planning for free <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <footer className="border-t border-line py-8 px-6 md:px-12 flex flex-wrap items-center justify-between text-sm text-muted-foreground gap-3">
        <span>© {new Date().getFullYear()} WedThread</span>
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
