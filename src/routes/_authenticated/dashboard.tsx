import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useActiveRole } from "@/hooks/use-active-role";
import { CoupleDashboard } from "@/components/dashboards/couple-dashboard";
import { VendorDashboard } from "@/components/dashboards/vendor-dashboard";
import { VenueDashboard } from "@/components/dashboards/venue-dashboard";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { formatNumber } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const COMPACT_VIEW_KEY = "wedthread_dashboard_compact";

function Dashboard() {
  const { active, isLoading } = useActiveRole();
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();

  // Owned here (not inside CoupleDashboard) so the toggle button can render
  // in AppShell's `actions` slot — the same header row as the title/subtitle
  // — rather than floating lower down inside the page body.
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem(COMPACT_VIEW_KEY) === "1"; } catch { return false; }
  });
  const toggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      try { localStorage.setItem(COMPACT_VIEW_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const compactToggle = (
    <button
      type="button"
      onClick={toggleCompact}
      className="text-xs font-medium text-muted-foreground hover:text-ink border border-line rounded-full px-3 py-1 transition-colors cursor-pointer whitespace-nowrap"
    >
      {compact ? "Mindmap view" : "Compact view"}
    </button>
  );

  if (isLoading || !active || weddingLoading) return <AppShell title="Loading…"><div /></AppShell>;

  if (active === "vendor") {
    return <AppShell title="Vendor workspace" subtitle="Your listing, your leads, and your bookings."><VendorDashboard /></AppShell>;
  }
  if (active === "venue") {
    return <AppShell title="Venue workspace" subtitle="Your listing, your leads, and your bookings."><VenueDashboard /></AppShell>;
  }
  if (active === "seller") {
    return <AppShell title="Seller workspace" subtitle="Your marketplace listings."><SellerPlaceholder /></AppShell>;
  }
  if (active === "planner") {
    return (
      <AppShell title="Planner workspace" subtitle="Coordinate the couples you're planning for." actions={wedding ? compactToggle : undefined}>
        {wedding ? <CoupleDashboard compact={compact} /> : <PlannerEmpty />}
      </AppShell>
    );
  }
  // couple / admin
  return (
    <AppShell
      title={wedding ? `${wedding.partner_a} & ${wedding.partner_b}` : "Your wedding"}
      subtitle={wedding?.destination_city ? `${wedding.destination_city}${wedding.destination_country ? ", " + wedding.destination_country : ""} · ${wedding.est_guest_count != null ? formatNumber(wedding.est_guest_count) : "-"} guests estimated` : undefined}
      actions={compactToggle}
    >
      <CoupleDashboard compact={compact} />
    </AppShell>
  );
}

function SellerPlaceholder() {
  return (
    <div className="rounded-3xl border border-dashed border-line p-16 text-center">
      <h3 className="font-serif text-2xl">Marketplace coming online</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">Resell décor, dresses, tableware and more after your wedding. We're onboarding sellers now.</p>
    </div>
  );
}

function PlannerEmpty() {
  return (
    <div className="rounded-3xl border border-dashed border-line p-16 text-center">
      <h3 className="font-serif text-2xl">No couples yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">Invite a couple to collaborate and their wedding will appear here.</p>
    </div>
  );
}
