import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useActiveRole } from "@/hooks/use-active-role";
import { CoupleDashboard } from "@/components/dashboards/couple-dashboard";
import { VendorDashboard } from "@/components/dashboards/vendor-dashboard";
import { VenueDashboard } from "@/components/dashboards/venue-dashboard";
import { useCurrentWedding } from "@/lib/wedding-hooks";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { active, isLoading } = useActiveRole();
  const { data: wedding } = useCurrentWedding();

  if (isLoading || !active) return <AppShell title="Loading…"><div /></AppShell>;

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
      <AppShell title="Planner workspace" subtitle="Coordinate the couples you're planning for.">
        {wedding ? <CoupleDashboard /> : <PlannerEmpty />}
      </AppShell>
    );
  }
  // couple / admin
  return (
    <AppShell title={wedding ? `${wedding.partner_a} & ${wedding.partner_b}` : "Your wedding"} subtitle={wedding?.destination_city ? `${wedding.destination_city}${wedding.destination_country ? ", " + wedding.destination_country : ""} · ${wedding.est_guest_count ?? "-"} guests estimated` : undefined}>
      <CoupleDashboard />
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
