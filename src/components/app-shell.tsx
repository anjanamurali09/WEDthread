import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { Chair } from "@/components/chair-icon";
import { GuidedTour, findTourTarget } from "@/components/guided-tour";
import { WELCOME_TOUR, PAGE_TOURS, hasSeenTour, markTourSeen, type Tour } from "@/lib/tours";
import { useCurrentWedding, useSignOut } from "@/lib/wedding-hooks";
import { useIntegrationAutoSync } from "@/lib/integrations";
import { CalendarDays, LayoutDashboard, Users, MessageCircle, Globe, LogOut, Store, MapPin, Gift, ChevronDown, Plus, Inbox, ListChecks, Utensils, Wallet, PanelLeftClose, PanelLeftOpen, Compass, Settings, NotebookPen, Star, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useActiveRole, type AppRole } from "@/hooks/use-active-role";
import { AddRoleDialog } from "@/components/add-role-dialog";
import { CreateWeddingDialog } from "@/components/create-wedding-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";

export const SIDEBAR_COLLAPSED_KEY = "wedthread_sidebar_collapsed";

const ROLE_LABEL: Record<AppRole, string> = {
  couple: "Couple", planner: "Planner", venue: "Venue", vendor: "Vendor", seller: "Seller", admin: "Admin",
};

const ROLE_LANDING_MAP: Record<AppRole, string> = {
  couple: "/dashboard", planner: "/dashboard", venue: "/business/dashboard", vendor: "/business/dashboard", seller: "/vendors", admin: "/dashboard",
};

const SETTINGS_PATH: Record<AppRole, string> = {
  couple: "/settings/profile", planner: "/settings/profile",
  venue: "/workspace-settings", vendor: "/workspace-settings", seller: "/workspace-settings", admin: "/workspace-settings",
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
    { to: "/seating", label: "Seating", icon: Chair },
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
    { to: "/seating", label: "Seating", icon: Chair },
    { to: "/menu", label: "Menu", icon: Utensils },
    { to: "/budget", label: "Budget", icon: Wallet },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/notes", label: "Notes", icon: NotebookPen },
  ],
  vendor: [
    { to: "/business/browse-vendors", label: "Browse vendors", icon: Search },
    { to: "/business/dashboard", label: "My listing", icon: Store },
    { to: "/business/messages", label: "Enquiries", icon: Inbox },
  ],
  venue: [
    { to: "/business/browse-venues", label: "Browse venues", icon: Search },
    { to: "/business/dashboard", label: "My venue", icon: MapPin },
    { to: "/business/messages", label: "Enquiries", icon: Inbox },
  ],
  seller: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  ],
  admin: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/vendors", label: "Review vendors", icon: ShieldCheck },
    { to: "/admin/venues", label: "Review venues", icon: ShieldCheck },
    { to: "/admin/claims", label: "Business claims", icon: ShieldCheck },
    { to: "/admin/suggestions", label: "Suggested changes", icon: ShieldCheck },
    { to: "/admin/add-vendor", label: "Add a vendor", icon: Plus },
    { to: "/admin/add-venue", label: "Add a venue", icon: Plus },
  ],
};

// Points at the new businesses/vendor_services/venue_details marketplace
// (the same one vendors/venues themselves manage), not the older, separate
// vendors/venues tables — a couple browsing here needs to actually see
// what's been added through the current onboarding/admin-add flow.
const discover = [
  { to: "/business/browse-venues", label: "Venues", icon: MapPin },
  { to: "/business/browse-vendors", label: "Vendors", icon: Store },
] as const;

