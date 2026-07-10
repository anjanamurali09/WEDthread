import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useSignOut } from "@/lib/wedding-hooks";
import { CalendarDays, LayoutDashboard, Users, Grid3x3, MessageCircle, Globe, LogOut, Store, MapPin, Sparkles, Gift, ChevronDown, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useActiveRole, type AppRole } from "@/hooks/use-active-role";
import { AddRoleDialog } from "@/components/add-role-dialog";

const ROLE_LABEL: Record<AppRole, string> = {
  couple: "Couple", planner: "Planner", venue: "Venue", vendor: "Vendor", seller: "Seller", admin: "Admin",
};

const ROLE_LANDING_MAP: Record<AppRole, string> = {
  couple: "/dashboard", planner: "/dashboard", venue: "/vendors", vendor: "/vendors", seller: "/vendors", admin: "/dashboard",
};

function WorkspaceSwitcher() {
  const { active, roles, setActive } = useActiveRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  if (!active) return null;
  const others = roles.filter((r) => r !== active);
  return (
    <div className="relative mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-2xl border border-line/70 bg-paper px-3 py-2 text-left text-sm hover:border-cherry transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</p>
          <p className="font-serif text-base truncate">{ROLE_LABEL[active]}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl border border-line bg-pearl shadow-lg overflow-hidden">
          {others.map((r) => (
            <button
              key={r}
              onClick={() => { setActive(r); setOpen(false); router.navigate({ to: ROLE_LANDING_MAP[r] as any }); }}
              className="w-full px-3 py-2.5 text-sm text-left hover:bg-blush-soft flex items-center justify-between"
            >
              <span>{ROLE_LABEL[r]}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Switch</span>
            </button>
          ))}
          {others.length > 0 && <div className="h-px bg-line/70" />}
          <button
            onClick={() => { setOpen(false); setAddOpen(true); }}
            className="w-full px-3 py-2.5 text-sm text-cherry hover:bg-blush-soft flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add another role
          </button>
        </div>
      )}
      <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}



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

export function AppShell({ children, title, subtitle, actions, decor }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode; decor?: ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();
  const signOut = useSignOut();

  const onSignOut = async () => {
    await signOut.mutateAsync();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-pearl text-ink flex relative overflow-hidden">
      {/* Ambient decorations — page can override via `decor` prop */}
      {decor ?? (
        <>
          <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 h-[420px] w-[420px] blob bg-blush-soft/60 animate-float-slow" />
          <div aria-hidden className="pointer-events-none fixed top-[40%] -right-56 h-[500px] w-[500px] blob-2 bg-sage-soft/50 animate-float-slow" style={{ animationDelay: "-3s" }} />
          <div aria-hidden className="pointer-events-none fixed bottom-[-200px] left-[10%] h-[360px] w-[360px] blob bg-wine-soft/50 animate-float-slow" style={{ animationDelay: "-6s" }} />
        </>
      )}


      {/* Sidebar */}
      <aside className="relative z-10 hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-line/60 bg-pearl/70 backdrop-blur-sm sticky top-0 h-screen">
        <div className="px-6 pt-8 pb-6">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cherry text-pearl transition-all group-hover:rotate-12 group-hover:bg-wine"><Sparkles className="h-4 w-4" /></span>
            <span className="font-serif text-2xl tracking-tight">Vowzy</span>
          </Link>
          <WorkspaceSwitcher />
        </div>
        <nav className="px-3 flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] uppercase tracking-widest text-cherry">Planning</p>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-cherry text-pearl font-medium shadow-md"
                    : "text-ink/70 hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1"
                }`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
          <p className="mt-6 px-3 pb-2 text-[11px] uppercase tracking-widest text-cherry">Discover</p>
          {discover.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-cherry text-pearl font-medium shadow-md"
                    : "text-ink/70 hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1"
                }`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line/60">
          <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-ink/70 hover:bg-wine-soft hover:text-wine transition-all">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 min-w-0">
        {/* Top mobile bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line/60 bg-pearl/70 backdrop-blur-sm">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-cherry text-pearl"><Sparkles className="h-3.5 w-3.5" /></span>
            <span className="font-serif text-xl">Vowzy</span>
          </Link>
          <button onClick={onSignOut} className="text-xs text-cherry">Sign out</button>
        </div>

        {(title || actions) && (
          <header className="px-4 md:px-10 pt-8 md:pt-12 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && (
                <>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-cherry inline-flex items-center gap-2 mb-2">
                    <span className="h-px w-8 bg-cherry" /> Vowzy
                  </p>
                  <h1 className="font-serif text-3xl md:text-5xl text-ink leading-[0.95]">{title}</h1>
                </>
              )}
              {subtitle && <p className="mt-3 text-sm text-ink/70 max-w-2xl">{subtitle}</p>}
            </div>
            {actions}
          </header>
        )}

        <div className="px-4 md:px-10 pb-16">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-line/60 bg-pearl/95 backdrop-blur-sm flex justify-around py-2 z-20">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${active ? "text-cherry" : "text-ink/60 hover:text-cherry"}`}>
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
