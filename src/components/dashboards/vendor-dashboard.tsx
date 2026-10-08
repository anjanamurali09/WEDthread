import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { VendorOnboardingForm } from "@/components/onboarding/vendor-form";
import { Inbox, Store, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function VendorDashboard() {
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["my-vendor"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("vendors").select("*").eq("owner_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["my-vendor-leads", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => (await supabase.from("booking_leads" as any).select("*").eq("target_vendor_id", vendor!.id).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!vendor) {
    return (
      <div>
        <div className="rounded-3xl border border-dashed border-line p-8 mb-8 text-center">
          <Store className="h-10 w-10 mx-auto text-cherry" />
          <h2 className="font-serif text-2xl mt-3">Let's build your vendor listing</h2>
          <p className="text-sm text-muted-foreground mt-1">Fill this out to appear in front of couples planning weddings.</p>
        </div>
        <VendorOnboardingForm />
      </div>
    );
  }

  return (
    <>
      <StatusBanner status={vendor.status} />

      <section className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Listing</p>
          <p className="font-serif text-2xl mt-2">{vendor.business_name}</p>
          <p className="text-sm text-muted-foreground mt-1">{[vendor.home_city, vendor.home_country].filter(Boolean).join(", ")}</p>
          <p className="text-sm mt-2">{"$".repeat(vendor.price_tier ?? 3)} · {vendor.currency ?? "AED"}</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</p>
          <p className="font-serif text-4xl mt-2">{leadsLoading ? "–" : formatNumber(leads.length)}</p>
          <p className="text-sm text-muted-foreground mt-1">recent inquiries</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Photos</p>
          <p className="font-serif text-4xl mt-2">{formatNumber(vendor.photos?.length ?? 0)}</p>
          <p className="text-sm text-muted-foreground mt-1">uploaded</p>
        </div>
      </section>

      <section className="mt-8 paper-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl inline-flex items-center gap-2"><Inbox className="h-5 w-5" /> Recent leads</h3>
          <Link to={"/leads" as any} className="text-sm text-cherry uppercase tracking-widest">View all</Link>
        </div>
        {leadsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet. Couples who click "I'm interested" on your listing will appear here.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {leads.map((l: any) => (
              <li key={l.id} className="py-3">
                <p className="font-medium text-sm">{l.contact_name ?? "New inquiry"}</p>
                <p className="text-sm text-muted-foreground">{l.event_date ? new Date(l.event_date).toLocaleDateString() : "Date TBD"} · {l.guest_count != null ? formatNumber(l.guest_count) : "?"} guests · {l.city ?? ""}</p>
                <p className="text-sm mt-1 line-clamp-2 text-ink">{l.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-serif text-2xl mb-4">Edit listing</h3>
        <VendorOnboardingForm />
      </section>
    </>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; msg: string }> = {
    approved: { icon: CheckCircle2, cls: "bg-sage-soft text-ink", msg: "Your listing is live and visible to couples." },
    pending:  { icon: Clock,        cls: "bg-blush-soft text-cherry", msg: "Submitted. A WEDthread admin is reviewing your listing." },
    rejected: { icon: XCircle,      cls: "bg-wine-soft text-wine", msg: "Your listing needs changes before it goes live." },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return <div className={`rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2 ${s.cls}`}><Icon className="h-4 w-4" /> {s.msg}</div>;
}
