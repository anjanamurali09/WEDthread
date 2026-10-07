import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminBusinessReview } from "@/components/admin-business-review";

const TABS = ["pending", "approved", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/admin/venues")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: TABS.includes(s.tab as any) ? (s.tab as (typeof TABS)[number]) : undefined,
  }),
  component: AdminVenuesPage,
});

function AdminVenuesPage() {
  const { tab } = Route.useSearch();
  return (
    <AppShell title="Review venues" subtitle="Venue profiles waiting on verification — approve or reject.">
      <AdminBusinessReview businessType="venue" defaultTab={tab} />
    </AppShell>
  );
}
