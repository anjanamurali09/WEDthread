import { createFileRoute, Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding, type Event } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  Plus, Trash2, X, CalendarDays, Users, Armchair, MapPin, Gift, Globe2, Handshake, ChevronRight, GripVertical, Check, Gauge, Utensils, Shirt, ImagePlus, Loader2,
} from "lucide-react";
import { DatePicker } from "@/components/ui/datepicker";
import { TimePicker } from "@/components/ui/timepicker";
import { cn, formatNumber, truncateWords } from "@/lib/utils";
import { PhotoEmptyState } from "@/components/photo-empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PhotoCropDialog } from "@/components/photo-crop-dialog";

export const Route = createFileRoute("/_authenticated/events")({ component: EventsPage });

const PHOTO_HIDDEN_KEY = "wedthread_events_photo_hidden";

// Roughly most to least common across weddings, cultural traditions interleaved rather than grouped.
const SUGGESTIONS = [
  "Wedding ceremony", "Reception", "Welcome party", "Sangeet", "Cocktail hour",
  "Rehearsal dinner", "Mehendi", "Tea ceremony", "Nikah", "Baraat", "Haldi",
  "Chuppah", "Civil registry", "Pool party", "After-party", "Farewell brunch",
];

type CatKey = "guests" | "seating" | "venue" | "registry" | "website" | "vendors" | "menu";
const ALL_CATEGORIES: { key: CatKey; label: string; icon: any; to: string }[] = [
  { key: "guests",   label: "Guests",   icon: Users,     to: "/guests" },
  { key: "seating",  label: "Seating",  icon: Armchair,  to: "/seating" },
  { key: "venue",    label: "Venue",    icon: MapPin,    to: "/venues" },
  { key: "menu",     label: "Menu",     icon: Utensils,  to: "/menu" },
  { key: "registry", label: "Registry", icon: Gift,      to: "/registry" },
  { key: "website",  label: "Website",  icon: Globe2,    to: "/website" },
  { key: "vendors",  label: "Vendors",  icon: Handshake, to: "/vendors" },
];

type CompletionMode = "percentage" | "fraction" | "boolean";
const COMPLETION_MODES: { value: CompletionMode; label: string }[] = [
  { value: "percentage", label: "Percentage" },
  { value: "fraction", label: "Fraction" },
  { value: "boolean", label: "Yes / No" },
];

type CategoryCompletionEntry = {
  mode: CompletionMode;
  percent: number;
  fractionCurrent: number;
  fractionTotal: number;
  done: boolean;
};
type CategoryCompletion = Partial<Record<CatKey, CategoryCompletionEntry>>;

const DEFAULT_CATEGORY_ENTRY: CategoryCompletionEntry = { mode: "percentage", percent: 0, fractionCurrent: 0, fractionTotal: 1, done: false };

function parseCategoryCompletion(raw: unknown): CategoryCompletion {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as CategoryCompletion;
  return {};
}

function enabledCategoriesFor(event: Pick<Event, "enabled_categories">): CatKey[] {
  return (event.enabled_categories?.length ? event.enabled_categories : ALL_CATEGORIES.map((c) => c.key)) as CatKey[];
}

// Normalizes any tracking style to a 0-100 equivalent so categories with
// different styles can still be averaged into one overall percentage.
function categoryPercent(entry: CategoryCompletionEntry | undefined): number {
  if (!entry) return 0;
  if (entry.mode === "boolean") return entry.done ? 100 : 0;
  if (entry.mode === "fraction") {
    const total = Math.max(1, entry.fractionTotal ?? 1);
    return Math.min(100, Math.round(((entry.fractionCurrent ?? 0) / total) * 100));
  }
  return Math.max(0, Math.min(100, entry.percent ?? 0));
}

function eventOverallPercent(event: Event): number {
  const cats = enabledCategoriesFor(event);
  if (!cats.length) return 0;
  const cc = parseCategoryCompletion(event.category_completion);
  const sum = cats.reduce((acc, k) => acc + categoryPercent(cc[k]), 0);
  return Math.round(sum / cats.length);
}

function EventsPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading } = useEvents(wedding?.id);
  const { data: guests = [], isLoading: guestsLoading } = useGuests(wedding?.id);
  const { data: invites = [], isLoading: invitesLoading } = useInvites(wedding?.id);
  const invalidate = useInvalidateWedding();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(() => {
    try { return localStorage.getItem(PHOTO_HIDDEN_KEY) !== "1"; } catch { return true; }
  });
  const togglePhoto = () => {
    setShowPhoto((prev) => {
      const next = !prev;
      try { localStorage.setItem(PHOTO_HIDDEN_KEY, next ? "0" : "1"); } catch {}
      return next;
    });
  };

  // Global counts for wedding-wide categories (registry / website / vendors)
  const { data: counts, isLoading: countsLoading } = useQuery({
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
  const { data: tableCounts = {}, isLoading: tableCountsLoading } = useQuery({
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
      dress_code: e.dress_code || null,
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
        track("event_created");
      }
      setEditing(null);
      invalidate(wedding.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const saveCategoryCompletion = async (eventId: string, completion: CategoryCompletion) => {
    const { error } = await supabase.from("events").update({ category_completion: completion as any }).eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    invalidate(wedding?.id);
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidate(wedding?.id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await del(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  // Reuses the same couple photo shown on the dashboard mindmap (wedding.
  // couple_photo_url) rather than a new field — one "this is us" photo for
  // the wedding, kept in sync wherever it appears, no new migration needed.
  const uploadEventsPhoto = async (file: File) => {
    if (!wedding) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${wedding.id}/couple-photo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("wedding-assets").getPublicUrl(path);
    // Reset the crop — a leftover zoom/pan from a previous photo has no
    // meaning against a brand new one (same reset the dashboard mindmap's
    // own upload does).
    const { error: updateError } = await supabase.from("weddings")
      .update({ couple_photo_url: data.publicUrl, couple_photo_zoom: 1, couple_photo_pan_x: 0, couple_photo_pan_y: 0 }).eq("id", wedding.id);
    if (updateError) { toast.error(updateError.message); return; }
    invalidate(wedding.id);
  };

  const updateEventsPhotoCrop = async (zoom: number, panX: number, panY: number) => {
    if (!wedding) return;
    const { error } = await supabase.from("weddings").update({ couple_photo_zoom: zoom, couple_photo_pan_x: panX, couple_photo_pan_y: panY }).eq("id", wedding.id);
    if (error) { toast.error(error.message); return; }
    invalidate(wedding.id);
  };

  const persistOrder = async (ordered: Event[]) => {
    qc.setQueryData(["events", wedding?.id], ordered);
    await Promise.all(ordered.map((e, i) => supabase.from("events").update({ sort_order: i }).eq("id", e.id)));
    invalidate(wedding?.id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = events.findIndex((ev) => ev.id === active.id);
    const newIdx = events.findIndex((ev) => ev.id === over.id);
    persistOrder(arrayMove(events, oldIdx, newIdx));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  return (
    <AppShell
      title="Events"
      subtitle="Each event is its own mini planning hub for guests, seating, vendors, and more."
      actions={
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <button onClick={() => setTrackOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
              <Gauge className="h-4 w-4" /> Track Progress
            </button>
          )}
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
            <Plus className="h-4 w-4" /> Add event
          </button>
        </div>
      }
    >
      {weddingLoading || isLoading || guestsLoading || invitesLoading || countsLoading || tableCountsLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        events.length === 0 ? (
          <PhotoEmptyState
            photo="marigold"
            variant="landscape"
            eyebrow="Every celebration in one place"
            title="Add your first celebration"
            body="Add a mehendi, a welcome cocktail, a beach ceremony, a farewell brunch, whatever your two families are celebrating. Start with one of the traditions below or write your own."
          >
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setEditing({ name: s })} className="shrink-0 whitespace-nowrap rounded-full bg-paper border border-line px-4 py-1.5 text-sm hover:bg-clay hover:text-paper hover:border-clay transition-colors cursor-pointer">+ {s}</button>
            ))}
          </PhotoEmptyState>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm text-muted-foreground">{formatNumber(events.length)} event{events.length === 1 ? "" : "s"}</p>
              <button type="button" onClick={togglePhoto} className="text-sm text-clay hover:underline cursor-pointer shrink-0">
                {showPhoto ? "Hide photo" : "Show photo"}
              </button>
            </div>
            <div className={cn("lg:grid lg:gap-8 lg:items-start mx-auto", showPhoto ? "lg:grid-cols-[3fr_3fr_3fr] max-w-[1400px]" : "lg:grid-cols-[1fr_1fr]")}>
              {/* Each pane sticky and scrolling on its own once it's actually taller than
                  the available space — a long event list or a long agenda shouldn't push
                  the other panes (or the photo) around. max-h, capped a touch taller than
                  before (14.5rem of headroom instead of 17rem). */}
              <div className="lg:sticky lg:top-40 lg:max-h-[calc(100vh-14.5rem)] lg:overflow-y-auto lg:no-scrollbar lg:pr-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid gap-4">
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
                          onDelete={() => setConfirmDeleteId(e.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {showPhoto && (
                <EventsPhotoPanel
                  photoUrl={wedding?.couple_photo_url ?? null}
                  zoom={wedding?.couple_photo_zoom ?? 1}
                  panX={wedding?.couple_photo_pan_x ?? 0}
                  panY={wedding?.couple_photo_pan_y ?? 0}
                  onUpload={uploadEventsPhoto}
                  onCropChange={updateEventsPhotoCrop}
                />
              )}

              <AgendaPreview events={events} />
            </div>
          </>
        )
      }

      {editing && <EventDialog event={editing} onClose={() => setEditing(null)} onSave={save} />}
      {trackOpen && <TrackProgressModal events={events} onClose={() => setTrackOpen(false)} onSave={saveCategoryCompletion} />}
      {confirmDeleteId && (() => {
        const ev = events.find((e) => e.id === confirmDeleteId);
        const invitedCount = invites.filter((i) => i.event_id === confirmDeleteId).length;
        return (
          <ConfirmDialog
            title="Delete event"
            description={invitedCount > 0
              ? `Delete "${ev?.name ?? "this event"}"? ${formatNumber(invitedCount)} guest invite${invitedCount === 1 ? "" : "s"}, its seating plan, and its menu will all be removed. This can't be undone.`
              : `Delete "${ev?.name ?? "this event"}"? Its seating plan and menu will also be removed. This can't be undone.`}
            confirmLabel="Delete event"
            onConfirm={confirmDelete}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </AppShell>
  );
}

function EventCard({ event, index, guests, invites, tableCount, counts, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id });
  const enabled: CatKey[] = event.enabled_categories?.length ? event.enabled_categories : ALL_CATEGORIES.map((c) => c.key);
  const invited = invites.filter((i: any) => i.event_id === event.id);
  const accepted = invited.filter((i: any) => i.rsvp_status === "attending").length;

  const statusFor = (k: CatKey): { text: string; hasData: boolean } => {
    switch (k) {
      case "guests":   return invited.length ? { text: `${formatNumber(invited.length)} invited · ${formatNumber(accepted)} yes`, hasData: true } : { text: "Add your first guests", hasData: false };
      case "seating":  return tableCount ? { text: `${formatNumber(tableCount)} table${tableCount === 1 ? "" : "s"} set`, hasData: true } : { text: "Design the floor plan", hasData: false };
      case "venue":    return event.venue_name ? { text: event.venue_name, hasData: true } : { text: "Add venue details", hasData: false };
      case "menu":     return { text: "Build out the menu", hasData: false };
      case "registry": return counts?.regItems ? { text: `${formatNumber(counts.regItems)} gift${counts.regItems === 1 ? "" : "s"}`, hasData: true } : { text: "Add your first gift", hasData: false };
      case "website":  return counts?.siteSections ? { text: `${formatNumber(counts.siteSections)} section${counts.siteSections === 1 ? "" : "s"}`, hasData: true } : { text: "Choose a template", hasData: false };
      case "vendors":  return { text: "Browse vendors", hasData: false };
    }
  };

  const rows = ALL_CATEGORIES.filter((c) => enabled.includes(c.key));

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="paper-card p-6 flex flex-col morph-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          <button {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-ink shrink-0">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-clay">Event {index + 1}</p>
            <h3 className="mt-1 font-serif text-2xl truncate">{event.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" }) : "Date TBD"}
              {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
              {event.city || event.country ? ` · ${[event.city, event.country].filter(Boolean).join(", ")}` : ""}
            </p>
          </div>
        </div>
        <ProgressRing pct={eventOverallPercent(event)} />
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
              <span className={cn("text-sm flex-1 truncate", s.hasData ? "text-ink" : "text-muted-foreground italic")}>{s.text}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ink transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onEdit} className="text-sm rounded-full border border-line px-3 py-1.5 hover:bg-stone cursor-pointer">Edit event</button>
        <button onClick={onDelete} className="text-sm rounded-full border border-line px-3 py-1.5 hover:bg-stone text-muted-foreground cursor-pointer ml-auto"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

// Sits between the event list and the Agenda preview — a photo of the
// couple, purely decorative, to make the page feel like theirs rather than
// a bare planning tool. Shares wedding.couple_photo_url (and its zoom/pan
// crop) with the dashboard mindmap's center photo, so there's one "this is
// us" photo per wedding, adjustable the same way in both places — same
// PhotoCropDialog, just a tall rectangular frame here instead of a circle.
function EventsPhotoPanel({ photoUrl, zoom, panX, panY, onUpload, onCropChange }: {
  photoUrl: string | null; zoom: number; panX: number; panY: number;
  onUpload: (file: File) => Promise<void>; onCropChange: (zoom: number, panX: number, panY: number) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropAspect, setCropAspect] = useState(4 / 5);
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    await onUpload(file);
    setUploading(false);
  };

  // Measured from the actual on-page frame right before opening the
  // dialog — its own aspect ratio is responsive (tall rectangle on
  // desktop, a fixed 4:5 box below lg), so a hardcoded ratio would crop
  // differently in the dialog than what's actually shown here.
  const openCrop = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) setCropAspect(rect.width / rect.height);
    setCropOpen(true);
  };

  return (
    <div className="mt-8 lg:mt-0 lg:sticky lg:top-40 lg:h-[calc(100vh-14.5rem)] lg:max-h-[638px] mx-auto lg:max-w-[380px] w-full">
      <div ref={frameRef} className="group relative aspect-[4/5] lg:aspect-auto lg:h-full rounded-3xl overflow-hidden border border-line bg-stone">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        {photoUrl ? (
          <>
            <img src={photoUrl} className="absolute inset-0 w-full h-full object-cover" alt=""
              style={{ transform: `translate(${panX}%, ${panY}%) scale(${zoom})` }} />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-end justify-center gap-2 pb-5 opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-paper/95 text-ink px-4 py-2 text-sm font-medium hover:bg-paper cursor-pointer">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Replace"}
              </button>
              <button type="button" onClick={openCrop}
                className="rounded-full bg-paper/95 text-ink px-4 py-2 text-sm font-medium hover:bg-paper cursor-pointer">
                Adjust
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 hover:bg-cream/40 transition-colors cursor-pointer">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-ink">{uploading ? "Uploading…" : "Add a photo"}</p>
            <p className="mt-1 text-sm text-muted-foreground">A photo of the two of you, right between your events and agenda.</p>
          </button>
        )}
      </div>

      {cropOpen && photoUrl && (
        <PhotoCropDialog src={photoUrl} zoom={zoom} panX={panX} panY={panY} aspectRatio={cropAspect}
          frameClassName="mx-auto max-h-[55vh] max-w-full rounded-2xl"
          onSave={(z, x, y) => { onCropChange(z, x, y); setCropOpen(false); }}
          onClose={() => setCropOpen(false)} />
      )}
    </div>
  );
}

// A read-only, guest-facing-style preview of the schedule — the same
// events from the list on the left, grouped by date and formatted like an
// actual wedding agenda, so the couple can see at a glance how their
// schedule reads before it goes on the website/invites.
function AgendaPreview({ events }: { events: Event[] }) {
  const sorted = [...events].sort((a, b) =>
    (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999") || (a.event_time ?? "99:99").localeCompare(b.event_time ?? "99:99"));

  const groups: { key: string; label: string; events: Event[] }[] = [];
  for (const e of sorted) {
    const key = e.event_date ?? "tbd";
    const label = e.event_date
      ? new Date(e.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
      : "Date TBD";
    const group = groups.find((g) => g.key === key);
    if (group) group.events.push(e);
    else groups.push({ key, label, events: [e] });
  }

  const formatTime = (t: string | null | undefined) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <div className="rounded-3xl border border-line bg-paper p-8 mt-8 lg:mt-0 lg:sticky lg:top-40 lg:max-h-[calc(100vh-14.5rem)] flex flex-col">
      <p className="text-sm uppercase tracking-widest text-muted-foreground shrink-0">Preview</p>
      <h2 className="font-serif text-3xl mt-1 shrink-0">Agenda</h2>

      <div className="mt-6 grid gap-8 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:no-scrollbar pr-1">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="text-xs uppercase tracking-widest text-clay border-b border-line/60 pb-2 mb-4">{g.label}</p>
            <div className="grid gap-5">
              {g.events.map((e) => {
                const start = formatTime(e.event_time);
                const end = formatTime((e as any).event_end_time);
                const place = [e.venue_name, e.address, [e.city, e.country].filter(Boolean).join(", ")].filter(Boolean).join(", ");
                return (
                  <div key={e.id} className="text-center">
                    <p className="font-serif text-lg">{e.name}</p>
                    {(start || place) && (
                      <p className="text-xs text-cherry mt-0.5">
                        {start ? `${start}${end ? ` – ${end}` : ""}` : null}
                        {start && place ? " · " : ""}
                        {place}
                      </p>
                    )}
                    {e.description && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{truncateWords(e.description, 60)}</p>
                    )}
                    {e.dress_code && (
                      <p className="mt-2 text-xs text-cherry inline-flex items-center gap-1.5">
                        <Shirt className="h-3 w-3" /> {e.dress_code}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
        <circle cx="22" cy="22" r={r} stroke="currentColor" strokeWidth="4" className="text-stone-2" fill="none" />
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
    // A new event starts with nothing chosen so the couple picks what it needs; older events without a saved
    // choice keep showing everything, as they always did.
    ((event as any).enabled_categories as CatKey[] | undefined) ?? (event.id ? ALL_CATEGORIES.map((c) => c.key) : []),
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

  const pickerClass = "px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5";
  const labelClass = "block text-[10px] uppercase tracking-widest text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-5 max-h-[92vh] shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-xl">{event.id ? "Edit event" : "Add event"}</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form noValidate onSubmit={submit} className="mt-3">
          {/* The first fields (down to country) are always in view; the rest scrolls inside this area. */}
          <div className="relative -mx-1 max-h-[min(16rem,52vh)] space-y-2.5 overflow-y-auto px-1 pb-1">
          <F label="Name of event" required value={form.name ?? ""} onChange={(v) => setField("name", v)} error={touched.name ? errors.name : undefined} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Date</label>
              <div className="mt-1">
                <DatePicker value={form.event_date ?? ""} onChange={(v) => setField("event_date", v)} placeholder="Pick a date" displayFormat="MMM d, yyyy" className={pickerClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Start time</label>
              <div className="mt-1">
                <TimePicker value={form.event_time ?? ""} onChange={(v) => setField("event_time", v)} className={cn("rounded-xl bg-pearl", pickerClass)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>End time</label>
              <div className="mt-1">
                <TimePicker value={(form as any).event_end_time ?? ""} onChange={(v) => setField("event_end_time" as any, v)} className={cn("rounded-xl bg-pearl", pickerClass)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="Venue name" value={form.venue_name ?? ""} onChange={(v) => setField("venue_name", v)} />
            <F label="Address" value={form.address ?? ""} onChange={(v) => setField("address", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="City" value={form.city ?? ""} onChange={(v) => setField("city", v)} />
            <F label="Country" value={form.country ?? ""} onChange={(v) => setField("country", v)} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay bg-paper" />
          </div>
          <F label="Dress code" value={form.dress_code ?? ""} onChange={(v) => setField("dress_code", v)} />

          <div className="pt-1">
            <label className={labelClass}>What does this event need?</label>
            <p className="mt-0.5 text-xs text-muted-foreground">Tap to choose. Only the ones you pick show up on the event card.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((c) => {
                const on = enabled.includes(c.key);
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleCat(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors cursor-pointer",
                      on
                        ? "border border-solid border-ink bg-ink text-paper font-medium"
                        : "border border-dashed border-ink/40 bg-transparent text-muted-foreground hover:border-ink/70 hover:text-ink",
                    )}
                  >
                    {on ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-1.5 text-sm border border-line hover:bg-stone cursor-pointer">Cancel</button>
            <button disabled={saving} className="rounded-full bg-ink text-paper px-5 py-1.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">{saving ? "Saving…" : "Save event"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrackProgressModal({ events, onClose, onSave }: {
  events: Event[]; onClose: () => void; onSave: (eventId: string, completion: CategoryCompletion) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const [draft, setDraft] = useState<CategoryCompletion>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectEvent = (event: Event) => {
    setSelectedId(event.id);
    setDraft(parseCategoryCompletion(event.category_completion));
    setSaved(false);
  };

  const entryFor = (k: CatKey): CategoryCompletionEntry => draft[k] ?? DEFAULT_CATEGORY_ENTRY;

  const updateEntry = (k: CatKey, patch: Partial<CategoryCompletionEntry>) => {
    setDraft((prev) => ({ ...prev, [k]: { ...entryFor(k), ...patch } }));
    setSaved(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await onSave(selected.id, draft);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-2xl">Track progress</h3>
            <p className="text-sm text-muted-foreground mt-1">Set completion for each part of your planning, per event.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
        </div>

        {!selected ? (
          <div className="mt-6 space-y-2">
            {events.map((event) => (
              <button key={event.id} type="button" onClick={() => selectEvent(event)}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-left hover:bg-stone/50 cursor-pointer transition-colors">
                <div className="min-w-0">
                  <span className="font-sans text-lg font-semibold truncate block">{event.name}</span>
                  <span className="text-sm text-muted-foreground">{eventOverallPercent(event)}% complete overall</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <button type="button" onClick={() => setSelectedId(null)} className="text-sm text-clay hover:underline cursor-pointer">← Choose a different event</button>
            <h4 className="font-serif text-xl mt-3">{selected.name}</h4>

            <div className="mt-4 space-y-4">
              {enabledCategoriesFor(selected).map((k) => {
                const cat = ALL_CATEGORIES.find((c) => c.key === k)!;
                const entry = entryFor(k);
                const Icon = cat.icon;
                return (
                  <div key={k} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-clay shrink-0" />
                      <span className="text-sm font-medium text-ink">{cat.label}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {COMPLETION_MODES.map((m) => {
                        const on = entry.mode === m.value;
                        return (
                          <button key={m.value} type="button" onClick={() => updateEntry(k, { mode: m.value })}
                            className={cn(
                              "rounded-full border px-3 py-1 text-sm transition-colors cursor-pointer",
                              on ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-line hover:bg-stone",
                            )}>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    {entry.mode === "percentage" && (
                      <div className="mt-3 flex items-center gap-3">
                        <input type="range" min={0} max={100} value={entry.percent}
                          onChange={(e) => updateEntry(k, { percent: Number(e.target.value) })}
                          className="flex-1 accent-cherry cursor-pointer" />
                        <div className="flex items-center gap-1 shrink-0">
                          <input type="number" min={0} max={100} value={entry.percent}
                            onChange={(e) => updateEntry(k, { percent: Math.max(0, Math.min(100, Number(e.target.value))) })}
                            className="w-16 rounded-xl border border-line px-2 py-1.5 text-sm text-center bg-paper focus:outline-none focus:ring-2 focus:ring-clay" />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    )}

                    {entry.mode === "fraction" && (
                      <div className="mt-3 flex items-center gap-3">
                        <input type="number" min={0} value={entry.fractionCurrent}
                          onChange={(e) => updateEntry(k, { fractionCurrent: Math.max(0, Number(e.target.value)) })}
                          className="w-20 rounded-xl border border-line px-3 py-2 text-sm text-center bg-paper focus:outline-none focus:ring-2 focus:ring-clay" />
                        <span className="text-sm text-muted-foreground">of</span>
                        <input type="number" min={1} value={entry.fractionTotal}
                          onChange={(e) => updateEntry(k, { fractionTotal: Math.max(1, Number(e.target.value)) })}
                          className="w-20 rounded-xl border border-line px-3 py-2 text-sm text-center bg-paper focus:outline-none focus:ring-2 focus:ring-clay" />
                      </div>
                    )}

                    {entry.mode === "boolean" && (
                      <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={entry.done}
                          onChange={(e) => updateEntry(k, { done: e.target.checked })}
                          className="h-4 w-4 accent-sage-deep cursor-pointer" />
                        Complete
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              {saved && !saving && <span className="text-sm text-sage-deep inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span>}
              <button type="button" onClick={save} disabled={saving}
                className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-cherry">*</span>}
      </span>
      <input
        type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          "mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-paper transition-colors",
          error ? "border-cherry focus:ring-cherry" : "border-line focus:ring-clay",
        )}
      />
      {error && <p className="mt-1.5 text-sm text-cherry flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-cherry" />{error}</p>}
    </label>
  );
}
