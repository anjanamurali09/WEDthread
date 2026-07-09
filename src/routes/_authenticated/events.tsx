import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useInvalidateWedding, type Event } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, X, CalendarDays, CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/datepicker";


export const Route = createFileRoute("/_authenticated/events")({ component: EventsPage });

const SUGGESTIONS = [
  "Welcome party", "Mehendi", "Haldi", "Sangeet", "Rehearsal dinner",
  "Nikah", "Baraat", "Hindu ceremony", "Church ceremony", "Chuppah", "Tea ceremony",
  "Civil registry", "Cocktail hour", "Reception", "Pool party", "Beach ceremony",
  "After-party", "Farewell brunch",
];

function EventsPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [], isLoading } = useEvents(wedding?.id);
  const invalidate = useInvalidateWedding();
  const [editing, setEditing] = useState<Partial<Event> | null>(null);

  const save = async (e: Partial<Event>) => {
    if (!wedding) return;
    const payload = {
      wedding_id: wedding.id,
      name: e.name!, event_date: e.event_date || null, event_time: e.event_time || null,
      event_end_time: (e as any).event_end_time || null,
      venue_name: e.venue_name || null, address: e.address || null, city: e.city || null,
      country: e.country || null, description: e.description || null,
      sort_order: e.sort_order ?? events.length,
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
      subtitle="Every ceremony, every reception, every brunch. Add as many as your wedding actually has."
      actions={
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay">
          <Plus className="h-4 w-4" /> Add event
        </button>
      }
    >
      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        events.length === 0 ? (
          <div className="rounded-3xl bg-gradient-to-br from-blush-soft via-cream to-sage/20 border border-line p-10 md:p-14">
            <div className="text-center">
              <CalendarDays className="h-8 w-8 mx-auto text-clay" />
              <h3 className="mt-4 font-serif text-3xl">No events yet</h3>
              <p className="mt-2 text-sm text-ink/70 max-w-xl mx-auto">A wedding is rarely one day. Add a mehendi, a welcome cocktail, a beach ceremony, a pool party, a church service, a farewell brunch, whatever your two families are celebrating.</p>
            </div>
            <div className="mt-8">
              <p className="text-center text-[11px] uppercase tracking-widest text-clay">Popular starts</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setEditing({ name: s })} className="rounded-full bg-paper border border-line px-4 py-1.5 text-xs hover:bg-clay hover:text-paper hover:border-clay transition-colors">+ {s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e, i) => (
              <div key={e.id} className="paper-card p-6 group relative">
                <p className="text-[10px] uppercase tracking-widest text-clay">Event {i + 1}</p>
                <h3 className="mt-1 font-serif text-2xl">{e.name}</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                  {e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}
                  {(e as any).event_end_time ? ` – ${(e as any).event_end_time.slice(0,5)}` : ""}
                </p>
                {e.venue_name && <p className="text-sm mt-3">{e.venue_name}</p>}
                {(e.city || e.country) && <p className="text-xs text-muted-foreground">{[e.city, e.country].filter(Boolean).join(", ")}</p>}
                {e.description && <p className="mt-3 text-sm text-ink/70 line-clamp-3">{e.description}</p>}
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setEditing(e)} className="text-xs rounded-full border border-line px-3 py-1.5 hover:bg-stone">Edit</button>
                  <button onClick={() => del(e.id)} className="text-xs rounded-full border border-line px-3 py-1.5 hover:bg-stone text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {editing && <EventDialog event={editing} onClose={() => setEditing(null)} onSave={save} />}
    </AppShell>
  );
}

function EventDialog({ event, onClose, onSave }: { event: Partial<Event>; onClose: () => void; onSave: (e: Partial<Event>) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Event>>({ ...event });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">{event.id ? "Edit event" : "Add event"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" placeholder="e.g. Sangeet" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, name: s })} className="text-[11px] rounded-full border border-line px-2.5 py-0.5 hover:bg-stone text-muted-foreground">{s}</button>
              ))}
            </div>
          </div>
          <F label="Date" type="date" value={form.event_date ?? ""} onChange={(v) => setForm({ ...form, event_date: v })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Start time (optional)" type="time" value={form.event_time ?? ""} onChange={(v) => setForm({ ...form, event_time: v })} />
            <F label="End time (optional)" type="time" value={(form as any).event_end_time ?? ""} onChange={(v) => setForm({ ...form, event_end_time: v } as any)} />
          </div>
          <F label="Venue name" value={form.venue_name ?? ""} onChange={(v) => setForm({ ...form, venue_name: v })} placeholder="e.g. Jag Mandir" />
          <F label="Address" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
            <F label="Country" value={form.country ?? ""} onChange={(v) => setForm({ ...form, country: v })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Description / notes for guests</label>
            <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
            <button disabled={saving} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay disabled:opacity-60">{saving ? "Saving…" : "Save event"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
    </label>
  );
}
