import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useSignOut } from "@/lib/wedding-hooks";
import { CalendarDays, LayoutDashboard, Users, Grid3x3, MessageCircle, Globe, LogOut, Store, MapPin, Sparkles, Gift } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/guests", label: "Guests", icon: Users },
  { to: "/seating", label: "Seating", icon: Grid3x3 },
  { to: "/registry", label: "Registry", icon: Gift },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/website", label: "Website", icon: Globe },
] as const;

const discover = [
  { to: "/venues", label: "Venues", icon: MapPin },
  { to: "/vendors", label: "Vendors", icon: Store },
] as const;

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();
  const signOut = useSignOut();

  const onSignOut = async () => {
    await signOut.mutateAsync();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-line bg-paper sticky top-0 h-screen">
        <div className="px-6 pt-8 pb-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
            <span className="font-serif text-2xl tracking-tight">Vowzy</span>
          </Link>
        </div>
        <nav className="px-3 flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Planning</p>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-stone text-ink font-medium" : "text-ink/70 hover:bg-stone/60"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
          <p className="mt-6 px-3 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Discover</p>
          {discover.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-stone text-ink font-medium" : "text-ink/70 hover:bg-stone/60"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink/70 hover:bg-stone/60">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Top mobile bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-3.5 w-3.5" /></span>
            <span className="font-serif text-xl">Vowzy</span>
          </Link>
          <button onClick={onSignOut} className="text-xs text-muted-foreground">Sign out</button>
        </div>

        {(title || actions) && (
          <header className="px-4 md:px-10 pt-8 md:pt-12 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h1 className="font-serif text-3xl md:text-5xl text-ink">{title}</h1>}
              {subtitle && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
            </div>
            {actions}
          </header>
        )}

        <div className="px-4 md:px-10 pb-16">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-line bg-paper flex justify-around py-2">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${active ? "text-clay" : "text-ink/60"}`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="md:hidden h-16" />
      </main>
    </div>
  );
}
