import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminAddBusinessForm } from "@/components/admin-add-business-form";
import { ArrowLeft } from "lucide-react";

// Escaped filename so this is a sibling of /admin/add-vendor, not nested
// under it (same convention used throughout — that route has no <Outlet/>).
export const Route = createFileRoute("/_authenticated/admin/add-vendor_/$businessId")({ component: AdminEditVendorPage });

function AdminEditVendorPage() {
  const { businessId } = Route.useParams();
  const router = useRouter();
  return (
    <AppShell title="Edit vendor" subtitle="Only available for unclaimed listings — once claimed, the owner manages their own info."
      actions={
        <button type="button" onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-clay hover:text-wine cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      }>
      <AdminAddBusinessForm businessType="vendor" editBusinessId={businessId} />
    </AppShell>
  );
}
