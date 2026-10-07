import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminAddBusinessForm } from "@/components/admin-add-business-form";

export const Route = createFileRoute("/_authenticated/admin/add-venue")({ component: AdminAddVenuePage });

function AdminAddVenuePage() {
  return (
    <AppShell title="Add a venue" subtitle="Creates an unclaimed, already-verified listing. The real owner can request to claim it later.">
      <AdminAddBusinessForm businessType="venue" />
    </AppShell>
  );
}
