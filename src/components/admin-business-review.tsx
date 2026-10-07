import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, Video, CheckCircle2, XCircle, ShieldAlert, Pencil } from "lucide-react";

type Status = "pending" | "verified" | "rejected";
type Business = {
  id: string;
  legal_business_name: string;
  business_description: string;
  vat_tax_number: string | null;
  country: string | null;
  verification_status: Status;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
type Doc = { id: string; file_name: string; file_url: string };
type Media = { id: string; media_type: "photo" | "video"; url: string };

// The only mutation an admin can make here is change a business's status —
// approve, reject, or reverse either one later (a decision isn't final —
// see the Approved/Rejected tabs each keeping the opposite action
// available). The one other action is "Edit," and it's gated to unclaimed
// businesses only (user_id IS NULL) — once a real owner claims a listing,
// editing it is theirs, not admin's.
export function AdminBusinessReview({ businessType, defaultTab = "approved" }: { businessType: "vendor" | "venue"; defaultTab?: "pending" | "approved" | "rejected" }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [docsByBusiness, setDocsByBusiness] = useState<Map<string, Doc[]>>(new Map());
  const [mediaByBusiness, setMediaByBusiness] = useState<Map<string, Media[]>>(new Map());
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setChecking(false); return; }
    const { data: admin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    setIsAdmin(!!admin);
    setChecking(false);
    if (!admin) return;

    setLoading(true);
    const { data: rows, error: rowsError } = await supabase
      .from("businesses").select("id,legal_business_name,business_description,vat_tax_number,country,verification_status,user_id,created_at,updated_at")
      .eq("business_type", businessType).order("created_at", { ascending: false });
    if (rowsError) toast.error(rowsError.message);
    const list = rows ?? [];
    setBusinesses(list);

    if (list.length > 0) {
      const ids = list.map((b) => b.id);
      const [{ data: docs }, { data: media }] = await Promise.all([
        supabase.from("business_documents").select("id,business_id,file_name,file_url").in("business_id", ids),
        supabase.from("business_media").select("id,business_id,media_type,url").in("business_id", ids).is("listing_id", null),
      ]);
      const docsMap = new Map<string, Doc[]>();
      for (const d of docs ?? []) docsMap.set(d.business_id, [...(docsMap.get(d.business_id) ?? []), d]);
      setDocsByBusiness(docsMap);
      const mediaMap = new Map<string, Media[]>();
      for (const m of media ?? []) mediaMap.set(m.business_id, [...(mediaMap.get(m.business_id) ?? []), m]);
      setMediaByBusiness(mediaMap);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessType]);

  const decide = async (id: string, status: "verified" | "rejected") => {
    setActing(id);
    const { error } = await supabase.from("businesses").update({ verification_status: status }).eq("id", id);
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success(status === "verified" ? "Approved." : "Rejected.");
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, verification_status: status } : b)));
  };

  if (checking) return <div />;

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-dashed border-line p-16 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-serif text-2xl mt-3">Admins only</h3>
        <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const noun = businessType === "vendor" ? "vendors" : "venues";
  const pending = businesses.filter((b) => b.verification_status === "pending");
  const approved = businesses.filter((b) => b.verification_status === "verified");
  const rejected = businesses.filter((b) => b.verification_status === "rejected");

  const editLink = (b: Business) => b.user_id ? undefined : (
    <Link to={`/admin/${businessType === "venue" ? "add-venue" : "add-vendor"}/${b.id}` as any}
      className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
      <Pencil className="h-4 w-4" /> Edit
    </Link>
  );

  return (
    <Tabs defaultValue={defaultTab} className="max-w-3xl">
      <TabsList>
        <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="approved">
        {approved.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="None yet" body={`No ${noun} have been approved yet.`} />
        ) : (
          <div className="grid gap-5">
            {approved.map((b) => (
              <BusinessCard key={b.id} business={b} docs={docsByBusiness.get(b.id) ?? []} media={mediaByBusiness.get(b.id) ?? []}
                statusBadge={<span className="text-[10px] uppercase tracking-widest rounded-full px-2.5 py-1 bg-sage-soft text-ink shrink-0">Approved {new Date(b.updated_at).toLocaleDateString()}</span>}
                actions={
                  <div className="mt-5 flex items-center gap-2">
                    <button type="button" onClick={() => decide(b.id, "rejected")} disabled={acting === b.id}
                      className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cherry hover:bg-blush-soft disabled:opacity-60 cursor-pointer">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    {editLink(b)}
                  </div>
                } />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="pending">
        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" body={`No ${noun} waiting on review right now.`} />
        ) : (
          <div className="grid gap-5">
            {pending.map((b) => (
              <BusinessCard key={b.id} business={b} docs={docsByBusiness.get(b.id) ?? []} media={mediaByBusiness.get(b.id) ?? []}
                actions={
                  <div className="mt-5 flex items-center gap-2">
                    <button type="button" onClick={() => decide(b.id, "verified")} disabled={acting === b.id}
                      className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button type="button" onClick={() => decide(b.id, "rejected")} disabled={acting === b.id}
                      className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cherry hover:bg-blush-soft disabled:opacity-60 cursor-pointer">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    {editLink(b)}
                  </div>
                } />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="rejected">
        {rejected.length === 0 ? (
          <EmptyState icon={XCircle} title="None yet" body={`No ${noun} have been rejected.`} />
        ) : (
          <div className="grid gap-5">
            {rejected.map((b) => (
              <BusinessCard key={b.id} business={b} docs={docsByBusiness.get(b.id) ?? []} media={mediaByBusiness.get(b.id) ?? []}
                statusBadge={<span className="text-[10px] uppercase tracking-widest rounded-full px-2.5 py-1 bg-wine-soft text-wine shrink-0">Rejected {new Date(b.updated_at).toLocaleDateString()}</span>}
                actions={
                  <div className="mt-5 flex items-center gap-2">
                    <button type="button" onClick={() => decide(b.id, "verified")} disabled={acting === b.id}
                      className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    {editLink(b)}
                  </div>
                } />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line p-16 text-center">
      <Icon className="h-8 w-8 mx-auto text-sage-deep" />
      <h3 className="font-serif text-2xl mt-3">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function BusinessCard({ business: b, docs, media, actions, statusBadge }: {
  business: Business; docs: Doc[]; media: Media[]; actions?: React.ReactNode; statusBadge?: React.ReactNode;
}) {
  const photos = media.filter((m) => m.media_type === "photo");
  const videos = media.filter((m) => m.media_type === "video");
  return (
    <div className="paper-card p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-2xl">{b.legal_business_name}</h3>
        {statusBadge}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {[b.country, b.vat_tax_number ? `VAT ${b.vat_tax_number}` : null].filter(Boolean).join(" · ") || "No country or VAT number on file"}
        {!b.user_id && <span className="ml-2 text-[10px] uppercase tracking-widest text-clay">Unclaimed</span>}
      </p>
      <p className="mt-3 text-sm text-ink">{b.business_description}</p>

      <div className="mt-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Documents ({docs.length})</p>
        {docs.length === 0 ? (
          <p className="text-sm text-cherry">No documents uploaded.</p>
        ) : (
          <ul className="grid gap-1.5">
            {docs.map((d) => (
              <li key={d.id}>
                <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-clay hover:text-wine underline">
                  <FileText className="h-3.5 w-3.5" /> {d.file_name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(photos.length > 0 || videos.length > 0) && (
        <div className="mt-4">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Media
          </p>
          <div className="flex flex-wrap gap-2">
            {photos.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="h-16 w-16 rounded-lg overflow-hidden border border-line block">
                <img src={m.url} className="w-full h-full object-cover" alt="" />
              </a>
            ))}
            {videos.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="h-16 w-16 rounded-lg overflow-hidden border border-line grid place-items-center bg-stone">
                <Video className="h-5 w-5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      {actions}
    </div>
  );
}
