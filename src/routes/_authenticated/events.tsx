import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding, type Event } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, X, CalendarDays, Users, Armchair, MapPin, Gift, Globe2, Handshake, ChevronRight,
} from "lucide-react";
import { DatePicker } from "@/components/ui/datepicker";
import { cn } from "@/lib/utils";
import { PhotoEmptyState } from "@/components/photo-empty-state";

export const Route = createFileRoute("/_authenticated/events")({ component: EventsPage });

const SUGGESTIONS = [
  "Welcome party", "Mehendi", "Haldi", "Sangeet", "Rehearsal dinner",
  "Nikah", "Baraat", "Hindu ceremony", "Church ceremony", "Chuppah", "Tea ceremony",
  "Civil registry", "Cocktail hour", "Reception", "Pool party", "Beach ceremony",
  "After-party", "Farewell brunch",
];

type CatKey = "guests" | "seating" | "venue" | "registry" | "website" | "vendors";
const ALL_CATEGORIES: { key: CatKey; label: string; icon: any; to: string }[] = [
  { key: "guests",   label: "Guests",   icon: Users,     to: "/guests" },
  { key: "seating",  label: "Seating",  icon: Armchair,  to: "/seating" },
  { key: "venue",    label: "Venue",    icon: MapPin,    to: "/venues" },
  { key: "registry", label: "Registry", icon: Gift,      to: "/registry" },
  { key: "website",  label: "Website",  icon: Globe2,    to: "/website" },
  { key: "vendors",  label: "Vendors",  icon: Handshake, to: "/vendors" },
];

function EventsPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [], isLoading } = useEvents(wedding?.id);
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const invalidate = useInvalidateWedding();
  const [editing, setEditing] = useState<Partial<Event> | null>(null);

  // Global counts for wedding-wide categories (registry / website / vendors)
  const { data: counts } = useQuery({
    queryKey: ["event-side-counts", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const [{ count: regItems }, { count: siteSections }, { data: reg }] = await Promise.all([
        supabase.from("registry_items").select("id", { count: "exact", head: true })
          .in("registry_id", (await supabase.from("registries").select("id").eq("wedding_id", wedding!.id)).data?.map((r) => r.id) ?? ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("website_sections").select("id", { count: "exact", head: true }).eq("wedding_id", wedding!.id),
        supabase.from("registries").select("id").eq("wedding_id", wedding!.id).maybeSingle(),
      ]);
      return { regItems: regItems ?? 0, siteSections: siteSections ?? 0, hasRegistry: !!reg };
    },
  });

  // Per-event table counts (seating)
  const { data: tableCounts = {} } = useQuery({
    queryKey: ["event-table-counts", events.map((e) => e.id).join(",")],
    enabled: events.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("wedding_tables").select("event_id").in("event_id", events.map((e) => e.id));
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.event_id] = (m[r.event_id] ?? 0) + 1; });
      return m;
    },
  });

  const save = async (e: Partial<Event>) => {
    if (!wedding) return;
    const payload: any = {
      wedding_id: wedding.id,
      name: e.name!, event_date: e.event_date || null, event_time: e.event_time || null,
      event_end_time: (e as any).event_end_time || null,
      venue_name: e.venue_name || null, address: e.address || null, city: e.city || null,
      country: e.country || null, description: e.description || null,
      sort_order: e.sort_order ?? events.length,
      enabled_categories: (e as any).enabled_categories ?? ALL_CATEGORIES.map((c) => c.key),
    };
    try {
      if (e.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEditing(null);
      invalidate(wedding.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this event? Guest invites for it will also be removed.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidate(wedding?.id);
  };

  return (
    <AppShell
      title="Events"
      subtitle="Each event is its own mini planning hub — guests, seating, vendors, and more."
      actions={
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
          <Plus className="h-4 w-4" /> Add event
        </button>
      }
    >
      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        events.length === 0 ? (
          <PhotoEmptyState
            photo="marigold"
            variant="landscape"
            eyebrow="Every celebration in one place"
            title="A wedding is rarely one day"
            body="Add a mehendi, a welcome cocktail, a beach ceremony, a farewell brunch — whatever your two families are celebrating. Start with one of the traditions below or write your own."
          >
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setEditing({ name: s })} className="rounded-full bg-paper border border-line px-4 py-1.5 text-xs hover:bg-clay hover:text-paper hover:border-clay transition-colors cursor-pointer">+ {s}</button>
            ))}
          </PhotoEmptyState>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((e, i) => (
              <EventCard
                key={e.id}
                event={e}
                index={i}
                guests={guests}
                invites={invites}
                tableCount={tableCounts[e.id] ?? 0}
                counts={counts}
                onEdit={() => setEditing(e)}
                onDelete={() => del(e.id)}
              />
            ))}
          </div>
        )
      }

      {editing && <EventDialog event={editing} onClose={() => setEditing(null)} onSave={save} />}
    </AppShell>
  );
}

