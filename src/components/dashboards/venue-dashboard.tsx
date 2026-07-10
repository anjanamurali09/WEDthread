import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { VenueOnboardingForm } from "@/components/onboarding/venue-form";
import { Inbox, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";

export function VenueDashboard() {
  const { data: venue, isLoading } = useQuery({
    queryKey: ["my-venue"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("venues").select("*").eq("owner_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["my-venue-leads", venue?.id],
    enabled: !!venue?.id,
    queryFn: async () => (await supabase.from("booking_leads" as any).select("*").eq("target_venue_id", venue!.id).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!venue) {
    return (
      <div>
        <div className="rounded-3xl border border-dashed border-line p-8 mb-8 text-center">
          <Building2 className="h-10 w-10 mx-auto text-cherry" />
          <h2 className="font-serif text-2xl mt-3">List your venue</h2>
          <p className="text-sm text-muted-foreground mt-1">Reach couples planning destination weddings.</p>
        </div>
        <VenueOnboardingForm />
      </div>
    );
  }

  return (
    <>
      <StatusBanner status={venue.status} />

      <section className="grid md:grid-cols-4 gap-4 mt-6">
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Venue</p>
          <p className="font-serif text-xl mt-2">{venue.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{venue.city}, {venue.country}</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Capacity</p>
          <p className="font-serif text-4xl mt-2">{venue.capacity_seated ?? venue.capacity ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">seated</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Price</p>
          <p className="font-serif text-4xl mt-2">{"$".repeat(venue.price_tier ?? 3)}</p>
          <p className="text-xs text-muted-foreground mt-1">{venue.currency ?? "AED"}</p>
        </div>
        <div className="paper-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</p>
          <p className="font-serif text-4xl mt-2">{leads.length}</p>
          <p className="text-xs text-muted-foreground mt-1">recent inquiries</p>
        </div>
      </section>

      <section className="mt-8 paper-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl inline-flex items-center gap-2"><Inbox className="h-5 w-5" /> Recent leads</h3>
          <Link to={"/leads" as any} className="text-xs text-cherry uppercase tracking-widest">View all</Link>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {leads.map((l: any) => (
              <li key={l.id} className="py-3">
                <p className="font-medium text-sm">{l.contact_name ?? "New inquiry"}</p>
                <p className="text-xs text-muted-foreground">{l.event_date ? new Date(l.event_date).toLocaleDateString() : "Date TBD"} · {l.guest_count ?? "?"} guests · {l.city ?? ""}</p>
                <p className="text-xs mt-1 line-clamp-2 text-ink/70">{l.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-serif text-2xl mb-4">Edit listing</h3>
        <VenueOnboardingForm />
      </section>
    </>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; msg: string }> = {
    approved: { icon: CheckCircle2, cls: "bg-sage-soft text-ink", msg: "Your venue is live." },
    pending:  { icon: Clock,        cls: "bg-blush-soft text-cherry", msg: "Submitted — waiting for review." },
    rejected: { icon: XCircle,      cls: "bg-wine-soft text-wine", msg: "Listing needs changes." },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return <div className={`rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2 ${s.cls}`}><Icon className="h-4 w-4" /> {s.msg}</div>;
}
