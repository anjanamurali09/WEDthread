import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRole, removeRoleForCurrentUser } from "@/hooks/use-active-role";
import { DeleteWorkspaceDialog } from "@/components/delete-workspace-dialog";
import { toast } from "@/lib/toast";
import { ShieldCheck, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace-settings")({ component: WorkspaceSettingsPage });

// Vendor/venue/admin's equivalent of /settings/profile — couple/planner
// already have that page (wedding-scoped), so this one only ever handles
// the roles that page doesn't cover. "Delete this workspace" removes
// whatever data actually makes the workspace exist: the businesses row for
// vendor/venue (the role itself stays, so re-onboarding under the same role
// just works), or the role row itself for admin (which has no separate data
// layer — the role IS the workspace).
function WorkspaceSettingsPage() {
  const { active, roles } = useActiveRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (active === "couple" || active === "planner") navigate({ to: "/settings/profile" as any, replace: true });
  }, [active, navigate]);

  if (active === "vendor" || active === "venue") return <BusinessWorkspaceSettings businessType={active} />;
  if (active === "admin") return <AdminWorkspaceSettings roleCount={roles.length} />;

  return (
    <AppShell title="Settings" subtitle="Nothing to configure for this workspace yet.">
      <div />
    </AppShell>
  );
}

type Business = { id: string; legal_business_name: string; verification_status: "pending" | "verified" | "rejected" };

function BusinessWorkspaceSettings({ businessType }: { businessType: "vendor" | "venue" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("businesses").select("id,legal_business_name,verification_status")
        .eq("user_id", u.user.id).eq("business_type", businessType).maybeSingle();
      setBusiness(data as Business | null);
      setLoading(false);
    })();
  }, [businessType]);

  const deleteWorkspace = async () => {
    if (!business) return;
    const { error } = await supabase.from("businesses").delete().eq("id", business.id);
    if (error) { toast.error(error.message); return; }
    setConfirmOpen(false);
    toast.success(`${businessType === "venue" ? "Venue" : "Vendor"} listing deleted.`);
    qc.invalidateQueries({ queryKey: ["my-roles"] });
    navigate({ to: "/dashboard" as any });
  };

  const label = businessType === "venue" ? "venue" : "vendor";

  return (
    <AppShell title="Settings" subtitle={`Manage your ${label} workspace.`}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !business ? (
        <p className="text-sm text-muted-foreground">No business profile found yet. Nothing to configure until you've set one up.</p>
      ) : (
        <div className="max-w-xl grid gap-6">
          <div className="paper-card p-8">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Business</p>
            <h2 className="font-serif text-2xl mt-1">{business.legal_business_name}</h2>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm ${
              business.verification_status === "verified" ? "bg-sage-soft text-ink"
                : business.verification_status === "rejected" ? "bg-wine-soft text-wine" : "bg-blush-soft text-cherry"
            }`}>
              {business.verification_status === "verified" ? <CheckCircle2 className="h-4 w-4" />
                : business.verification_status === "rejected" ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {business.verification_status === "verified" ? "Verified"
                : business.verification_status === "rejected" ? "Not approved" : "Awaiting review"}
            </div>
          </div>

          <div className="paper-card p-8 border-cherry/30">
            <h3 className="font-serif text-xl text-cherry">Danger zone</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Permanently deletes this {label} listing. Every service, photo, document, enquiry, message, and review under it. This can't be undone.
              Your {label} role itself stays on your account, so you can set up a new listing later if you want to.
            </p>
            <button type="button" onClick={() => setConfirmOpen(true)}
              className="mt-4 rounded-full border border-cherry text-cherry px-5 py-2.5 text-sm font-medium hover:bg-cherry hover:text-pearl cursor-pointer">
              Delete this {label} workspace
            </button>
          </div>
        </div>
      )}

      <DeleteWorkspaceDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${business?.legal_business_name ?? "this listing"}?`}
        description={`This permanently deletes the business, its services, photos, documents, enquiries, and messages. This can't be undone.`}
        confirmWith={business?.legal_business_name ?? ""}
        onConfirm={deleteWorkspace}
      />
    </AppShell>
  );
}

function AdminWorkspaceSettings({ roleCount }: { roleCount: number }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canLeave = roleCount > 1;

  const leaveAdmin = async () => {
    try {
      await removeRoleForCurrentUser("admin");
    } catch (err: any) {
      toast.error(err.message ?? "Could not remove admin access");
      return;
    }
    setConfirmOpen(false);
    toast.success("Admin access removed.");
    qc.invalidateQueries({ queryKey: ["my-roles"] });
    navigate({ to: "/dashboard" as any });
  };

  return (
    <AppShell title="Settings" subtitle="Manage your admin workspace.">
      <div className="max-w-xl grid gap-6">
        <div className="paper-card p-8">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Access</p>
          <h2 className="font-serif text-2xl mt-1 inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cherry" /> Admin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin has no profile of its own to edit. It's just the ability to review and manage vendor/venue listings platform-wide.
          </p>
        </div>

        <div className="paper-card p-8 border-cherry/30">
          <h3 className="font-serif text-xl text-cherry">Danger zone</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {canLeave
              ? "Removes admin access from your account. Nothing else about your account is affected. A workspace admin can grant it back later."
              : "This is your only workspace, so it can't be removed. Add another role first, or ask another admin to grant one back later if needed."}
          </p>
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canLeave}
            className="mt-4 rounded-full border border-cherry text-cherry px-5 py-2.5 text-sm font-medium hover:bg-cherry hover:text-pearl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-cherry cursor-pointer">
            Remove admin access
          </button>
        </div>
      </div>

      <DeleteWorkspaceDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove admin access?"
        description="You'll lose access to vendor/venue review tools immediately. This can't be undone by yourself. Another admin would need to grant it back."
        confirmWith="REMOVE ADMIN"
        onConfirm={leaveAdmin}
      />
    </AppShell>
  );
}