export function AppShell({ children, title, subtitle, actions, decor }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode; decor?: ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const { active } = useActiveRole();
  const nav = NAV_BY_ROLE[active ?? "couple"] ?? NAV_BY_ROLE.couple;
  const showDiscover = !active || active === "couple" || active === "planner";
  const { data: wedding, isLoading: weddingLoading, isError: weddingError } = useCurrentWedding();
  useIntegrationAutoSync(wedding?.id);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Guided tours (see lib/tours.ts): the welcome tour on the overview and a short one for each page, each shown the
  // first time it is opened, and replayable from the Tour button. Only for couples and planners.
  const tourEnabled = active === "couple" || active === "planner";
  const [tour, setTour] = useState<Tour | null>(null);
  const tourFor = (): Tour | null => (pathname === "/dashboard" ? WELCOME_TOUR : PAGE_TOURS[pathname] ?? null);
  const startTour = (force: boolean) => {
    const def = tourFor() ?? (force ? WELCOME_TOUR : null);
    if (!def || (!force && hasSeenTour(def.id))) return false;
    const steps = def.steps.filter((st) => !st.target || findTourTarget(st.target));
    if (steps.length === 0) return false;
    setTour({ id: def.id, steps });
    return true;
  };
  useEffect(() => {
    if (!tourEnabled || weddingLoading || !wedding) return;
    const def = tourFor();
    if (!def || hasSeenTour(def.id)) return;
    // The page may still be loading its content, so look again a few times before giving up.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const present = def.steps.filter((st) => !st.target || findTourTarget(st.target)).length;
      if (present === def.steps.length || tries >= 8) { window.clearInterval(timer); startTour(false); }
    }, 700);
    return () => window.clearInterval(timer);
  }, [pathname, tourEnabled, weddingLoading, wedding?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [prefCollapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  // On narrow screens the sidebar stays on screen as the icon rail, whatever the saved preference.
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const collapsed = prefCollapsed || narrow;
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
        "relative z-10 flex shrink-0 flex-col border-r border-line/60 bg-pearl/70 backdrop-blur-sm sticky top-0 h-screen transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64 lg:w-72",
      )}>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:grid absolute -right-3 top-9 z-20 grid h-6 w-6 place-items-center rounded-full border border-line bg-paper text-muted-foreground shadow-sm hover:text-cherry hover:border-cherry cursor-pointer"
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
              <Link key={to} to={to as any} data-static data-tour={`nav-${to.replace(/\//g, "-")}`} title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${collapsed ? "justify-center px-0" : ""} ${
                  isActive
                    ? "bg-wine text-cream font-medium shadow-md"
                    : "text-ink hover:bg-blush-soft/70 hover:text-cherry"
                }`}>
                <Icon className="h-4 w-4 shrink-0" /> {!collapsed && label}
              </Link>
            );
          })}
          {showDiscover && (<>
          {!collapsed && <p className="mt-6 px-3 pb-2 text-sm uppercase tracking-widest text-cherry">Discover</p>}
          <div data-tour="discover">
          {discover.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to as any} data-static title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all ${collapsed ? "justify-center px-0" : ""} ${
                  isActive
                    ? "bg-wine text-cream font-medium shadow-md"
                    : "text-ink hover:bg-blush-soft/70 hover:text-cherry"
                }`}>
                <Icon className="h-4 w-4 shrink-0" /> {!collapsed && label}
              </Link>
            );
          })}
          </div>
          </>)}
        </nav>
        <div className="p-3 border-t border-line/60">
          {active && (
            <Link to={SETTINGS_PATH[active] as any} data-static data-tour="nav-settings" title={collapsed ? "Settings" : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all mb-1 ${collapsed ? "justify-center px-0" : ""} ${
                pathname === SETTINGS_PATH[active] || pathname.startsWith(SETTINGS_PATH[active] + "/")
                  ? "bg-cherry text-pearl font-medium shadow-md"
                  : "text-ink hover:bg-blush-soft/70 hover:text-cherry"
              }`}>
              <Settings className="h-4 w-4 shrink-0" /> {!collapsed && "Settings"}
            </Link>
          )}
          {tourEnabled && (
            <button data-static onClick={() => startTour(true)} title={collapsed ? "Tour" : "Replay the tour for this page"}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm mb-1 transition-all cursor-pointer ${collapsed ? "justify-center px-0" : ""} text-ink hover:bg-blush-soft/70 hover:text-cherry`}>
              <Compass className="h-4 w-4 shrink-0" /> {!collapsed && "Tour"}
            </button>
          )}
          {(active === "couple" || active === "planner") && (
            <button data-static onClick={() => setFeedbackOpen(true)} title={collapsed ? "Feedback" : undefined}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm mb-1 transition-all cursor-pointer ${collapsed ? "justify-center px-0" : ""} text-ink hover:bg-blush-soft/70 hover:text-cherry`}>
              <Star className="h-4 w-4 shrink-0" /> {!collapsed && "Feedback"}
            </button>
          )}
          <button data-static onClick={onSignOut} title={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-ink hover:bg-wine-soft hover:text-wine transition-all ${collapsed ? "justify-center px-0" : ""}`}>
            <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {active === "couple" && !weddingLoading && !weddingError && !wedding && <CreateWeddingDialog />}

      {feedbackOpen && <FeedbackDialog weddingId={wedding?.id} onClose={() => setFeedbackOpen(false)} />}

      <main className="relative z-10 flex-1 min-w-0 self-start">
        {/* self-start: without it, flexbox's default align-items:stretch forces this to
            always match the sidebar's h-screen height, no matter how little content a
            given page actually has — a short page (few events, an empty state) was always
            rendering with a tall empty gap below its real content, not because of anything
            that page itself did. The sidebar sets its own h-screen directly, so it doesn't
            depend on stretch from here and is unaffected by this change. */}
        {(title || actions) && (
          <header className="px-4 md:px-10 pt-8 md:pt-12 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h1 data-tour="page-title" className="font-serif text-3xl md:text-5xl text-ink leading-[0.95]">{title}</h1>}
            </div>
            {actions}
          </header>
        )}

        <div data-tour="page-body" className="px-4 md:px-10 pb-16">{children}</div>
        {tour && <GuidedTour steps={tour.steps} onClose={() => { markTourSeen(tour.id); setTour(null); }} />}
      </main>
    </div>
  );
}
