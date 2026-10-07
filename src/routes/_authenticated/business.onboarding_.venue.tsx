import { createFileRoute } from "@tanstack/react-router";
import { BusinessSignupForm } from "@/components/onboarding/business-signup-form";

// Escaped filename (business.onboarding_.venue.tsx) so this registers as a
// SIBLING of /business/onboarding rather than nesting under it — that route
// has no <Outlet/>, so nesting would silently never render (the same
// TanStack Router pitfall fixed once already for the /v marketplace routes).
export const Route = createFileRoute("/_authenticated/business/onboarding_/venue")({ component: VenueOnboardingPage });

function VenueOnboardingPage() {
  return <BusinessSignupForm businessType="venue" />;
}
