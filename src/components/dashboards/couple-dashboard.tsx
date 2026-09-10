import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentWedding, useEvents, useGuests, useInvites, useExpenses, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { summarizeGuestRsvps } from "@/lib/rsvp-stats";
import { DashboardWidgetGrid, normalizeDashboardLayout, type DashboardLayoutEntry, type WidgetContext } from "@/components/dashboard-widgets";
import { WeddingMindmap } from "@/components/dashboards/wedding-mindmap";

// compact is owned by the route (src/routes/_authenticated/dashboard.tsx) and
// passed down — the toggle button itself renders in the AppShell header (via
// its `actions` prop) so it sits flush with the title/subtitle line, which
// isn't reachable from inside this component's own render tree.
export function CoupleDashboard({ compact }: { compact: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidateWedding = useInvalidateWedding();
  const { data: wedding, isLoading, isError, refetch } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const { data: guests = [], isLoading: guestsLoading } = useGuests(wedding?.id);
  const { data: invites = [], isLoading: invitesLoading } = useInvites(wedding?.id);
  const { data: expenses = [] } = useExpenses(wedding?.id);

  // Raw rows, not pre-aggregated — the mindmap needs seating broken down PER
  // event (only shown at all when that event has seating enabled), which a
  // single wedding-wide count can't answer. events!inner(wedding_id) scopes
  // this to the current wedding without waiting on the `events` query above.
  const { data: seatingData } = useQuery({
    queryKey: ["dashboard-seating-raw", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data: tables } = await supabase
        .from("wedding_tables").select("id, event_id, seats, events!inner(wedding_id)").eq("events.wedding_id", wedding!.id);
      const tableIds = (tables ?? []).map((t: any) => t.id as string);
      const seatAssignments = tableIds.length === 0 ? [] : (
        await supabase.from("seat_assignments").select("id, table_id").in("table_id", tableIds)
      ).data ?? [];
      return { tables: (tables ?? []) as { id: string; event_id: string; seats: number }[], seatAssignments };
    },
  });

  // menuStats/seatingStats used to be gated on `eventIds`, which only exists once the
  // `events` query above has fully resolved — that turned every dashboard load into a
  // 3rd sequential network round trip (wedding -> events -> these), even though neither
  // stat actually needs the events *data*, just "which events belong to this wedding".
  // Filtering server-side via events!inner(wedding_id) instead means both can fire
  // immediately once wedding.id is known, in parallel with events/guests/invites/expenses
  // rather than waiting behind them.
  const { data: menuStats = { sections: 0, items: 0 } } = useQuery({
    queryKey: ["dashboard-menu-stats", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data: sections } = await supabase
        .from("menu_sections").select("id, events!inner(wedding_id)").eq("events.wedding_id", wedding!.id);
      const sectionIds = (sections ?? []).map((s) => s.id);
      if (sectionIds.length === 0) return { sections: sections?.length ?? 0, items: 0 };
      const { count } = await supabase.from("menu_items").select("id", { count: "exact", head: true }).in("section_id", sectionIds);
      return { sections: sections?.length ?? 0, items: count ?? 0 };
    },
  });

  const { data: seatingStats = { tables: 0, seated: 0 } } = useQuery({
    queryKey: ["dashboard-seating-stats", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data: tables } = await supabase
        .from("wedding_tables").select("id, events!inner(wedding_id)").eq("events.wedding_id", wedding!.id);
      const tableIds = (tables ?? []).map((t) => t.id);
      if (tableIds.length === 0) return { tables: tables?.length ?? 0, seated: 0 };
      const { count } = await supabase.from("seat_assignments").select("id", { count: "exact", head: true }).in("table_id", tableIds);
      return { tables: tables?.length ?? 0, seated: count ?? 0 };
    },
  });

  const { data: registryStats = { items: 0, hasRegistry: false } } = useQuery({
    queryKey: ["dashboard-registry-stats", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data: reg } = await supabase.from("registries").select("id").eq("wedding_id", wedding!.id).maybeSingle();
      if (!reg) return { items: 0, hasRegistry: false };
      const { count } = await supabase.from("registry_items").select("id", { count: "exact", head: true }).eq("registry_id", reg.id);
      return { items: count ?? 0, hasRegistry: true };
    },
  });

  const [layout, setLayout] = useState<DashboardLayoutEntry[] | null>(null);

  useEffect(() => {
    if (!wedding) return;
    setLayout(normalizeDashboardLayout(wedding.dashboard_layout));
  }, [wedding?.id, wedding?.dashboard_layout]); // eslint-disable-line

  // Only redirect to the create-wedding flow once the lookup has actually confirmed
  // there's no wedding row — never on isError. Treating a failed lookup as "no wedding"
  // is exactly how this used to create duplicate blank weddings: a transient error would
  // bounce a returning couple into the onboarding form, which they'd then submit again.
  useEffect(() => {
    if (!isLoading && !isError && !wedding) navigate({ to: "/onboarding", replace: true });
  }, [wedding, isLoading, isError, navigate]);

  if (isError) {
    return (
      <div className="text-sm text-muted-foreground">
        Couldn't load your wedding.{" "}
        <button onClick={() => refetch()} className="underline hover:text-ink cursor-pointer">Try again</button>
      </div>
    );
  }
  if (!wedding) return null;
  if (eventsLoading || guestsLoading || invitesLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  // Per-guest, not per-invite-record: a guest attending 3 of 4 invited events still
  // counts once in "attending," and only counts as "responded" once every event they're
  // invited to has a firm accept/decline. See src/lib/rsvp-stats.ts.
  const { invited: totalInvites, attending, responded: rsvpd } = summarizeGuestRsvps(guests.map((g) => g.id), invites);
  const budgetSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const persistLayout = async (next: DashboardLayoutEntry[]) => {
    setLayout(next);
    if (!wedding) return;
    const { error } = await supabase.from("weddings").update({ dashboard_layout: next }).eq("id", wedding.id);
    if (!error) qc.invalidateQueries({ queryKey: ["current-wedding"] });
  };

  const uploadCouplePhoto = async (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${wedding.id}/couple-photo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("wedding-assets").getPublicUrl(path);
    // Reset the crop — a leftover zoom/pan from a previous photo has no
    // meaning against a brand new one.
    const { error: updateError } = await supabase.from("weddings")
      .update({ couple_photo_url: data.publicUrl, couple_photo_zoom: 1, couple_photo_pan_x: 0, couple_photo_pan_y: 0 }).eq("id", wedding.id);
    if (updateError) return toast.error(updateError.message);
    invalidateWedding(wedding.id);
  };

  const updateCouplePhotoCrop = async (zoom: number, panX: number, panY: number) => {
    const { error } = await supabase.from("weddings").update({ couple_photo_zoom: zoom, couple_photo_pan_x: panX, couple_photo_pan_y: panY }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    invalidateWedding(wedding.id);
  };

  const ctx: WidgetContext = {
    wedding, events, guestsCount: guests.length, attending, totalInvites, rsvpd,
    budgetSpent, budgetCurrency: wedding.budget_currency ?? "USD",
    menuItems: menuStats.items, menuSections: menuStats.sections,
    seatingTables: seatingStats.tables, seatingSeated: seatingStats.seated,
    registryItems: registryStats.items, hasRegistry: registryStats.hasRegistry,
  };

  return (
    <div>
      {compact ? (
        <>
          <section className="paper-card p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Your events</h2>
              <Link to="/events" className="text-sm text-clay uppercase tracking-widest inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>
            </div>
            {events.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
                <p className="text-sm text-muted-foreground">No events yet. Add mehendi, sangeet, nikah, ceremony, reception, whatever your wedding has.</p>
                <Link to="/events" className="mt-4 inline-flex rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay">Add your first event</Link>
              </div>
            ) : (
              <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((e, i) => (
                  <div key={e.id} className="border border-line rounded-2xl p-5">
                    <p className="text-[10px] uppercase tracking-widest text-clay">Event {i + 1}</p>
                    <p className="mt-1 font-serif text-2xl">{e.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {e.event_date ? new Date(e.event_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                      {e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}
                    </p>
                    {e.venue_name && <p className="text-sm mt-3">{e.venue_name}{e.city ? ` · ${e.city}` : ""}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {layout && <DashboardWidgetGrid layout={layout} ctx={ctx} onLayoutChange={persistLayout} />}
        </>
      ) : (
        <WeddingMindmap
          wedding={wedding}
          events={events}
          guests={guests}
          invites={invites}
          tables={seatingData?.tables ?? []}
          seatAssignments={seatingData?.seatAssignments ?? []}
          budgetSpent={budgetSpent}
          onUploadPhoto={uploadCouplePhoto}
          onCropChange={updateCouplePhotoCrop}
        />
      )}
    </div>
  );
}

export function coupleTitle(wedding: any) {
  return `${wedding.partner_a} & ${wedding.partner_b}`;
}
