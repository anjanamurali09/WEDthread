import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding, type Guest, type Invite } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, Download, X, Trash2, Search, MessageCircle, Copy, FileText, Columns3, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guests")({
  component: GuestsPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

const DIETARY = ["Vegetarian","Vegan","Halal","Kosher","Jain","Gluten-free","Pescatarian"];
const ALLERGIES = ["Nuts","Dairy","Shellfish","Eggs","Soy","Sesame","Wheat"];

type ColKey = "name" | "household" | "email" | "phone" | "dietary" | "events" | "rsvp";
const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "name", label: "Guest name" },
  { key: "household", label: "Family / Group" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "dietary", label: "Dietary" },
  { key: "events", label: "Events" },
  { key: "rsvp", label: "RSVP status" },
];
const DEFAULT_COLS: ColKey[] = ["name", "household", "email", "phone", "dietary", "events", "rsvp"];

function GuestsPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const invalidate = useInvalidateWedding();
  const { event: scopeEventId } = Route.useSearch();
  const scopeEvent = scopeEventId ? events.find((e) => e.id === scopeEventId) : undefined;
  const [editing, setEditing] = useState<Partial<Guest> | null>(null);
  const [q, setQ] = useState("");
  const [filterDiet, setFilterDiet] = useState<string | null>(null);
  const [filterHousehold, setFilterHousehold] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [filterRsvp, setFilterRsvp] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => {
    try { const s = localStorage.getItem("vowzy_guest_cols"); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_COLS;
  });
  const [colsOpen, setColsOpen] = useState(false);
  const toggleCol = (k: ColKey) => setVisibleCols((prev) => {
    const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
    try { localStorage.setItem("vowzy_guest_cols", JSON.stringify(next)); } catch {}
    return next;
  });
  const showCol = (k: ColKey) => visibleCols.includes(k);

  const scopedGuestIds = useMemo(() => {
    if (!scopeEventId) return null;
    return new Set(invites.filter((i) => i.event_id === scopeEventId).map((i) => i.guest_id));
  }, [invites, scopeEventId]);

  const households = useMemo(() => {
    const s = new Set<string>();
    guests.forEach((g) => { if (g.household_group) s.add(g.household_group); });
    return [...s].sort();
  }, [guests]);

  const invitesByGuestQuick = useMemo(() => {
    const m = new Map<string, Invite[]>();
    invites.forEach((i) => { const l = m.get(i.guest_id) ?? []; l.push(i); m.set(i.guest_id, l); });
    return m;
  }, [invites]);

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (scopedGuestIds && !scopedGuestIds.has(g.id)) return false;
      if (q && !g.full_name.toLowerCase().includes(q.toLowerCase()) && !(g.email || "").toLowerCase().includes(q.toLowerCase())) return false;
      if (filterDiet && !(g.dietary_tags?.includes(filterDiet) || g.food_allergies?.includes(filterDiet))) return false;
      if (filterHousehold && g.household_group !== filterHousehold) return false;
      const gi = invitesByGuestQuick.get(g.id) ?? [];
      if (filterEvent && !gi.some((i) => i.event_id === filterEvent)) return false;
      if (filterRsvp && !gi.some((i) => i.rsvp_status === filterRsvp)) return false;
      return true;
    });
  }, [guests, q, filterDiet, filterHousehold, filterEvent, filterRsvp, scopedGuestIds, invitesByGuestQuick]);

  const anyFilter = !!(q || filterDiet || filterHousehold || filterEvent || filterRsvp);
  const clearFilters = () => { setQ(""); setFilterDiet(null); setFilterHousehold(null); setFilterEvent(null); setFilterRsvp(null); };


  const inviteByGuest = useMemo(() => {
    const m = new Map<string, Invite[]>();
    invites.forEach((i) => { const l = m.get(i.guest_id) ?? []; l.push(i); m.set(i.guest_id, l); });
    return m;
  }, [invites]);

  const importCsv = () => fileRef.current?.click();

  const CSV_HEADERS = ["first_name","last_name","email","phone","household","dietary_tags","food_allergies","dietary_notes","accessibility_notes"];

  const downloadTemplate = () => {
    const sample = [{
      first_name: "Aria", last_name: "Rao", email: "aria@example.com",
      phone: "+91 98000 00000", household: "Rao family",
      dietary_tags: "Vegetarian; Jain", food_allergies: "Nuts",
      dietary_notes: "no cross-contact with peanuts",
      accessibility_notes: "",
    }];
    const csv = Papa.unparse({ fields: CSV_HEADERS, data: sample.map((r) => CSV_HEADERS.map((h) => (r as any)[h] ?? "")) });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "vowzy-guest-template.csv"; a.click();
  };

  const onCsv = (file: File) => {
    if (!wedding) return;
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data.filter((r) => r.first_name || r.name || r.full_name);
        if (rows.length === 0) return toast.error("No rows with a first_name or name column found");
        const inserts = rows.map((r) => {
          const fn = r.first_name || (r.name || r.full_name || "").split(" ")[0];
          const ln = r.last_name || (r.name || r.full_name || "").split(" ").slice(1).join(" ") || null;
          return {
            wedding_id: wedding.id,
            first_name: fn || null,
            last_name: ln,
            full_name: [fn, ln].filter(Boolean).join(" ") || r.name || r.full_name || "",
            email: r.email || null,
            phone: r.phone || r.whatsapp || null,
            household_group: r.household || r.household_group || null,
            dietary_tags: r.dietary_tags ? r.dietary_tags.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
            food_allergies: r.food_allergies ? r.food_allergies.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
            dietary_notes: r.dietary_notes || null,
            accessibility_notes: r.accessibility_notes || null,
          } as any;
        });
        const { error } = await supabase.from("guests").insert(inserts);
        if (error) return toast.error(error.message);
        toast.success(`Imported ${inserts.length} guests`);
        invalidate(wedding.id);
      },
    });
  };

  const exportCsv = () => {
    const rows = guests.map((g: any) => ({
      first_name: g.first_name ?? g.full_name?.split(" ")[0] ?? "",
      last_name: g.last_name ?? g.full_name?.split(" ").slice(1).join(" ") ?? "",
      email: g.email ?? "", phone: g.phone ?? "", household: g.household_group ?? "",
      dietary_tags: (g.dietary_tags ?? []).join("; "),
      food_allergies: (g.food_allergies ?? []).join("; "),
      dietary_notes: g.dietary_notes ?? "",
      accessibility_notes: g.accessibility_notes ?? "",
    }));
    const csv = Papa.unparse({ fields: CSV_HEADERS, data: rows.map((r) => CSV_HEADERS.map((h) => (r as any)[h])) });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "guests.csv"; a.click();
  };

  const save = async (g: Partial<Guest> & { invitedEventIds?: string[] }) => {
    if (!wedding) return;
    try {
      const fn = (g as any).first_name ?? g.full_name?.split(" ")[0] ?? "";
      const ln = (g as any).last_name ?? g.full_name?.split(" ").slice(1).join(" ") ?? null;
      const payload: any = {
        wedding_id: wedding.id,
        first_name: fn || null,
        last_name: ln || null,
        full_name: [fn, ln].filter(Boolean).join(" "),
        email: g.email || null, phone: g.phone || null,
        household_group: g.household_group || null,
        dietary_tags: g.dietary_tags ?? [], food_allergies: g.food_allergies ?? [],
        dietary_notes: g.dietary_notes || null, accessibility_notes: g.accessibility_notes || null,
      };
      let guestId = g.id;
      if (g.id) {
        const { error } = await supabase.from("guests").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("guests").insert(payload).select().single();
        if (error) throw error;
        guestId = data.id;
      }
      if (guestId && g.invitedEventIds) {
        // Remove invites not selected, add missing
        const existing = inviteByGuest.get(guestId) ?? [];
        const toRemove = existing.filter((i) => !g.invitedEventIds!.includes(i.event_id));
        const toAdd = g.invitedEventIds.filter((eid) => !existing.some((i) => i.event_id === eid));
        if (toRemove.length) await supabase.from("guest_event_invites").delete().in("id", toRemove.map((r) => r.id));
        if (toAdd.length) await supabase.from("guest_event_invites").insert(toAdd.map((eid) => ({ guest_id: guestId!, event_id: eid })));
      }
      toast.success("Saved");
      setEditing(null); invalidate(wedding.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this guest?")) return;
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(wedding?.id);
  };

  const copyRsvpLink = async (g: Guest) => {
    const url = `${window.location.origin}/rsvp/${g.rsvp_token}`;
    await navigator.clipboard.writeText(url);
    toast.success("RSVP link copied");
  };

  const stats = {
    total: guests.length,
    attending: invites.filter((i) => i.rsvp_status === "attending").length,
    pending: invites.filter((i) => i.rsvp_status === "pending").length,
  };

  return (
    <AppShell
      title="Guests"
      subtitle="One row per person. Dietary tags, food allergies, per-event invites, RSVP status, all in one place."
      actions={
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone" title="Download the CSV template with all Add-guest fields as headers"><FileText className="h-4 w-4" /> CSV template</button>
          <button onClick={importCsv} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone"><Upload className="h-4 w-4" /> Import</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone"><Download className="h-4 w-4" /> Export</button>
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay"><Plus className="h-4 w-4" /> Add guest</button>
        </div>
      }
    >
      {scopeEvent && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream/60 px-4 py-2.5">
          <p className="text-xs text-ink/80">Showing guests invited to <span className="font-medium">{scopeEvent.name}</span></p>
          <Link to="/guests" className="text-xs text-clay hover:text-ink cursor-pointer">Show all guests ×</Link>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total guests" value={stats.total} />
        <Stat label="Attending" value={stats.attending} accent />
        <Stat label="Pending replies" value={stats.pending} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full rounded-full border border-line pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
        <FilterSelect label="Family / Group" value={filterHousehold} onChange={setFilterHousehold}
          options={households.map((h) => ({ value: h, label: h }))} />
        <FilterSelect label="Dietary" value={filterDiet} onChange={setFilterDiet}
          options={[...DIETARY, ...ALLERGIES].map((t) => ({ value: t, label: t }))} />
        <FilterSelect label="Event" value={filterEvent} onChange={setFilterEvent}
          options={events.map((e) => ({ value: e.id, label: e.name }))} />
        <FilterSelect label="RSVP status" value={filterRsvp} onChange={setFilterRsvp}
          options={[
            { value: "attending", label: "Attending" },
            { value: "declined", label: "Declined" },
            { value: "pending", label: "Pending" },
            { value: "maybe", label: "Maybe" },
          ]} />
        <div className="relative">
          <button onClick={() => setColsOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">
            <Columns3 className="h-4 w-4" /> Columns
          </button>
          {colsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
              <div className="absolute right-0 mt-2 z-20 w-56 rounded-2xl border border-line bg-pearl shadow-lg p-2">
                <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Show columns</p>
                {ALL_COLS.map((c) => {
                  const on = showCol(c.key);
                  const disabled = c.key === "name";
                  return (
                    <button key={c.key} disabled={disabled} onClick={() => toggleCol(c.key)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-xl ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-blush-soft"}`}>
                      <span>{c.label}</span>
                      {on && <Check className="h-4 w-4 text-cherry" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-blush-soft via-cream to-sage/20 border border-line p-12 text-center">
          <h3 className="font-serif text-3xl">No guests yet</h3>
          <p className="mt-3 text-sm text-ink/70 max-w-lg mx-auto">Add guests one by one, or download the CSV template and import a whole spreadsheet. The template has every Add-guest field as a column, so nothing gets lost.</p>
          <button onClick={downloadTemplate} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay"><FileText className="h-4 w-4" /> Download CSV template</button>
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone/50 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                {showCol("name") && <th className="px-4 py-3">Guest name</th>}
                {showCol("household") && <th className="px-4 py-3">Family / Group</th>}
                {showCol("email") && <th className="px-4 py-3">Email</th>}
                {showCol("phone") && <th className="px-4 py-3">Phone</th>}
                {showCol("dietary") && <th className="px-4 py-3">Dietary</th>}
                {showCol("events") && <th className="px-4 py-3">Event</th>}
                {showCol("rsvp") && <th className="px-4 py-3">RSVP status</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const gi = inviteByGuest.get(g.id) ?? [];
                return (
                  <tr key={g.id} className="border-t border-line hover:bg-stone/30 align-top">
                    {showCol("name") && <td className="px-4 py-3 font-medium">{g.full_name}</td>}
                    {showCol("household") && <td className="px-4 py-3 text-xs text-muted-foreground">{g.household_group || "—"}</td>}
                    {showCol("email") && <td className="px-4 py-3 text-xs text-muted-foreground">{g.email || "—"}</td>}
                    {showCol("phone") && <td className="px-4 py-3 text-xs text-muted-foreground">{g.phone || "—"}</td>}
                    {showCol("dietary") && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {g.dietary_tags?.map((t) => <span key={t} className="text-[10px] bg-clay-soft text-clay rounded-full px-2 py-0.5">{t}</span>)}
                          {g.food_allergies?.map((t) => <span key={t} className="text-[10px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5">⚠ {t}</span>)}
                          {!g.dietary_tags?.length && !g.food_allergies?.length && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                    )}
                    {showCol("events") && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {gi.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {gi.map((i) => {
                            const ev = events.find((e) => e.id === i.event_id);
                            return <span key={i.id} className="text-[11px] rounded-full border border-line px-2 py-0.5 w-fit">{ev?.name ?? "?"}</span>;
                          })}
                        </div>
                      </td>
                    )}
                    {showCol("rsvp") && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {gi.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {gi.map((i) => {
                            const color = i.rsvp_status === "attending" ? "bg-clay-soft text-clay" : i.rsvp_status === "declined" ? "bg-destructive/10 text-destructive" : "bg-stone text-muted-foreground";
                            return <span key={i.id} className={`text-[10px] rounded-full px-2 py-0.5 w-fit capitalize ${color}`}>{i.rsvp_status}</span>;
                          })}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => copyRsvpLink(g)} title="Copy RSVP link" className="p-2 rounded-full hover:bg-stone"><Copy className="h-3.5 w-3.5" /></button>
                        {g.phone && <a href={`https://wa.me/${g.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${g.full_name}, please RSVP at ${window.location.origin}/rsvp/${g.rsvp_token}`)}`}
                          target="_blank" rel="noreferrer" className="p-2 rounded-full hover:bg-stone" title="Open WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a>}
                        <button onClick={() => setEditing(g)} className="text-xs rounded-full border border-line px-3 py-1 hover:bg-stone">Edit</button>
                        <button onClick={() => del(g.id)} className="p-2 rounded-full hover:bg-stone text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


      {editing && <GuestDialog guest={editing} events={events} existingInvites={editing.id ? (inviteByGuest.get(editing.id) ?? []) : []} onClose={() => setEditing(null)} onSave={save} />}
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="paper-card p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-serif text-3xl ${accent ? "text-clay" : ""}`}>{value}</p>
    </div>
  );
}

function GuestDialog({ guest, events, existingInvites, onClose, onSave }: {
  guest: Partial<Guest>; events: any[]; existingInvites: Invite[]; onClose: () => void;
  onSave: (g: Partial<Guest> & { invitedEventIds?: string[] }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Guest>>({ ...guest, dietary_tags: guest.dietary_tags ?? [], food_allergies: guest.food_allergies ?? [] });
  const [invited, setInvited] = useState<string[]>(existingInvites.map((i) => i.event_id));
  const [saving, setSaving] = useState(false);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave({ ...form, invitedEventIds: invited });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-xl w-full p-8 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">{guest.id ? "Edit guest" : "Add guest"}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="First name" required value={(form as any).first_name ?? form.full_name?.split(" ")[0] ?? ""} onChange={(v) => setForm({ ...form, first_name: v } as any)} />
            <F label="Last name" value={(form as any).last_name ?? form.full_name?.split(" ").slice(1).join(" ") ?? ""} onChange={(v) => setForm({ ...form, last_name: v } as any)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Email" type="email" value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })} />
            <F label="Phone (with country code)" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98…" />
          </div>
          <F label="Household / family group" value={form.household_group ?? ""} onChange={(v) => setForm({ ...form, household_group: v })} placeholder="e.g. Rao family" />

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Dietary tags</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, dietary_tags: toggle(form.dietary_tags ?? [], t) })}
                  className={`text-xs rounded-full border px-3 py-1 ${form.dietary_tags?.includes(t) ? "bg-clay-soft border-clay text-clay" : "border-line hover:bg-stone"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Food allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGIES.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, food_allergies: toggle(form.food_allergies ?? [], t) })}
                  className={`text-xs rounded-full border px-3 py-1 ${form.food_allergies?.includes(t) ? "bg-destructive/10 border-destructive text-destructive" : "border-line hover:bg-stone"}`}>⚠ {t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Dietary notes</label>
            <textarea rows={2} value={form.dietary_notes ?? ""} onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" placeholder="e.g. severe peanut allergy, no cross-contact" />
          </div>
          <F label="Accessibility notes" value={form.accessibility_notes ?? ""} onChange={(v) => setForm({ ...form, accessibility_notes: v })} placeholder="e.g. wheelchair access needed" />

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Invited to</p>
            {events.length === 0 ? <p className="text-xs text-muted-foreground">Add events first to invite this guest.</p> :
              <div className="flex flex-wrap gap-1.5">
                {events.map((e: any) => (
                  <button type="button" key={e.id} onClick={() => setInvited(toggle(invited, e.id))}
                    className={`text-xs rounded-full border px-3 py-1 ${invited.includes(e.id) ? "bg-ink text-paper border-ink" : "border-line hover:bg-stone"}`}>{e.name}</button>
                ))}
              </div>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
            <button disabled={saving} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay disabled:opacity-60">{saving ? "Saving…" : "Save guest"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
    </label>
  );
}
