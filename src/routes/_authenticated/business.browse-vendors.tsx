import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VendorDirectoryContent } from "@/routes/v";

export const Route = createFileRoute("/_authenticated/business/browse-vendors")({
  // ?group=photographers (from the icon row) opens the page filtered to that kind of vendor, as on the public page.
  validateSearch: (s: Record<string, unknown>): { group?: string } => ({ ...(typeof s.group === "string" ? { group: s.group } : {}) }),
  component: BrowseVendorsPage,
});

// The full vendor marketplace, exactly as it looks before signing in (banner, quiz, type rows, filters), reused
// directly rather than copied, inside the app shell so the sidebar stays put. Cards link to the real public listing page.
function BrowseVendorsPage() {
  return (
    <AppShell>
      <VendorDirectoryContent bare />
    </AppShell>
  );
}
