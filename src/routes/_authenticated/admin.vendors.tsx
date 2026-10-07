import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminBusinessReview } from "@/components/admin-business-review";

const TABS = ["pending", "approved", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/admin/vendors")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: TABS.includes(s.tab as any) ? (s.tab as (typeof TABS)[number]) : undefined,
  }),
  component: AdminVendorsPage,
});

function AdminVendorsPage() {
  const { tab } = Route.useSearch();
  return (
    <AppShell title="Review vendors" subtitle="Vendor profiles waiting on verification — approve or reject.">
      <AdminBusinessReview businessType="vendor" defaultTab={tab} />
    </AppShell>
  );
}
