import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route: role selection is now post-signup. Any /auth/<role> URL
// (including old bookmarks) redirects to the consolidated /auth page.
export const Route = createFileRoute("/auth/$role")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
