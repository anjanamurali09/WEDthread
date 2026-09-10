import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useCurrentWedding, useSignOut } from "@/lib/wedding-hooks";
import { CalendarDays, LayoutDashboard, Users, Armchair, MessageCircle, Globe, LogOut, Store, MapPin, Gift, ChevronDown, Plus, Inbox, ListChecks, Utensils, Wallet, PanelLeftClose, PanelLeftOpen, Settings, NotebookPen, Star } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useActiveRole, type AppRole } from "@/hooks/use-active-role";
import { AddRoleDialog } from "@/components/add-role-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";

export const SIDEBAR_COLLAPSED_KEY = "wedthread_sidebar_collapsed";

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
    <div className="relative mt-3">
      <p className="px-3 pb-2 text-sm uppercase tracking-widest text-cherry">Workspace</p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-full bg-cream px-4 py-2.5 text-left text-sm text-ink hover:bg-cream-hover hover:text-cherry transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">{ROLE_LABEL[active]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl border border-line bg-pearl shadow-lg overflow-hidden p-2">
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current workspace</p>
            <p className="font-sans font-medium text-lg truncate">{ROLE_LABEL[active]}</p>
          </div>
          <div className="h-px bg-line/70 mx-2 my-1" />
          {others.map((r) => (
            <button
              key={r}
              onClick={() => { setActive(r); setOpen(false); router.navigate({ to: ROLE_LANDING_MAP[r] as any }); }}
              className="w-full px-3 py-2.5 text-sm text-left rounded-xl hover:bg-blush-soft flex items-center justify-between"
            >
              <span>{ROLE_LABEL[r]}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Switch</span>
            </button>
          ))}
          {others.length > 0 && <div className="h-px bg-line/70 mx-2 my-1" />}
          <button
            onClick={() => { setOpen(false); setAddOpen(true); }}
            className="w-full mx-auto max-w-[calc(100%-8px)] px-3 py-2.5 text-sm text-cherry rounded-xl hover:bg-blush-soft flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add another role
          </button>
        </div>
      )}
      <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}



const NAV_BY_ROLE: Record<AppRole, ReadonlyArray<{ to: string; label: string; icon: any }>> = {
  couple: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/events", label: "Events", icon: CalendarDays },
    { to: "/guests", label: "Guests", icon: Users },
    { to: "/rsvp-questions", label: "RSVP", icon: ListChecks },
    { to: "/seating", label: "Seating", icon: Armchair },
    { to: "/menu", label: "Menu", icon: Utensils },
    { to: "/registry", label: "Registry", icon: Gift },
    { to: "/budget", label: "Budget", icon: Wallet },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/website", label: "Website", icon: Globe },
    { to: "/notes", label: "Notes", icon: NotebookPen },
  ],
  planner: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/events", label: "Events", icon: CalendarDays },
    { to: "/guests", label: "Guests", icon: Users },
    { to: "/rsvp-questions", label: "RSVP", icon: ListChecks },
    { to: "/seating", label: "Seating", icon: Armchair },
    { to: "/menu", label: "Menu", icon: Utensils },
    { to: "/budget", label: "Budget", icon: Wallet },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/notes", label: "Notes", icon: NotebookPen },
  ],
  vendor: [
    { to: "/dashboard", label: "My listing", icon: Store },
    { to: "/leads", label: "Leads", icon: Inbox },
  ],
  venue: [
    { to: "/dashboard", label: "My venue", icon: MapPin },
    { to: "/leads", label: "Leads", icon: Inbox },
  ],
  seller: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  ],
  admin: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  ],
};

const discover = [
  { to: "/venues", label: "Venues", icon: MapPin },
  { to: "/vendors", label: "Vendors", icon: Store },
] as const;

