import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired: a vendor now has one listing per business (categories replace
// separate named services), so there's no more per-service detail page —
// the business's own page (src/routes/v_.$businessId.tsx) covers it. This
// redirect keeps any old bookmarked/indexed /v/$businessId/$serviceId links
// working instead of 404ing.
export const Route = createFileRoute("/v_/$businessId_/$serviceId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: `/v/${params.businessId}` as any });
  },
});
