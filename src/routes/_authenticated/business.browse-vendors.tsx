import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VendorDirectoryContent } from "@/routes/v";

export const Route = createFileRoute("/_authenticated/business/browse-vendors")({ component: BrowseVendorsPage });

// Same filter/grid as the public /v marketplace — reused directly
// (VendorDirectoryContent), not duplicated — just embedded inside the app
// shell so the sidebar stays put. Cards link straight to the real public
// listing page (/v/$businessId), same as business.browse-venues.tsx does
// for venues — no separate inline detail view.
function BrowseVendorsPage() {
  return (
    <AppShell title="Browse vendors" subtitle="The same marketplace couples search. See how your own listing shows up alongside everyone else's.">
      <VendorDirectoryContent embedded />
    </AppShell>
  );
}
