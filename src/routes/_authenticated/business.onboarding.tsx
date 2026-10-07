import { createFileRoute } from "@tanstack/react-router";
import { BusinessSignupForm } from "@/components/onboarding/business-signup-form";

export const Route = createFileRoute("/_authenticated/business/onboarding")({ component: BusinessOnboardingPage });

function BusinessOnboardingPage() {
  return <BusinessSignupForm businessType="vendor" />;
}
