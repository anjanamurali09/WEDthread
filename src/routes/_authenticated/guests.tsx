import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding, useRsvpQuestions, useRsvpResponses, type Guest, type Invite, type Wedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, Download, X, Trash2, Search, MessageCircle, Copy, FileText, Columns3, Check, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { PhotoEmptyState } from "@/components/photo-empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DIETARY, ALLERGIES } from "@/lib/dietary-tags";
import { DEFAULT_ACCEPT_LABEL, DEFAULT_DECLINE_LABEL, DEFAULT_MAYBE_LABEL } from "@/components/rsvp-form";
import { summarizeGuestRsvps } from "@/lib/rsvp-stats";

// Mirrors the wording the couple set on the RSVP builder (weddings.attendance_*_label,
// defaulting the same as the guest-facing form) so this table never drifts out of sync.
function rsvpStatusLabel(status: string, wedding?: Wedding | null): string {
  if (status === "attending") return wedding?.attendance_accept_label || DEFAULT_ACCEPT_LABEL;
  if (status === "declined") return wedding?.attendance_decline_label || DEFAULT_DECLINE_LABEL;
  if (status === "maybe") return wedding?.attendance_maybe_label || DEFAULT_MAYBE_LABEL;
  return "Pending";
}

const RSVP_STATUS_VALUES: Invite["rsvp_status"][] = ["attending", "declined", "maybe", "pending"];
function rsvpStatusOptions(wedding?: Wedding | null) {
  return RSVP_STATUS_VALUES.map((v) => ({ value: v, label: rsvpStatusLabel(v, wedding) }));
}

