import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminAddBusinessForm } from "@/components/admin-add-business-form";

export const Route = createFileRoute("/_authenticated/admin/add-vendor")({ component: AdminAddVendorPage });

function AdminAddVendorPage() {
  return (
    <AppShell title="Add a vendor" subtitle="Creates an unclaimed, already-verified listing. The real owner can request to claim it later.">
      <AdminAddBusinessForm businessType="vendor" />
    </AppShell>
  );
}
