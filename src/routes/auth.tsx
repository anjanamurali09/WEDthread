import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, HeartHandshake, Building2, Store, ShoppingBag, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join Vowzy" },
      { name: "description", content: "Sign in as a couple, planner, venue, vendor, or marketplace seller." },
    ],
  }),
  component: AuthHub,
});

const SIGNUP = [
  { role: "couple", label: "Getting married", desc: "Plan your ceremonies, guests, seating, and website.", icon: HeartHandshake },
  { role: "venue", label: "List a venue", desc: "Reach couples planning a destination wedding.", icon: Building2 },
  { role: "vendor", label: "List services", desc: "Photographers, planners, mehendi artists, florists.", icon: Store },
  { role: "seller", label: "Sell leftover items", desc: "Resell décor, dresses, tableware after your day.", icon: ShoppingBag },
] as const;

const LOGIN = [
  { role: "couple", label: "Couple", icon: HeartHandshake },
  { role: "planner", label: "Planner", icon: ClipboardList },
  { role: "venue", label: "Venue", icon: Building2 },
  { role: "vendor", label: "Vendor", icon: Store },
] as const;

function AuthHub() {
  return (
    <div className="min-h-screen bg-pearl text-ink">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-wine text-pearl"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-2xl">Vowzy</span>
        </Link>

        <div className="mt-14 grid md:grid-cols-2 gap-10">
          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cherry">New to Vowzy</p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl leading-[1.05]">Create an account</h1>
            <p className="mt-3 text-sm text-muted-foreground">Choose how you'll use Vowzy. You can add more later.</p>
            <div className="mt-6 space-y-3">
              {SIGNUP.map(({ role, label, desc, icon: Icon }) => (
                <Link key={role} to="/auth/$role" params={{ role }} search={{ mode: "signup" }}
                  className="flex items-start gap-4 rounded-3xl border border-line bg-paper p-5 hover:border-wine transition">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-wine-soft text-wine"><Icon className="h-5 w-5" /></span>
                  <div>
                    <p className="font-serif text-xl">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cherry">Returning</p>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl leading-[1.05]">Log in</h2>
            <p className="mt-3 text-sm text-muted-foreground">Pick the account you already have.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {LOGIN.map(({ role, label, icon: Icon }) => (
                <Link key={role} to="/auth/$role" params={{ role }} search={{ mode: "signin" }}
                  className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-paper p-5 hover:border-wine transition">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cream text-wine"><Icon className="h-4 w-4" /></span>
                  <div>
                    <p className="font-serif text-lg">{label}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">Log in</p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-8 text-xs text-muted-foreground">Buying from the marketplace or browsing vendors doesn't need an account.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