export const Route = createFileRoute("/_authenticated/guests")({
  component: GuestsPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

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
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const { data: guests = [], isLoading: guestsLoading } = useGuests(wedding?.id);
  const { data: invites = [], isLoading: invitesLoading } = useInvites(wedding?.id);
  const { data: rsvpQuestions = [] } = useRsvpQuestions(wedding?.id);
  const { data: rsvpResponses = [] } = useRsvpResponses(wedding?.id);
  const loading = weddingLoading || eventsLoading || guestsLoading || invitesLoading;

  // Only questions the couple has named a column for (RSVP builder's "Guest table
  // column" field) — everything else stays answer-log only, out of this table.
  const columnQuestions = useMemo(() => rsvpQuestions.filter((qq) => qq.guest_column_label), [rsvpQuestions]);
  const columnAnswers = useMemo(() => {
    const m = new Map<string, string[]>();
    rsvpResponses.forEach((r) => {
      const key = `${r.guest_id}:${r.question_id}`;
      const text = (r.answer_text ?? "").trim();
      if (!text) return;
      const list = m.get(key) ?? [];
      list.push(text);
      m.set(key, list);
    });
    return m;
  }, [rsvpResponses]);
  // A question scoped to multiple events can have a different answer per event —
  // joined here into one compact cell (the per-event breakdown lives in the RSVP
  // page's "See responses" view instead, this table stays a quick summary).
  const columnAnswerFor = (guestId: string, questionId: string) => (columnAnswers.get(`${guestId}:${questionId}`) ?? []).join(", ");
  const invalidate = useInvalidateWedding();
  const { event: scopeEventId } = Route.useSearch();
  const scopeEvent = scopeEventId ? events.find((e) => e.id === scopeEventId) : undefined;
  const [editing, setEditing] = useState<Partial<Guest> | null>(null);
  const [confirmDeleteGuest, setConfirmDeleteGuest] = useState<Guest | null>(null);
  const [q, setQ] = useState("");
  const [filterDiet, setFilterDiet] = useState<string[]>([]);
  const [filterHousehold, setFilterHousehold] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [filterRsvp, setFilterRsvp] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => {
    try { const s = localStorage.getItem("wedthread_guest_cols"); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_COLS;
  });
  const [colsOpen, setColsOpen] = useState(false);
  const toggleCol = (k: ColKey) => setVisibleCols((prev) => {
    const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
    try { localStorage.setItem("wedthread_guest_cols", JSON.stringify(next)); } catch {}
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

  const inviteByGuest = useMemo(() => {
    const m = new Map<string, Invite[]>();
    invites.forEach((i) => { const l = m.get(i.guest_id) ?? []; l.push(i); m.set(i.guest_id, l); });
    return m;
  }, [invites]);

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (scopedGuestIds && !scopedGuestIds.has(g.id)) return false;
      if (q && !g.full_name.toLowerCase().includes(q.toLowerCase()) && !(g.email || "").toLowerCase().includes(q.toLowerCase())) return false;
      if (filterDiet.length && !filterDiet.some((d) => g.dietary_tags?.includes(d) || g.food_allergies?.includes(d))) return false;
      if (filterHousehold && g.household_group !== filterHousehold) return false;
      const gi = inviteByGuest.get(g.id) ?? [];
      if (filterEvent && !gi.some((i) => i.event_id === filterEvent)) return false;
      if (filterRsvp && !gi.some((i) => i.rsvp_status === filterRsvp)) return false;
      return true;
    });
  }, [guests, q, filterDiet, filterHousehold, filterEvent, filterRsvp, scopedGuestIds, inviteByGuest]);

  const anyFilter = !!(q || filterDiet.length || filterHousehold || filterEvent || filterRsvp);
  const clearFilters = () => { setQ(""); setFilterDiet([]); setFilterHousehold(null); setFilterEvent(null); setFilterRsvp(null); };

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
    a.href = URL.createObjectURL(blob); a.download = "wedthread-guest-template.csv"; a.click();
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
        toast.success(`Imported ${formatNumber(inserts.length)} guests`);
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
      setEditing(null); invalidate(wedding.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(wedding?.id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteGuest) return;
    await del(confirmDeleteGuest.id);
    setConfirmDeleteGuest(null);
  };

  // Couple's manual override: writes straight to guest_event_invites, tagged
  // rsvp_source='manual' for audit purposes. If the guest later submits the form
  // themselves, submit_rsvp always reclaims rsvp_source='guest_submitted' and
  // overwrites the status — their own word wins over a manual entry.
  const setInviteStatus = async (invite: Invite, status: Invite["rsvp_status"]) => {
    const { error } = await supabase
      .from("guest_event_invites")
      .update({ rsvp_status: status, rsvp_source: "manual", rsvp_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (error) return toast.error(error.message);
    invalidate(wedding?.id);
  };

  // Unlink just this guest+event pair — deletes the one guest_event_invites row,
  // not the guest or the event. Stats recompute from the shrunk invites array, so
  // a guest with no remaining invites drops out of every count (see rsvp-stats.ts).
  const removeInvite = async (invite: Invite) => {
    const { error } = await supabase.from("guest_event_invites").delete().eq("id", invite.id);
    if (error) return toast.error(error.message);
    invalidate(wedding?.id);
  };

  const copyRsvpLink = async (g: Guest) => {
    const url = `${window.location.origin}/rsvp/${g.rsvp_token}`;
    await navigator.clipboard.writeText(url);
    toast.success("RSVP link copied");
  };

  // A guest counts as Attending if they've accepted at least one of their (relevant)
  // invited events, and as Pending unless they've given a firm accept/decline to EVERY
  // one of them — narrows to a single event's invite when that event is filtered/scoped.
  // See src/lib/rsvp-stats.ts for the shared per-guest definition used across the app.
  const activeEventId = filterEvent || scopeEventId || null;
  const stats = useMemo(() => {
    const { attending, pending } = summarizeGuestRsvps(filtered.map((g) => g.id), invites, activeEventId);
    return { total: filtered.length, attending, pending };
  }, [filtered, invites, activeEventId]);

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
          <p className="text-sm text-ink">Showing guests invited to <span className="font-medium">{scopeEvent.name}</span></p>
          <Link to="/guests" className="text-sm text-clay hover:text-ink cursor-pointer">Show all guests ×</Link>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            <Stat label="Total guests" value={stats.total} />
            <Stat label="Attending" value={stats.attending} tone="sage" />
            <Stat label="Pending replies" value={stats.pending} tone="gold" />
          </section>


      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full rounded-full border border-line pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
        <FilterSelect label="Family / Group" value={filterHousehold} onChange={setFilterHousehold}
          options={households.map((h) => ({ value: h, label: h }))} />
        <FilterMultiSelect label="Dietary" value={filterDiet} onChange={setFilterDiet}
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

      <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
        <p>
          {anyFilter ? (
            <><span className="font-medium text-ink">{formatNumber(filtered.length)}</span> of {formatNumber(guests.length)} guests match</>
          ) : (
            <><span className="font-medium text-ink">{formatNumber(guests.length)}</span> guest{guests.length === 1 ? "" : "s"}</>
          )}
        </p>
        {anyFilter && (
          <button onClick={clearFilters} className="text-clay hover:text-ink cursor-pointer">Clear filters ×</button>
        )}
      </div>


      {guests.length === 0 ? (
        <PhotoEmptyState
          photo="cane"
          eyebrow="Your guest list"
          title="Build your guest list"
          body="Add guests one by one, or download the CSV template and import a whole spreadsheet. Every Add-guest field is a column, so nothing gets lost in translation."
        >
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay"><FileText className="h-4 w-4" /> Download CSV template</button>
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 text-sm hover:bg-blush-soft"><Plus className="h-4 w-4" /> Add first guest</button>
        </PhotoEmptyState>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-sage-soft text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                {showCol("name") && <th className="px-4 py-3 whitespace-nowrap">Guest name</th>}
                {showCol("household") && <th className="px-4 py-3 whitespace-nowrap">Family / Group</th>}
                {showCol("email") && <th className="px-4 py-3 whitespace-nowrap">Email</th>}
                {showCol("phone") && <th className="px-4 py-3 whitespace-nowrap">Phone</th>}
                {showCol("dietary") && <th className="px-4 py-3 whitespace-nowrap">Dietary</th>}
                {showCol("events") && <th className="px-4 py-3 whitespace-nowrap">Event</th>}
                {showCol("rsvp") && <th className="px-4 py-3 whitespace-nowrap">RSVP status</th>}
                {columnQuestions.map((cq) => (
                  <th key={cq.id} className="px-4 py-3 whitespace-nowrap">{cq.guest_column_label}</th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const gi = inviteByGuest.get(g.id) ?? [];
                return (
                  <tr key={g.id} className="border-t border-line hover:bg-stone/30 align-top">
                    {showCol("name") && <td className="px-4 py-3 font-medium whitespace-nowrap">{g.full_name}</td>}
                    {showCol("household") && <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{g.household_group || "—"}</td>}
                    {showCol("email") && <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{g.email || "—"}</td>}
                    {showCol("phone") && <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{g.phone || "—"}</td>}
                    {showCol("dietary") && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {g.dietary_tags?.map((t) => <span key={t} className="text-[11px] bg-clay-soft text-clay rounded-full px-2 py-0.5 whitespace-nowrap">{t}</span>)}
                          {g.food_allergies?.map((t) => <span key={t} className="text-[11px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5 whitespace-nowrap">⚠ {t}</span>)}
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
                            return (
                              <button key={i.id} type="button"
                                onClick={() => removeInvite(i)}
                                className="group inline-flex items-center gap-1 text-[11px] rounded-full border border-line px-2 py-0.5 w-fit whitespace-nowrap hover:bg-stone transition-colors cursor-pointer">
                                {ev?.name ?? "?"}
                                <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                    {showCol("rsvp") && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {gi.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {gi.map((i) => (
                            <RsvpStatusPicker
                              key={i.id}
                              value={i.rsvp_status}
                              options={rsvpStatusOptions(wedding)}
                              onChange={(v) => setInviteStatus(i, v as Invite["rsvp_status"])}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                    {columnQuestions.map((cq) => {
                      const answer = columnAnswerFor(g.id, cq.id);
                      return (
                        <td key={cq.id} className="px-4 py-3 text-xs whitespace-nowrap">
                          {answer || <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => copyRsvpLink(g)} title="Copy RSVP link" className="p-2 rounded-full hover:bg-stone"><Copy className="h-3.5 w-3.5" /></button>
                        <a href={`https://wa.me/${g.phone ? g.phone.replace(/[^0-9]/g, "") : ""}?text=${encodeURIComponent(`Hi ${g.full_name}, please RSVP at ${window.location.origin}/rsvp/${g.rsvp_token}`)}`}
                          target="_blank" rel="noreferrer" className="p-2 rounded-full hover:bg-stone" title="Open WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a>
                        <button onClick={() => setEditing(g)} className="text-xs rounded-full border border-line px-3 py-1 hover:bg-stone">Edit</button>
                        <button onClick={() => setConfirmDeleteGuest(g)} className="p-2 rounded-full hover:bg-stone text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {editing && <GuestDialog guest={editing} events={events} existingInvites={editing.id ? (inviteByGuest.get(editing.id) ?? []) : []} onClose={() => setEditing(null)} onSave={save} />}
      {confirmDeleteGuest && (
        <ConfirmDialog
          title="Remove guest"
          description={`This removes ${confirmDeleteGuest.full_name} and all their event invites, seating assignments, and RSVP answers. This can't be undone.`}
          confirmLabel="Remove guest"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteGuest(null)}
        />
      )}
    </AppShell>
  );
}

const STAT_TONE = {
  sage: { card: "bg-sage-soft/50 border border-sage-deep/20", text: "text-sage-deep" },
  gold: { card: "bg-gold-soft/50 border border-gold-deep/20", text: "text-gold-deep" },
} as const;

function Stat({ label, value, tone }: { label: string; value: number; tone?: keyof typeof STAT_TONE }) {
  const t = tone ? STAT_TONE[tone] : null;
  return (
    <div className={`paper-card p-5 ${t?.card ?? ""}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-serif text-3xl ${t?.text ?? ""}`}>{formatNumber(value)}</p>
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
          <F label="Family / Group" value={form.household_group ?? ""} onChange={(v) => setForm({ ...form, household_group: v })} placeholder="e.g. Rao family" />

          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Dietary tags</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, dietary_tags: toggle(form.dietary_tags ?? [], t) })}
                  className={`text-sm rounded-full border px-3 py-1 ${form.dietary_tags?.includes(t) ? "bg-clay-soft border-clay text-clay" : "border-line hover:bg-stone"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Food allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGIES.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, food_allergies: toggle(form.food_allergies ?? [], t) })}
                  className={`text-sm rounded-full border px-3 py-1 ${form.food_allergies?.includes(t) ? "bg-destructive/10 border-destructive text-destructive" : "border-line hover:bg-stone"}`}>⚠ {t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm uppercase tracking-widest text-muted-foreground">Dietary notes</label>
            <textarea rows={2} value={form.dietary_notes ?? ""} onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" placeholder="e.g. severe peanut allergy, no cross-contact" />
          </div>
          <F label="Accessibility notes" value={form.accessibility_notes ?? ""} onChange={(v) => setForm({ ...form, accessibility_notes: v })} placeholder="e.g. wheelchair access needed" />

          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Invited to</p>
            {events.length === 0 ? <p className="text-sm text-muted-foreground">Add events first to invite this guest.</p> :
              <div className="flex flex-wrap gap-1.5">
                {events.map((e: any) => (
                  <button type="button" key={e.id} onClick={() => setInvited(toggle(invited, e.id))}
                    className={`text-sm rounded-full border px-3 py-1 ${invited.includes(e.id) ? "bg-ink text-paper border-ink" : "border-line hover:bg-stone"}`}>{e.name}</button>
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
      <span className="text-sm uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
    </label>
  );
}

// Hover- or click-opens a row of same-size status pills floating to the right of the
// current pill — no card/panel chrome, per the Event pills' inline look. Uses Radix
// Popover (portaled to document.body) rather than a hand-rolled absolute panel because
// this control lives inside the table's overflow-x-auto scroller: a plain absolutely-
// positioned popup would get clipped by that scroller when it overflows; Radix's portal
// escapes it, and its built-in collision detection flips left/shifts on-screen for real
// instead of a hand-rolled width-guess.
// attending/declined get a status color (existing sage/cherry tokens — no new colors);
// maybe/pending stay neutral, unchanged.
const RSVP_COLOR: Record<string, { tint: string; solid: string }> = {
  attending: { tint: "border-sage-deep/40 text-sage-deep bg-sage-soft/40", solid: "bg-sage-deep text-paper border-sage-deep" },
  declined: { tint: "border-cherry/40 text-cherry bg-cherry/10", solid: "bg-cherry text-paper border-cherry" },
};

function RsvpStatusPicker({ value, options, onChange }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = options.find((o) => o.value === value);
  const activeColor = RSVP_COLOR[value];

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 150); };
  useEffect(() => () => cancelClose(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}
          className={cn(
            // Matches the Event pill's classes exactly (same td's sibling column) — same
            // padding/font/rounding. `w-fit` is the load-bearing one: this button sits in
            // a `flex flex-col` cell just like the Event pill, and without it the button
            // stretches to the cell's full width under flexbox's default align-items:
            // stretch, which is what made this pill read as bigger despite identical text.
            "inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 w-fit whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-clay/40",
            activeColor ? cn(activeColor.tint, "hover:opacity-80") : "border-line hover:bg-stone",
          )}>
          {active?.label ?? "Pending"}
        </button>
      </PopoverTrigger>
      {/* Opens to the right of the trigger (not centered on it) as a compact vertical
          stack of independent pills — no outer box; the old horizontal flex-wrap +
          transparent background + center-aligned popup could grow wide enough to
          overlap the guest row below and visually blend into that row's Event pills.
          z-[60] plus the Portal (see ui/popover.tsx) keeps it above every row, including
          near the bottom of the table; Radix's built-in collision detection
          (collisionPadding) flips it back on-screen there too. */}
      <PopoverContent
        side="right" align="start" sideOffset={6} collisionPadding={12}
        onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
        className="z-[60] w-max max-w-[calc(100vw-2rem)] flex flex-col gap-1 rounded-none border-0 bg-transparent p-0 shadow-none">
        {options.map((o) => {
          const color = RSVP_COLOR[o.value];
          const selected = o.value === value;
          return (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-clay/40",
                selected
                  ? (color ? color.solid : "bg-ink text-paper border-ink")
                  : (color ? cn(color.tint, "hover:opacity-80") : "border-line bg-paper hover:bg-stone"),
              )}>
              {selected && <Check className="h-2.5 w-2.5" />}
              {o.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string | null; onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const active = value ? options.find((o) => o.value === value) : null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm cursor-pointer transition-colors ${active ? "bg-clay text-paper border-clay" : "border-line hover:bg-stone"}`}>
        <span className="uppercase tracking-widest text-[10px] opacity-80">{label}</span>
        <span className="font-medium">{active?.label ?? "Any"}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-20 w-56 max-h-72 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft ${!value ? "font-medium" : ""}`}>Any</button>
            {options.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No options yet</p>}
            {options.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft flex items-center justify-between gap-2 ${value === o.value ? "font-medium" : ""}`}>
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check className="h-3.5 w-3.5 text-cherry shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterMultiSelect({ label, value, onChange, options }: {
  label: string; value: string[]; onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm cursor-pointer transition-colors ${value.length ? "bg-clay text-paper border-clay" : "border-line hover:bg-stone"}`}>
        <span className="uppercase tracking-widest text-[10px] opacity-80">{label}</span>
        <span className="font-medium">{value.length ? `${formatNumber(value.length)} selected` : "Any"}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-20 w-56 max-h-72 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button onClick={() => { onChange([]); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft ${!value.length ? "font-medium" : ""}`}>Any</button>
            {options.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No options yet</p>}
            {options.map((o) => (
              <button key={o.value} onClick={() => toggle(o.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft flex items-center justify-between gap-2 ${value.includes(o.value) ? "font-medium" : ""}`}>
                <span className="truncate">{o.label}</span>
                {value.includes(o.value) && <Check className="h-3.5 w-3.5 text-cherry shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
