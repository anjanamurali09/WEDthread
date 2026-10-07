import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { toast } from "@/lib/toast";
import { CheckCircle2, XCircle, ShieldAlert, ExternalLink, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/suggestions")({ component: AdminSuggestionsPage });

type Suggestion = {
  id: string;
  business_id: string;
  suggested_by_email: string;
  message: string;
  created_at: string;
  business_name: string;
  business_type: "vendor" | "venue";
  claimed: boolean;
};

// Same minimal, approve/reject-only model as everything else here.
// Approving/rejecting only marks the suggestion reviewed — it never
// auto-mutates the business. For an unclaimed listing there's a direct
// link into the admin edit form to actually make the change; for a
// claimed one, the owner is the one who'd update it.
function AdminSuggestionsPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
      .from("business_suggestions").select("id,business_id,suggested_by_email,message,created_at")
      .eq("status", "pending").order("created_at");
    if (error) toast.error(error.message);
    const list = rows ?? [];
    if (list.length === 0) { setSuggestions([]); setLoading(false); return; }

    const { data: businesses } = await supabase.from("businesses").select("id,legal_business_name,business_type,user_id").in("id", list.map((s) => s.business_id));
    const bizById = new Map((businesses ?? []).map((b) => [b.id, b]));
    setSuggestions(list.map((s) => ({
      ...s,
      business_name: bizById.get(s.business_id)?.legal_business_name ?? "Unknown business",
      business_type: (bizById.get(s.business_id)?.business_type as "vendor" | "venue") ?? "vendor",
      claimed: !!bizById.get(s.business_id)?.user_id,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    const { error } = await supabase.from("business_suggestions").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Marked approved." : "Marked rejected.");
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  if (checking) return <AppShell title="Loading…"><div /></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell title="Suggested changes">
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-serif text-2xl mt-3">Admins only</h3>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Suggested changes" subtitle="Corrections couples have flagged on a vendor/venue listing. Approve or reject.">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : suggestions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
          <h3 className="font-serif text-2xl mt-3">No pending suggestions</h3>
        </div>
      ) : (
        <div className="grid gap-4 max-w-2xl">
          {suggestions.map((s) => (
            <div key={s.id} className="paper-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-clay">{s.business_type}{!s.claimed && " · unclaimed"}</p>
                  <h3 className="font-serif text-xl mt-1 inline-flex items-center gap-1.5">
                    {s.business_name}
                    <Link to={`/${s.business_type === "venue" ? "venue" : "v"}/${s.business_id}` as any} target="_blank" className="text-muted-foreground hover:text-cherry">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Suggested by {s.suggested_by_email}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink">{s.message}</p>
              <div className="mt-5 flex items-center gap-2">
                <button type="button" onClick={() => decide(s.id, "approved")} disabled={acting === s.id}
                  className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button type="button" onClick={() => decide(s.id, "rejected")} disabled={acting === s.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cherry hover:bg-blush-soft disabled:opacity-60 cursor-pointer">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                {!s.claimed && (
                  <Link to={`/admin/${s.business_type === "venue" ? "add-venue" : "add-vendor"}/${s.business_id}` as any}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
                    <Pencil className="h-4 w-4" /> Edit listing
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
