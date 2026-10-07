import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ShieldAlert, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/claims")({ component: AdminClaimsPage });

type Claim = {
  id: string;
  business_id: string;
  claimant_email: string;
  message: string | null;
  created_at: string;
  business_name: string;
  business_type: "vendor" | "venue";
};

// Same minimal, approve/reject-only model as business review: approving
// here sets businesses.user_id to the claimant and grants them the
// vendor/venue role (the same thing addRoleForCurrentUser does on
// self-signup) — nothing else is editable from this page.
function AdminClaimsPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setChecking(false); return; }
    const { data: admin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    setIsAdmin(!!admin);
    setChecking(false);
    if (!admin) return;

    setLoading(true);
    const { data: rows, error } = await supabase
      .from("business_claims").select("id,business_id,claimant_email,message,created_at")
      .eq("status", "pending").order("created_at");
    if (error) toast.error(error.message);
    const list = rows ?? [];
    if (list.length === 0) { setClaims([]); setLoading(false); return; }

    const { data: businesses } = await supabase.from("businesses").select("id,legal_business_name,business_type").in("id", list.map((c) => c.business_id));
    const bizById = new Map((businesses ?? []).map((b) => [b.id, b]));
    setClaims(list.map((c) => ({
      ...c,
      business_name: bizById.get(c.business_id)?.legal_business_name ?? "Unknown business",
      business_type: (bizById.get(c.business_id)?.business_type as "vendor" | "venue") ?? "vendor",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (claim: Claim) => {
    setActing(claim.id);
    // Order matters: attach ownership + grant the role first, only mark the
    // claim approved once both succeed — a failed grant shouldn't look
    // approved.
    const { data: claimRow } = await supabase.from("business_claims").select("claimant_user_id").eq("id", claim.id).single();
    if (!claimRow) { setActing(null); return toast.error("Claim not found"); }

    const { error: ownerError } = await supabase.from("businesses").update({ user_id: claimRow.claimant_user_id }).eq("id", claim.business_id);
    if (ownerError) { setActing(null); return toast.error(ownerError.message); }

    await supabase.from("user_roles").insert({ user_id: claimRow.claimant_user_id, role: claim.business_type }).select().maybeSingle();
    // Ignore a duplicate-role error (23505) — they may already hold it.

    const { error: claimError } = await supabase.from("business_claims").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", claim.id);
    setActing(null);
    if (claimError) return toast.error(claimError.message);
    toast.success(`${claim.business_name} is now owned by ${claim.claimant_email}.`);
    setClaims((prev) => prev.filter((c) => c.id !== claim.id));
  };

  const reject = async (claim: Claim) => {
    setActing(claim.id);
    const { error } = await supabase.from("business_claims").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", claim.id);
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success("Claim rejected.");
    setClaims((prev) => prev.filter((c) => c.id !== claim.id));
  };

  if (checking) return <AppShell title="Loading…"><div /></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell title="Business claims">
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-serif text-2xl mt-3">Admins only</h3>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Business claims" subtitle="Requests to take ownership of an unclaimed listing — approve or reject.">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : claims.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
          <h3 className="font-serif text-2xl mt-3">No pending claims</h3>
        </div>
      ) : (
        <div className="grid gap-4 max-w-2xl">
          {claims.map((c) => (
            <div key={c.id} className="paper-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-clay">{c.business_type}</p>
                  <h3 className="font-serif text-xl mt-1 inline-flex items-center gap-1.5">
                    {c.business_name}
                    <Link to={`/${c.business_type === "venue" ? "venue" : "v"}/${c.business_id}` as any} target="_blank" className="text-muted-foreground hover:text-cherry">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Claimed by {c.claimant_email}</p>
                </div>
              </div>
              {c.message && <p className="mt-3 text-sm text-ink">{c.message}</p>}
              <div className="mt-5 flex items-center gap-2">
                <button type="button" onClick={() => approve(c)} disabled={acting === c.id}
                  className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button type="button" onClick={() => reject(c)} disabled={acting === c.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cherry hover:bg-blush-soft disabled:opacity-60 cursor-pointer">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