export function AppShell({ children, title, subtitle, actions, decor }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode; decor?: ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const { active } = useActiveRole();
  const nav = NAV_BY_ROLE[active ?? "couple"] ?? NAV_BY_ROLE.couple;
  const showDiscover = !active || active === "couple" || active === "planner";
  const { data: wedding } = useCurrentWedding();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((prev) => {
    const next = !prev;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch {}
    return next;
  });

  const onSignOut = async () => {
    await signOut.mutateAsync();
    router.navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-pearl text-ink flex relative">
      {/* Ambient decorations — page can override via `decor` prop; default is none. */}
      {decor}


      {/* Sidebar */}
      <aside className={cn(
        "relative z-10 hidden md:flex shrink-0 flex-col border-r border-line/60 bg-pearl/70 backdrop-blur-sm sticky top-0 h-screen transition-[width] duration-300 ease-in-out",
        collapsed ? "md:w-[72px]" : "md:w-64 lg:w-72",
      )}>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-9 z-20 grid h-6 w-6 place-items-center rounded-full border border-line bg-paper text-muted-foreground shadow-sm hover:text-cherry hover:border-cherry cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>

        <div className={cn("pt-8 pb-4", collapsed ? "px-3" : "px-6")}>
          <Link to="/dashboard" data-static
            className={cn("inline-flex items-center gap-2 select-none", collapsed ? "justify-center w-full" : "")} draggable={false} style={{ WebkitUserDrag: "none" } as any}>
            {collapsed ? <LogoMark /> : <Logo />}
          </Link>
        </div>
        {/* Same px-3 indent as <nav> below, so the Workspace label/pill align flush with Menu/Overview. */}
        {!collapsed && <div className="px-3"><WorkspaceSwitcher /></div>}
        <nav className="px-3 flex-1 overflow-y-auto scroll-fade-b pb-4">
          {!collapsed && <p className="mt-6 px-3 pb-2 text-sm uppercase tracking-widest text-cherry">Menu</p>}
          {nav.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to as any} title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${collapsed ? "justify-center px-0" : ""} ${
                  isActive
                    ? "bg-wine text-cream font-medium shadow-md"
                    : "text-ink hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1"
                }`}>
                <Icon className="h-4 w-4 shrink-0" /> {!collapsed && label}
              </Link>
            );
          })}
          {showDiscover && (<>
          {!collapsed && <p className="mt-6 px-3 pb-2 text-sm uppercase tracking-widest text-cherry">Discover</p>}
          {discover.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to as any} title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${collapsed ? "justify-center px-0" : ""} ${
                  isActive
                    ? "bg-wine text-cream font-medium shadow-md"
                    : "text-ink hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1"
                }`}>
                <Icon className="h-4 w-4 shrink-0" /> {!collapsed && label}
              </Link>
            );
          })}
          </>)}
        </nav>
        <div className="p-3 border-t border-line/60">
          {(active === "couple" || active === "planner") && (
            <Link to="/settings/profile" title={collapsed ? "Settings" : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all mb-1 ${collapsed ? "justify-center px-0" : ""} ${
                pathname === "/settings/profile" || pathname.startsWith("/settings/profile/")
                  ? "bg-cherry text-pearl font-medium shadow-md"
                  : "text-ink hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1"
              }`}>
              <Settings className="h-4 w-4 shrink-0" /> {!collapsed && "Settings"}
            </Link>
          )}
          {(active === "couple" || active === "planner") && (
            <button onClick={() => setFeedbackOpen(true)} title={collapsed ? "Feedback" : undefined}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm mb-1 transition-all cursor-pointer ${collapsed ? "justify-center px-0" : ""} text-ink hover:bg-blush-soft/70 hover:text-cherry hover:translate-x-1`}>
              <Star className="h-4 w-4 shrink-0" /> {!collapsed && "Feedback"}
            </button>
          )}
          <button onClick={onSignOut} title={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-ink hover:bg-wine-soft hover:text-wine transition-all ${collapsed ? "justify-center px-0" : ""}`}>
            <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {feedbackOpen && <FeedbackDialog weddingId={wedding?.id} onClose={() => setFeedbackOpen(false)} />}

      <main className="relative z-10 flex-1 min-w-0">
        {/* Top mobile bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line/60 bg-pearl/70 backdrop-blur-sm">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo sizeClassName="text-xl" />
          </Link>
          <button onClick={onSignOut} className="text-sm text-cherry">Sign out</button>
        </div>

        {(title || actions) && (
          <header className="px-4 md:px-10 pt-8 md:pt-12 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h1 className="font-serif text-3xl md:text-5xl text-ink leading-[0.95]">{title}</h1>}
              {subtitle && <p className="mt-3 text-sm text-ink max-w-2xl">{subtitle}</p>}
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
              <Link key={to} to={to as any} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${active ? "text-cherry" : "text-ink hover:text-cherry"}`}>
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