function EventCard({ event, index, guests, invites, tableCount, counts, onEdit, onDelete }: any) {
  const enabled: CatKey[] = event.enabled_categories?.length ? event.enabled_categories : ALL_CATEGORIES.map((c) => c.key);
  const invited = invites.filter((i: any) => i.event_id === event.id);
  const accepted = invited.filter((i: any) => i.rsvp_status === "accepted").length;

  const statusFor = (k: CatKey): { text: string; hasData: boolean } => {
    switch (k) {
      case "guests":   return invited.length ? { text: `${invited.length} invited · ${accepted} yes`, hasData: true } : { text: "Add your first guests", hasData: false };
      case "seating":  return tableCount ? { text: `${tableCount} table${tableCount === 1 ? "" : "s"} set`, hasData: true } : { text: "Design the floor plan", hasData: false };
      case "venue":    return event.venue_name ? { text: event.venue_name, hasData: true } : { text: "Add venue details", hasData: false };
      case "registry": return counts?.regItems ? { text: `${counts.regItems} gift${counts.regItems === 1 ? "" : "s"}`, hasData: true } : { text: "Add your first gift", hasData: false };
      case "website":  return counts?.siteSections ? { text: `${counts.siteSections} section${counts.siteSections === 1 ? "" : "s"}`, hasData: true } : { text: "Choose a template", hasData: false };
      case "vendors":  return { text: "Browse vendors", hasData: false };
    }
  };

  const rows = ALL_CATEGORIES.filter((c) => enabled.includes(c.key));
  const done = rows.filter((c) => statusFor(c.key).hasData).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <div className="paper-card p-6 flex flex-col morph-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-clay">Event {index + 1}</p>
          <h3 className="mt-1 font-serif text-2xl truncate">{event.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" }) : "Date TBD"}
            {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
            {event.city || event.country ? ` · ${[event.city, event.country].filter(Boolean).join(", ")}` : ""}
          </p>
        </div>
        <ProgressRing pct={pct} />
      </div>

      <div className="mt-5 -mx-2 divide-y divide-line/60 border-y border-line/60">
        {rows.map((c) => {
          const s = statusFor(c.key);
          const Icon = c.icon;
          return (
            <Link
              key={c.key}
              to={c.to as any}
              search={{ event: event.id } as any}
              className="group flex items-center gap-3 px-2 py-2.5 hover:bg-stone/50 rounded-lg cursor-pointer transition-colors"
            >
              <Icon className="h-4 w-4 text-clay shrink-0" />
              <span className="text-sm font-medium text-ink w-20 shrink-0">{c.label}</span>
              <span className={cn("text-xs flex-1 truncate", s.hasData ? "text-ink/80" : "text-muted-foreground italic")}>{s.text}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ink transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onEdit} className="text-xs rounded-full border border-line px-3 py-1.5 hover:bg-stone cursor-pointer">Edit event</button>
        <button onClick={onDelete} className="text-xs rounded-full border border-line px-3 py-1.5 hover:bg-stone text-muted-foreground cursor-pointer ml-auto"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} stroke="currentColor" strokeWidth="4" className="text-line" fill="none" />
        <circle cx="22" cy="22" r={r} stroke="currentColor" strokeWidth="4" className="text-cherry" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-ink">{pct}%</span>
    </div>
  );
}

function EventDialog({ event, onClose, onSave }: { event: Partial<Event>; onClose: () => void; onSave: (e: Partial<Event>) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Event>>({ ...event });
  const [enabled, setEnabled] = useState<CatKey[]>(
    ((event as any).enabled_categories as CatKey[] | undefined) ?? ALL_CATEGORIES.map((c) => c.key),
  );
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (next: Partial<Event>) => {
    const e: Record<string, string> = {};
    if (!next.name || !next.name.trim()) e.name = "Please enter an event name.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setField = <K extends keyof Event>(key: K, value: Event[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    validate(next);
  };
  const toggleCat = (k: CatKey) => setEnabled((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true });
    if (!validate(form)) return;
    setSaving(true);
    await onSave({ ...form, enabled_categories: enabled } as any);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">{event.id ? "Edit event" : "Add event"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form noValidate onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <F label="Name of event" required value={form.name ?? ""} onChange={(v) => setField("name", v)} placeholder="e.g. Sangeet" error={touched.name ? errors.name : undefined} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button type="button" key={s} onClick={() => setField("name", s)} className="text-[11px] rounded-full border border-line px-2.5 py-0.5 hover:bg-stone text-muted-foreground cursor-pointer">{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">Date</label>
            <div className="mt-1">
              <DatePicker value={form.event_date ?? ""} onChange={(v) => setField("event_date", v)} placeholder="Pick a date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start time" type="time" value={form.event_time ?? ""} onChange={(v) => setField("event_time", v)} />
            <F label="End time" type="time" value={(form as any).event_end_time ?? ""} onChange={(v) => setField("event_end_time" as any, v)} />
          </div>
          <F label="Venue name" value={form.venue_name ?? ""} onChange={(v) => setField("venue_name", v)} placeholder="e.g. Jag Mandir" />
          <F label="Address" value={form.address ?? ""} onChange={(v) => setField("address", v)} />
          <div className="grid grid-cols-2 gap-3">
            <F label="City" value={form.city ?? ""} onChange={(v) => setField("city", v)} />
            <F label="Country" value={form.country ?? ""} onChange={(v) => setField("country", v)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Description / notes for guests</label>
            <textarea rows={3} value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay bg-paper" />
          </div>

          <div className="pt-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">What does this event need?</label>
            <p className="text-xs text-muted-foreground mt-1">Only these will show up on the event card.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((c) => {
                const on = enabled.includes(c.key);
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCat(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                      on ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-line hover:bg-stone",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone cursor-pointer">Cancel</button>
            <button disabled={saving} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">{saving ? "Saving…" : "Save event"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-cherry">*</span>}
      </span>
      <input
        type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          "mt-1 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-paper transition-colors",
          error ? "border-cherry focus:ring-cherry" : "border-line focus:ring-clay",
        )}
      />
      {error && <p className="mt-1.5 text-xs text-cherry flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-cherry" />{error}</p>}
    </label>
  );
}
