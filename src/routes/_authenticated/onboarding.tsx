import { createFileRoute, Navigate } from "@tanstack/react-router";

// First-time setup now happens in a popup on the dashboard (see components/create-wedding-dialog.tsx).
// This address stays so old links and bookmarks still work.
export const Route = createFileRoute("/_authenticated/onboarding")({
  component: () => <Navigate to="/dashboard" replace />,
});
