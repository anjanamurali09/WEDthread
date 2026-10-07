import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VenueDirectoryContent } from "@/routes/venue";

export const Route = createFileRoute("/_authenticated/business/browse-venues")({ component: BrowseVenuesPage });

// Same filter/grid as the public /venue marketplace — reused directly
// (VenueDirectoryContent), not duplicated — just embedded inside the app
// shell so the sidebar stays put instead of navigating out to the bare
// public page. Same pattern as business.browse-vendors.tsx.
function BrowseVenuesPage() {
  return (
    <AppShell title="Browse venues" subtitle="The same marketplace couples search.">
      <VenueDirectoryContent embedded />
    </AppShell>
  );
}
