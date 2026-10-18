import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VenueDirectoryContent } from "@/routes/venue";

export const Route = createFileRoute("/_authenticated/business/browse-venues")({ component: BrowseVenuesPage });

// The full venue marketplace, exactly as it looks before signing in (banner, quiz, style rows, filters), reused
// directly rather than copied, inside the app shell so the sidebar stays put.
function BrowseVenuesPage() {
  return (
    <AppShell>
      <VenueDirectoryContent bare />
    </AppShell>
  );
}
