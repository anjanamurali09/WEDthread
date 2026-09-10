import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Trash2, Circle, Square, RectangleHorizontal, Music, GlassWater, Mic, DoorOpen, Palette, Users, Armchair, Check, CalendarDays, Download, Settings, ZoomIn, ZoomOut, ArrowRight, ArrowDown, Maximize2, Minimize2 } from "lucide-react";
import { OvalPhotoOrnament } from "@/components/photo-empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";
import { ResizeHandle } from "@/components/resize-handle";
import { exportSeatingPdf } from "@/lib/seating-export";
import { cn, formatNumber } from "@/lib/utils";

// Soft-wash design tokens (same family used across cards/homepage feature grid), reused
// here as the color palette for floor areas instead of inventing new hex values.
const AREA_COLORS = ["#E4EDD8", "#FCEEEB", "#F4E8CE", "#E5E7F5", "#F6E3D6", "#FADCE1"];
const AREA_SUGGESTIONS = ["Dance floor", "Bar", "Entrance", "Stage", "DJ booth", "Photo booth"];

type ShapeKey = "round" | "rect" | "square";
const DEFAULT_SHAPE_CAPACITY: Record<ShapeKey, number> = { round: 8, rect: 10, square: 4 };
const SHAPE_LABELS: Record<ShapeKey, string> = { round: "Round", rect: "Rectangular", square: "Square" };
// Baseline size each shape starts at (matches the ShapePicker's own defaults below) — a
// table's current size relative to this is what drives chair-chip scaling, so shrinking a
// table below its "normal" size shrinks its guests' initials chips too.
const SHAPE_DEFAULT_SIZE: Record<ShapeKey, { w: number; h: number }> = {
  round: { w: 140, h: 140 }, rect: { w: 200, h: 90 }, square: { w: 120, h: 120 },
};
// Floor for chair chips shrinking with the table — small enough to matter, large enough
// that two-letter initials still read on one line.
const MIN_CHAIR_SIZE = 18;
const MIN_CHAIR_FONT = 8;

export const Route = createFileRoute("/_authenticated/seating")({
  component: SeatingPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

// Fixed starting size — matches seating_layouts.canvas_width/height's own DB column
// defaults (1200x800), used here only as a pre-load fallback before that row has
// fetched. The canvas no longer grows to fit content; see FloorCanvas below.
const DEFAULT_CANVAS_W = 1200;
const DEFAULT_CANVAS_H = 800;
// Minimum clamp margin from the canvas edge for fixtures/areas, so nothing can be
// dragged flush against the border. Tables use the larger TABLE_DRAG_MARGIN instead
// (needed for their chair-avatar overhang), which already exceeds this.
const CANVAS_EDGE_PADDING = 40;

const TABLECLOTHS = ["#F5EEDC", "#FADADD", "#D9E8DC", "#F4C7BA", "#E6D5F2", "#F8E4B7", "#C9E0EA", "#FFFFFF"];
const FLOORS = ["#FEFDFA", "#F5EEDC", "#EDE7DA", "#E6DFCB", "#2A3B36", "#1A1512", "#F0E4D0"];
const FIXTURE_KINDS: { kind: string; label: string; icon: any; color: string; w: number; h: number }[] = [
  { kind: "dance_floor", label: "Dance floor", icon: Music, color: "#E9D8FD", w: 260, h: 260 },
  { kind: "bar",         label: "Bar",         icon: GlassWater, color: "#3B2A1E", w: 220, h: 70 },
  { kind: "stage",       label: "Stage",       icon: Mic, color: "#4C1D24", w: 240, h: 90 },
  { kind: "entrance",    label: "Entrance",    icon: DoorOpen, color: "#C7A96B", w: 120, h: 40 },
];

// Options offered on the first-time "set up your floor plan" step. A separate list from
// FIXTURE_KINDS (the toolbar's own add-fixture menu) since the setup step covers a wider,
// more specific set of fixtures than the toolbar's compact quick-add row.
const SETUP_FIXTURES: { key: string; label: string; defaultOn: boolean; color: string; w: number; h: number }[] = [
  { key: "dance_floor",    label: "Dance Floor",    defaultOn: true,  color: "#E9D8FD", w: 260, h: 260 },
  { key: "bar_counter",    label: "Bar Counter",    defaultOn: true,  color: "#3B2A1E", w: 220, h: 70 },
  { key: "dj_booth",       label: "DJ Booth",       defaultOn: true,  color: "#2A3B36", w: 140, h: 90 },
  { key: "buffet_station", label: "Buffet Station", defaultOn: false, color: "#C7A96B", w: 240, h: 90 },
  { key: "cake_table",     label: "Cake Table",     defaultOn: false, color: "#FADADD", w: 120, h: 90 },
  { key: "photo_booth",    label: "Photo Booth",    defaultOn: false, color: "#E6D5F2", w: 140, h: 140 },
  { key: "gift_table",     label: "Gift Table",     defaultOn: false, color: "#F8E4B7", w: 160, h: 90 },
  { key: "stage",          label: "Stage",          defaultOn: false, color: "#4C1D24", w: 240, h: 90 },
  { key: "welcome_desk",   label: "Welcome Desk",   defaultOn: false, color: "#C9E0EA", w: 160, h: 70 },
];

function SeatingPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const { data: guests = [], isLoading: guestsLoading } = useGuests(wedding?.id);
  const { data: invites = [], isLoading: invitesLoading } = useInvites(wedding?.id);
  const search = Route.useSearch();
  const [eventId, setEventId] = useState<string>("");
  const qc = useQueryClient();
  const [setupSkipped, setSetupSkipped] = useState(false);
  const [confirmDeleteTableId, setConfirmDeleteTableId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  // A wider floor than zoomIn/zoomOut's own 0.5–2 range — a full-view "fit everything
  // on screen" pass on a large canvas can legitimately need to shrink further than a
  // couple would ever want to dial to by hand.
  const clampZoom = (z: number) => Math.min(2, Math.max(0.15, Math.round(z * 100) / 100));
  const zoomIn = () => setZoom((z) => Math.min(2, clampZoom(z + 0.1)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, clampZoom(z - 0.1)));

  // Full view: the floor plan takes over the whole screen (toolbar + canvas only, no
  // guest sidebar or app chrome) so there's nothing to scroll past to see the whole
  // layout at once. Zoom is saved on entry and restored on exit, since the fit-to-
  // screen zoom computed for full view isn't a level a couple necessarily wants to
  // keep once they're back to the normal, smaller canvas area.
  const [fullView, setFullView] = useState(false);
  const [savedZoom, setSavedZoom] = useState(1);
  const fullViewWrapRef = useRef<HTMLDivElement>(null);
  const toggleFullView = () => {
    if (fullView) { setZoom(savedZoom); setFullView(false); }
    else { setSavedZoom(zoom); setFullView(true); }
  };
  // Tracked for the DragOverlay preview (see JSX below) — set on drag start (whether the
  // guest is coming from the sidebar or being repositioned from an existing chip) and
  // cleared once the drag ends, so something visibly follows the cursor the whole time.
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  // A small activation distance so a plain click on a chair chip (unseat) or its dietary
  // info button still registers as a click, not an accidental drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    if (search.event && events.some((e) => e.id === search.event)) setEventId(search.event);
    else if (!eventId && events.length) setEventId(events[0].id);
  }, [events, search.event]); // eslint-disable-line

  // Each event has its own zero/non-zero table+fixture state, so skipping setup on one
  // event shouldn't skip it on another.
  useEffect(() => { setSetupSkipped(false); }, [eventId]);

  // Layout (floor color / canvas)
  const { data: layout } = useQuery({
    queryKey: ["seating-layout", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await supabase.from("seating_layouts").select("*").eq("event_id", eventId).maybeSingle();
      if (data) return data;
      const { data: inserted } = await supabase.from("seating_layouts").insert({ event_id: eventId }).select().single();
      return inserted;
    },
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["tables", eventId],
    enabled: !!eventId,
    queryFn: async () => (await supabase.from("wedding_tables").select("*").eq("event_id", eventId).order("sort_order")).data ?? [],
  });

  const { data: fixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: ["fixtures", eventId],
    enabled: !!eventId,
    queryFn: async () => (await supabase.from("seating_fixtures").select("*").eq("event_id", eventId)).data ?? [],
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["areas", eventId],
    enabled: !!eventId,
    queryFn: async () => (await (supabase as any).from("seating_areas").select("*").eq("event_id", eventId).order("sort_order")).data ?? [],
  });

  // Keyed by eventId alone, NOT by the joined table-id list — that was the actual root
  // cause of the full-canvas reload on "add table" (see addTable below). A key that
  // includes tables.map(t=>t.id).join(",") changes on every add/delete, so React Query
  // sees a brand-new, never-cached query key each time and genuinely has no data for it
  // yet — isLoading flips true, which cascades into the page-level `loading` flag and
  // hides the whole canvas, even though the existing seat assignments never went stale.
  // The table-id filter still lives in the query function (closure-captured), just not
  // in the key; an add doesn't change the valid seat set, and a delete already triggers
  // an explicit invalidate via invalidateAll().
  const { data: seats = [], isLoading: seatsLoading } = useQuery({
    queryKey: ["seats", eventId],
    enabled: tables.length > 0,
    queryFn: async () => (await supabase.from("seat_assignments").select("*").in("table_id", tables.map((t: any) => t.id))).data ?? [],
  });

  // Wedding-level (not per-event) so a couple's preferred capacities carry across every
  // ceremony, matching how site-wide budget/site settings already behave.
  const shapeDefaults: Record<ShapeKey, number> = {
    ...DEFAULT_SHAPE_CAPACITY,
    ...((wedding?.seating_shape_defaults as Partial<Record<ShapeKey, number>>) ?? {}),
  };

  // While events have resolved but the effect above hasn't yet picked an eventId (or the
  // event-scoped queries are still in flight), the canvas would otherwise render with an
  // empty/wrong-scoped table list for a moment — so treat that gap as loading too.
  const loading = weddingLoading || eventsLoading || guestsLoading || invitesLoading
    || (events.length > 0 && !eventId) || tablesLoading || fixturesLoading || areasLoading || seatsLoading;

  const attendingIds = useMemo(
    () => new Set(invites.filter((i) => i.event_id === eventId && i.rsvp_status !== "declined").map((i) => i.guest_id)),
    [invites, eventId],
  );
  const seatedIds = useMemo(() => new Set(seats.map((s: any) => s.guest_id)), [seats]);
  const unseated = guests.filter((g) => attendingIds.has(g.id) && !seatedIds.has(g.id));

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["tables", eventId] });
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
    qc.invalidateQueries({ queryKey: ["areas", eventId] });
    qc.invalidateQueries({ queryKey: ["seats", eventId] });
  };

  // Optimistic insert: the table appears instantly under a temp id, the real insert runs
  // in the background, and the temp row is swapped for the real one (or removed, with an
  // error toast, if the insert fails) — no invalidate/refetch, so no loading state at all.
  // Deliberately does NOT touch the seats query — an empty new table can't change the set
  // of existing seat assignments, so there's nothing there to go stale.
  const addTable = async (shape: ShapeKey) => {
    if (!eventId) return;
    const isRect = shape === "rect";
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic = {
      id: tempId,
      event_id: eventId,
      label: `Table ${tables.length + 1}`,
      seats: shapeDefaults[shape],
      shape,
      width: isRect ? 200 : shape === "square" ? 120 : 140,
      height: isRect ? 90 : shape === "square" ? 120 : 140,
      pos_x: 120 + (tables.length % 5) * 160,
      pos_y: 120 + Math.floor(tables.length / 5) * 160,
      rotation: 0,
      sort_order: tables.length,
      mat_color: TABLECLOTHS[tables.length % TABLECLOTHS.length],
    };
    qc.setQueryData(["tables", eventId], (old: any[] = []) => [...old, optimistic]);
    const { id, ...insertPayload } = optimistic;
    const { data, error } = await supabase.from("wedding_tables").insert(insertPayload).select().single();
    if (error || !data) {
      qc.setQueryData(["tables", eventId], (old: any[] = []) => old.filter((t) => t.id !== tempId));
      toast.error(error?.message ?? "Couldn't add table");
      return;
    }
    qc.setQueryData(["tables", eventId], (old: any[] = []) => old.map((t) => (t.id === tempId ? data : t)));
  };

  const addFixture = async (kind: (typeof FIXTURE_KINDS)[number]) => {
    if (!eventId) return;
    await supabase.from("seating_fixtures").insert({
      event_id: eventId, kind: kind.kind, label: kind.label,
      color: kind.color, width: kind.w, height: kind.h, pos_x: 200, pos_y: 200,
    });
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
  };

  const addArea = async (label: string, color: string) => {
    if (!eventId) return;
    await (supabase as any).from("seating_areas").insert({
      event_id: eventId, label, color, width: 220, height: 160,
      pos_x: 80 + (areas.length % 4) * 40, pos_y: 80 + (areas.length % 4) * 30,
      sort_order: areas.length,
    });
    qc.invalidateQueries({ queryKey: ["areas", eventId] });
  };
  const updateArea = async (id: string, patch: any) => {
    qc.setQueryData(["areas", eventId], (old: any) => (old ?? []).map((a: any) => (a.id === id ? { ...a, ...patch } : a)));
    await (supabase as any).from("seating_areas").update(patch).eq("id", id);
  };
  const deleteArea = async (id: string) => {
    await (supabase as any).from("seating_areas").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["areas", eventId] });
  };

  const updateShapeDefaults = async (next: Record<ShapeKey, number>) => {
    if (!wedding) return;
    qc.setQueryData(["current-wedding"], (old: any) => (old ? { ...old, seating_shape_defaults: next } : old));
    await supabase.from("weddings").update({ seating_shape_defaults: next }).eq("id", wedding.id);
  };

  // First-time setup: drop the selected fixtures in a row along the top of the canvas,
  // spaced by width + 40px, so nothing stacks on top of anything else.
  const startSeatingSetup = async (keys: string[]) => {
    if (!eventId || keys.length === 0) return;
    let x = 60;
    const y = 60;
    const rows = keys.map((key) => {
      const def = SETUP_FIXTURES.find((f) => f.key === key)!;
      const row = { event_id: eventId, kind: def.key, label: def.label, color: def.color, width: def.w, height: def.h, pos_x: x, pos_y: y };
      x += def.w + 40;
      return row;
    });
    await supabase.from("seating_fixtures").insert(rows);
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
  };

  const updateTable = async (id: string, patch: any) => {
    qc.setQueryData(["tables", eventId], (old: any) => (old ?? []).map((t: any) => (t.id === id ? { ...t, ...patch } : t)));
    await supabase.from("wedding_tables").update(patch).eq("id", id);
  };
  const updateFixture = async (id: string, patch: any) => {
    qc.setQueryData(["fixtures", eventId], (old: any) => (old ?? []).map((f: any) => (f.id === id ? { ...f, ...patch } : f)));
    await supabase.from("seating_fixtures").update(patch).eq("id", id);
  };
  const deleteTable = async (id: string) => {
    await supabase.from("wedding_tables").delete().eq("id", id);
    invalidateAll();
  };

  const confirmDeleteTable = async () => {
    if (!confirmDeleteTableId) return;
    await deleteTable(confirmDeleteTableId);
    setConfirmDeleteTableId(null);
  };
  const deleteFixture = async (id: string) => {
    await supabase.from("seating_fixtures").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
  };
  const unseat = async (assignmentId: string) => {
    await supabase.from("seat_assignments").delete().eq("id", assignmentId);
    qc.invalidateQueries({ queryKey: ["seats", eventId] });
  };
  const exportPdf = () => {
    if (!wedding || !event) return;
    exportSeatingPdf({
      weddingLabel: wedding.slug ?? wedding.id,
      eventName: event.name,
      eventDate: event.event_date,
      tables, fixtures, seats, guests,
    });
  };
  const setFloor = async (color: string) => {
    if (!layout) return;
    qc.setQueryData(["seating-layout", eventId], { ...layout, background_color: color });
    await supabase.from("seating_layouts").update({ background_color: color }).eq("id", layout.id);
  };

  // Persists the couple's chosen canvas size (from dragging the resize handle) so it
  // never silently recalculates or shrinks based on table positions on a later load —
  // the canvas only ever changes size via this explicit action.
  const setCanvasSize = async (w: number, h: number) => {
    if (!layout) return;
    qc.setQueryData(["seating-layout", eventId], { ...layout, canvas_width: w, canvas_height: h });
    const { error } = await supabase.from("seating_layouts").update({ canvas_width: w, canvas_height: h }).eq("id", layout.id);
    if (error) {
      toast.error("Couldn't save the canvas size — " + error.message);
      qc.invalidateQueries({ queryKey: ["seating-layout", eventId] });
    }
  };

  // Fires once the full-view layout has actually painted (not the frame it was
  // requested on) so the measured viewport size is the real, full-screen one.
  //
  // Zooming a small canvas out to "fit" a big empty full-screen frame looks like it
  // uses the whole screen but doesn't — the draggable area is still only the
  // original (now tiny-looking, still logically small) canvas, shrunk into the
  // middle of a lot of unusable margin. So when the screen has more real room than
  // the current canvas, grow the canvas itself to match it (persisted, same as the
  // +10% buttons) and view it at 100% — every visible pixel is then real, draggable
  // canvas. Only fall back to zooming out when the couple's own canvas is already
  // BIGGER than the screen can show at 100%, so an intentionally large layout isn't
  // shrunk or cropped, just viewed at whatever zoom fits it all in.
  useEffect(() => {
    if (!fullView) return;
    const id = requestAnimationFrame(() => {
      const el = fullViewWrapRef.current;
      if (!el) return;
      const cw = layout?.canvas_width ?? DEFAULT_CANVAS_W;
      const ch = layout?.canvas_height ?? DEFAULT_CANVAS_H;
      const availW = el.clientWidth - 24;
      const availH = el.clientHeight - 24;
      if (availW <= 0 || availH <= 0) return;
      if (availW >= cw && availH >= ch) {
        const nextW = Math.round(availW);
        const nextH = Math.round(availH);
        if (nextW !== cw || nextH !== ch) setCanvasSize(nextW, nextH);
        setZoom(1);
      } else {
        setZoom(clampZoom(Math.min(availW / cw, availH / ch)));
      }
    });
    return () => cancelAnimationFrame(id);
    // Deliberately just [fullView] — this should run once per view-toggle, not every
    // time canvas_width/height change (which this same effect can itself trigger).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullView]);

  // seat_index is now a FIXED slot identity per table (0..capacity-1), not a rank in a
  // compacting list — each table has exactly `seats` numbered positions (see
  // wedding_tables.seat_layout / defaultSeatLayout in TableNode), and a guest occupies
  // whichever numbered slot they were dropped on. Empty slots are just "no assignment
  // currently has this index," rendered as EmptySlot dots.
  const firstEmptySlotIndex = (tableId: string, excludeAssignmentId?: string): number | null => {
    const table = tables.find((t: any) => t.id === tableId);
    if (!table) return null;
    const capacity = table.seats ?? 0;
    const used = new Set(
      seats.filter((s: any) => s.table_id === tableId && s.id !== excludeAssignmentId && s.seat_index != null)
        .map((s: any) => s.seat_index),
    );
    for (let i = 0; i < capacity; i++) if (!used.has(i)) return i;
    return null;
  };

  // Seats a guest at a specific slot index (or the first empty one, if slotIndex is
  // null — the general "dropped somewhere on the table, not a specific dot" case).
  // Covers a fresh seat and moving an already-seated guest, same table or a different one.
  const assignToSlot = async (guestId: string, targetTableId: string, slotIndex: number | null) => {
    const targetTable = tables.find((t: any) => t.id === targetTableId);
    if (!targetTable) return;
    const existing = seats.find((s: any) => s.guest_id === guestId);
    const excludeId = existing && existing.table_id === targetTableId ? existing.id : undefined;

    let idx = slotIndex;
    if (idx == null) {
      idx = firstEmptySlotIndex(targetTableId, excludeId);
      if (idx === null) return toast.error(`${targetTable.label} is at capacity`);
    } else {
      const occupant = seats.find((s: any) => s.table_id === targetTableId && s.seat_index === idx && s.guest_id !== guestId);
      if (occupant) return swapAtChip(guestId, targetTableId, occupant.id);
    }

    if (existing) {
      qc.setQueryData(["seats", eventId], (old: any[] = []) => old.map((s) => (s.id === existing.id ? { ...s, table_id: targetTableId, seat_index: idx } : s)));
      await supabase.from("seat_assignments").update({ table_id: targetTableId, seat_index: idx }).eq("id", existing.id);
    } else {
      const { data: inserted, error } = await supabase.from("seat_assignments").insert({ table_id: targetTableId, guest_id: guestId, seat_index: idx }).select().single();
      if (error || !inserted) return toast.error(error?.message ?? "Couldn't seat guest");
      qc.setQueryData(["seats", eventId], (old: any[] = []) => [...old, inserted]);
    }
  };

  // Dropped directly onto an occupied chip. If the dragged guest is already seated
  // somewhere, swap the two guests' slots outright (a clean two-item swap, since both
  // slots already have a fixed identity — no one else's position needs to shift). If the
  // dragged guest is a fresh sidebar guest, bump the current occupant to the next free
  // slot and take theirs.
  const swapAtChip = async (guestId: string, targetTableId: string, targetAssignmentId: string) => {
    const target = seats.find((s: any) => s.id === targetAssignmentId);
    if (!target) return;
    const existing = seats.find((s: any) => s.guest_id === guestId);
    if (existing?.id === targetAssignmentId) return;

    if (existing) {
      const existingIdx = existing.seat_index;
      const existingTableId = existing.table_id;
      qc.setQueryData(["seats", eventId], (old: any[] = []) => old.map((s) => {
        if (s.id === existing.id) return { ...s, table_id: targetTableId, seat_index: target.seat_index };
        if (s.id === target.id) return { ...s, table_id: existingTableId, seat_index: existingIdx };
        return s;
      }));
      await Promise.all([
        supabase.from("seat_assignments").update({ table_id: targetTableId, seat_index: target.seat_index }).eq("id", existing.id),
        supabase.from("seat_assignments").update({ table_id: existingTableId, seat_index: existingIdx }).eq("id", target.id),
      ]);
    } else {
      const freeIdx = firstEmptySlotIndex(targetTableId, target.id);
      if (freeIdx === null) return toast.error(`${tables.find((t: any) => t.id === targetTableId)?.label ?? "This table"} is at capacity`);
      qc.setQueryData(["seats", eventId], (old: any[] = []) => old.map((s) => (s.id === target.id ? { ...s, seat_index: freeIdx } : s)));
      await supabase.from("seat_assignments").update({ seat_index: freeIdx }).eq("id", target.id);
      const { data: inserted, error } = await supabase.from("seat_assignments").insert({ table_id: targetTableId, guest_id: guestId, seat_index: target.seat_index }).select().single();
      if (error || !inserted) return toast.error(error?.message ?? "Couldn't seat guest");
      qc.setQueryData(["seats", eventId], (old: any[] = []) => [...old, inserted]);
    }
  };

  const handleGuestDrop = async (e: DragEndEvent) => {
    setActiveGuestId(null);
    const gid = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const idStr = String(overId);
    if (idStr.startsWith("empty-slot:")) {
      const [, tableId, slotIdxStr] = idStr.split(":");
      await assignToSlot(gid, tableId, Number(slotIdxStr));
    } else if (idStr.startsWith("seat-slot:")) {
      const [, tableId, targetAssignmentId] = idStr.split(":");
      await swapAtChip(gid, tableId, targetAssignmentId);
    } else if (idStr.startsWith("table:")) {
      await assignToSlot(gid, idStr.slice(6), null);
    }
  };


  if (!eventsLoading && !events.length) {
    return (
      <AppShell title="Seating" decor={<></>}>
        <div className="flex items-center justify-center min-h-[calc(100vh-220px)]">
          <div className="paper-card p-8 max-w-xl mx-auto text-center">
            <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-clay-soft text-clay"><CalendarDays className="h-5 w-5" /></span>
            <h2 className="mt-4 font-serif text-2xl">Add an event first</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seating plans live under an event — add your ceremony or reception, then come back to design the floor plan.</p>
            <Link to="/events" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay">Go to Events</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const floorColor = layout?.background_color ?? "#FEFDFA";
  const needsSetup = !loading && tables.length === 0 && fixtures.length === 0 && !setupSkipped;

  return (
    <AppShell
      title="Seating"
      subtitle="Design your floor plan. Drag tables and fixtures, then drop guests from the sidebar."
      decor={<></>}
      actions={
        <div className="flex items-center gap-2">
          <Dropdown className="w-56" value={eventId} onChange={setEventId} placeholder="Choose an event"
            options={events.map((e) => ({ value: e.id, label: e.name }))} />
          <button onClick={exportPdf} disabled={tables.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : needsSetup ? (
        <SeatingSetupCard onStart={startSeatingSetup} onSkip={() => setSetupSkipped(true)} />
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveGuestId(e.active.id as string)}
        onDragCancel={() => setActiveGuestId(null)}
        onDragEnd={handleGuestDrop}
      >
        {(() => {
          const canvasBlock = (
            <>
              <Toolbar
                floorColor={floorColor}
                onFloor={setFloor}
                onAddTable={addTable}
                onAddFixture={addFixture}
                onOpenSettings={() => setSettingsOpen(true)}
                tableCount={tables.length}
                zoom={zoom}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                fullView={fullView}
                onToggleFullView={toggleFullView}
              />
              <FloorCanvas
                zoom={zoom}
                floorColor={floorColor}
                canvasWidth={layout?.canvas_width ?? DEFAULT_CANVAS_W}
                canvasHeight={layout?.canvas_height ?? DEFAULT_CANVAS_H}
                onResizeCanvas={setCanvasSize}
                tables={tables}
                fixtures={fixtures}
                areas={areas}
                seats={seats}
                guests={guests}
                onUpdateTable={updateTable}
                onUpdateFixture={updateFixture}
                onUpdateArea={updateArea}
                onDeleteTable={setConfirmDeleteTableId}
                onDeleteFixture={deleteFixture}
                onDeleteArea={deleteArea}
                onUnseat={unseat}
                onFirstTable={() => addTable("round")}
                wrapRef={fullView ? fullViewWrapRef : undefined}
                fill={fullView}
              />
            </>
          );

          // Full view: toolbar + canvas take over the entire screen (no guest sidebar,
          // no app chrome) so there's nothing left to scroll past to see the whole
          // floor plan at once — that's also what the auto-fit zoom effect measures.
          if (fullView) {
            return <div className="fixed inset-0 z-50 bg-pearl p-3 flex flex-col gap-3">{canvasBlock}</div>;
          }

          return (
            <div className="grid lg:grid-cols-[300px_1fr] gap-4">
              {/* Guest sidebar */}
              <aside className="paper-card p-4 h-fit lg:sticky lg:top-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-clay" />
                  <h3 className="font-sans text-xl font-semibold">Manage guests</h3>
                </div>
                <p className="text-sm uppercase tracking-widest text-clay">Unseated · {formatNumber(unseated.length)}</p>
                <div className="mt-2 space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
                  {unseated.length === 0 && <p className="text-sm text-muted-foreground italic">Everyone attending has a seat.</p>}
                  {unseated.map((g) => <GuestChip key={g.id} id={g.id} name={g.full_name} />)}
                </div>
              </aside>

              {/* Canvas + toolbar. min-w-0 is load-bearing: without it, this grid item's
                  default min-width:auto lets the canvas's fixed-pixel content (especially
                  once resized past its default size via the drag handle) force the whole
                  1fr track — and with it the entire page — wider than the viewport, instead
                  of letting the canvas's own overflow-auto contain it internally. That's what
                  was actually causing the page to touch the viewport edge with no padding. */}
              <div className="space-y-3 min-w-0">{canvasBlock}</div>
            </div>
          );
        })()}
        {/* Visible feedback that follows the cursor during a drag — previously nothing
            appeared until drop. Reused for both a fresh sidebar drag and repositioning an
            already-seated chip, same look either way. */}
        <DragOverlay>
          {activeGuestId && (() => {
            const g = guests.find((x: any) => x.id === activeGuestId);
            if (!g) return null;
            return (
              <div className="h-9 w-9 rounded-full bg-paper border-2 border-ink shadow-lg grid place-items-center text-sm font-semibold text-ink cursor-grabbing">
                {getInitials(g.full_name ?? "")}
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>
      )}
      {confirmDeleteTableId && (() => {
        const t = tables.find((tb: any) => tb.id === confirmDeleteTableId);
        const occupants = seats.filter((s: any) => s.table_id === confirmDeleteTableId).length;
        return (
          <ConfirmDialog
            title="Delete table"
            description={occupants > 0
              ? `Delete "${t?.label ?? "this table"}"? ${occupants} guest${occupants === 1 ? "" : "s"} seated here will be un-seated. This can't be undone.`
              : `Delete "${t?.label ?? "this table"}"? This can't be undone.`}
            confirmLabel="Delete table"
            onConfirm={confirmDeleteTable}
            onCancel={() => setConfirmDeleteTableId(null)}
          />
        );
      })()}
      {settingsOpen && (
        <SeatingSettingsDialog
          areas={areas}
          shapeDefaults={shapeDefaults}
          onAddArea={addArea}
          onUpdateArea={updateArea}
          onDeleteArea={deleteArea}
          onSaveShapeDefaults={updateShapeDefaults}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </AppShell>
  );
}

/* --- First-time floor plan setup, matching Budget's onboarding card pattern --- */
function SeatingSetupCard({ onStart, onSkip }: { onStart: (keys: string[]) => Promise<void>; onSkip: () => void }) {
  const [selected, setSelected] = useState<string[]>(SETUP_FIXTURES.filter((f) => f.defaultOn).map((f) => f.key));
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));

  const start = async () => {
    if (selected.length === 0) return onSkip();
    setSaving(true);
    await onStart(selected);
    setSaving(false);
  };

  return (
    <div className="paper-card p-8 max-w-xl mx-auto">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-clay-soft text-clay"><Armchair className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-2xl">Let's set up your floor plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Pick what you need — we'll drop them onto your canvas as a starting point. Add or remove anything later.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {SETUP_FIXTURES.map((f) => {
          const on = selected.includes(f.key);
          return (
            <button key={f.key} type="button" onClick={() => toggle(f.key)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer", on ? "bg-sage-deep text-pearl border-sage-deep" : "bg-pearl text-ink border-line hover:bg-stone")}>
              {on && <Check className="h-3 w-3" />} {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={onSkip} disabled={saving} className="text-sm text-muted-foreground hover:text-ink underline cursor-pointer disabled:opacity-60">
          Skip for now
        </button>
        <button onClick={start} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-rose-deep text-pearl px-6 py-2.5 text-sm hover:bg-rose-deep-hover disabled:opacity-60 cursor-pointer">
          {saving ? "Setting up…" : "Start arranging"}
        </button>
      </div>
    </div>
  );
}

/* --- Settings modal: floor areas + default seats per table shape, same paper-card modal
   shell used across the app (ConfirmDialog, TemplateDialog, etc). --- */
function SeatingSettingsDialog({ areas, shapeDefaults, onAddArea, onUpdateArea, onDeleteArea, onSaveShapeDefaults, onClose }: {
  areas: any[]; shapeDefaults: Record<ShapeKey, number>;
  onAddArea: (label: string, color: string) => Promise<void>;
  onUpdateArea: (id: string, patch: any) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
  onSaveShapeDefaults: (next: Record<ShapeKey, number>) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"areas" | "defaults">("areas");
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState(AREA_COLORS[0]);
  const [defaults, setDefaults] = useState(shapeDefaults);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const existingLabels = new Set(areas.map((a: any) => a.label.toLowerCase()));
  const suggestions = AREA_SUGGESTIONS.filter((s) => !existingLabels.has(s.toLowerCase()));

  const addSuggested = (name: string, i: number) => onAddArea(name, AREA_COLORS[i % AREA_COLORS.length]);
  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onAddArea(name, customColor);
    setCustomName("");
  };

  const saveDefaults = async () => {
    setSavingDefaults(true);
    await onSaveShapeDefaults(defaults);
    setSavingDefaults(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">Seating settings</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 flex items-center gap-1 rounded-full bg-stone/60 p-1 w-fit">
          {(["areas", "defaults"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("rounded-full px-4 py-1.5 text-sm cursor-pointer transition-colors",
                tab === t ? "bg-paper shadow-sm text-ink" : "text-muted-foreground hover:text-ink")}>
              {t === "areas" ? "Floor areas" : "Table defaults"}
            </button>
          ))}
        </div>

        {tab === "areas" ? (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">On this event's floor plan</p>
              {areas.length === 0 && <p className="text-sm text-muted-foreground italic">No areas yet — add one below.</p>}
              <div className="space-y-1.5">
                {areas.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-xl border border-line/60 px-3 py-2">
                    <span className="h-4 w-4 rounded-full border border-line shrink-0" style={{ background: a.color }} />
                    <input
                      defaultValue={a.label}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== a.label && onUpdateArea(a.id, { label: e.target.value.trim() })}
                      className="flex-1 text-sm bg-transparent focus:outline-none border-b border-transparent focus:border-clay"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {AREA_COLORS.map((c) => (
                        <button key={c} onClick={() => onUpdateArea(a.id, { color: c })} title={c}
                          className={cn("h-4 w-4 rounded-full border cursor-pointer hover:scale-110 transition-transform", a.color === c ? "border-ink border-2" : "border-line")}
                          style={{ background: c }} />
                      ))}
                    </div>
                    <button onClick={() => onDeleteArea(a.id)} className="p-1 rounded-full hover:bg-stone text-muted-foreground hover:text-cherry cursor-pointer shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Quick add</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => {
                    const i = AREA_SUGGESTIONS.indexOf(s);
                    return (
                      <button key={s} type="button" onClick={() => addSuggested(s, i)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-stone cursor-pointer">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Custom area</p>
              <div className="flex items-center gap-2">
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder="e.g. Lounge, Kids' corner"
                  className="flex-1 rounded-2xl border border-line bg-pearl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                <div className="flex items-center gap-1 shrink-0">
                  {AREA_COLORS.map((c) => (
                    <button key={c} onClick={() => setCustomColor(c)} title={c}
                      className={cn("h-5 w-5 rounded-full border cursor-pointer hover:scale-110 transition-transform", customColor === c ? "border-ink border-2" : "border-line")}
                      style={{ background: c }} />
                  ))}
                </div>
                <button onClick={addCustom} disabled={!customName.trim()}
                  className="rounded-full bg-ink text-paper p-2.5 hover:bg-clay disabled:opacity-50 cursor-pointer shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">New tables auto-fill with these seat counts. You can still change any table's seats individually.</p>
            {(Object.keys(SHAPE_LABELS) as ShapeKey[]).map((sh) => (
              <label key={sh} className="flex items-center justify-between gap-3">
                <span className="text-sm">{SHAPE_LABELS[sh]}</span>
                <input type="number" min={1} max={30} value={defaults[sh]}
                  onChange={(e) => setDefaults({ ...defaults, [sh]: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-20 rounded-xl border border-line bg-pearl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-clay" />
              </label>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={saveDefaults} disabled={savingDefaults}
                className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                {savingDefaults ? "Saving…" : "Save defaults"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Toolbar ---
   flex-nowrap + overflow-x-auto: everything stays on one row, scrolling
   horizontally instead of wrapping to a second line on a narrower viewport. */
function Toolbar({ floorColor, onFloor, onAddTable, onAddFixture, onOpenSettings, tableCount, zoom, onZoomIn, onZoomOut, fullView, onToggleFullView }: any) {
  const [colorOpen, setColorOpen] = useState(false);
  return (
    <div className="paper-card p-2.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-line shrink-0">
        <TB onClick={() => onAddTable("round")} icon={<Circle className="h-3.5 w-3.5" />} label="Round" />
        <TB onClick={() => onAddTable("rect")}  icon={<RectangleHorizontal className="h-3.5 w-3.5" />} label="Rect" />
        <TB onClick={() => onAddTable("square")} icon={<Square className="h-3.5 w-3.5" />} label="Square" />
      </div>
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-line shrink-0">
        {FIXTURE_KINDS.map((f) => {
          const I = f.icon;
          return <TB key={f.kind} onClick={() => onAddFixture(f)} icon={<I className="h-3.5 w-3.5" />} label={f.label} />;
        })}
      </div>
      <div className="relative shrink-0">
        <button onClick={() => setColorOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap">
          <Palette className="h-3.5 w-3.5" /> Floor
          <span className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: floorColor }} />
        </button>
        {colorOpen && (
          <div className="absolute z-30 top-full mt-2 p-2 rounded-2xl bg-paper border border-line shadow-lg flex gap-1.5">
            {FLOORS.map((c) => (
              <button key={c} onClick={() => { onFloor(c); setColorOpen(false); }}
                className="h-6 w-6 rounded-full border border-line cursor-pointer hover:scale-110 transition-transform"
                style={{ background: c }} aria-label={c} />
            ))}
          </div>
        )}
      </div>
      <button onClick={onOpenSettings} title="Floor areas & table defaults"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap shrink-0">
        <Settings className="h-3.5 w-3.5" /> Settings
      </button>

      <div className="ml-auto flex items-center gap-3 pl-2 shrink-0">
        <div className="inline-flex items-center rounded-full border border-line shrink-0">
          <button onClick={onZoomOut} disabled={zoom <= 0.5} title="Zoom out"
            className="p-1.5 rounded-full hover:bg-stone cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground select-none">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} disabled={zoom >= 2} title="Zoom in"
            className="p-1.5 rounded-full hover:bg-stone cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{formatNumber(tableCount)} table{tableCount === 1 ? "" : "s"}</span>
        <button onClick={onToggleFullView} title={fullView ? "Exit full view" : "Full view — fit the whole floor plan on screen"}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap">
          {fullView ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {fullView ? "Close" : "Full view"}
        </button>
      </div>
    </div>
  );
}
function TB({ onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs whitespace-nowrap hover:bg-stone cursor-pointer">
      {icon}<span>{label}</span>
    </button>
  );
}

/* --- Guest chip in sidebar --- */
function GuestChip({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing bg-stone/60 rounded-xl px-3 py-2 text-sm hover:bg-stone transition-colors ${isDragging ? "opacity-40" : ""}`}>
      {name}
    </div>
  );
}

/* --- Canvas ---
   Tables/fixtures/areas store pos_x/pos_y/width/height as real CSS pixel coordinates —
   no scale-to-fit transform. The canvas renders at a FIXED size (canvasWidth/canvasHeight,
   persisted on seating_layouts) inside a scrollable wrapper — it never auto-grows or
   shrinks based on where tables/fixtures/areas happen to be. The couple can click the
   down/right arrows at the bottom-right corner to explicitly extend it (10% per
   click); that's the only thing that ever changes its size. */
function FloorCanvas({ floorColor, canvasWidth, canvasHeight, onResizeCanvas, tables, fixtures, areas, seats, guests, onUpdateTable, onUpdateFixture, onUpdateArea, onDeleteTable, onDeleteFixture, onDeleteArea, onUnseat, onFirstTable, zoom = 1, wrapRef: externalWrapRef, fill = false }: any) {
  const [selected, setSelected] = useState<{ kind: "table" | "fixture" | "area"; id: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Lets the parent measure the actual scroll viewport (used to compute a fit-to-
  // screen zoom for the full-view mode) without this component needing to know why.
  const setWrapRef = (el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (externalWrapRef) externalWrapRef.current = el;
  };
  const contentW = canvasWidth;
  const contentH = canvasHeight;
  const bounds = { w: contentW, h: contentH };

  // Click-to-extend, one step at a time, instead of a drag handle — a discrete step
  // has no pointer-delta math to get wrong (the drag version's rightward-only bug,
  // and a separate fractional-pixel bug that silently failed to save, both came from
  // that math). Each click grows by 10% of the CURRENT size, rounded to a whole pixel
  // since seating_layouts.canvas_width/height are `int` columns.
  const extendRight = () => onResizeCanvas(Math.round(canvasWidth * 1.1), canvasHeight);
  const extendDown = () => onResizeCanvas(canvasWidth, Math.round(canvasHeight * 1.1));

  return (
    // mb-8 (32px, within this app's usual 24-48px trailing-section spacing — matches the
    // scale AppShell's own page-level pb-16 uses elsewhere) so the canvas frame itself
    // always has breathing room before the viewport edge, on top of whatever page-level
    // padding wraps this route — not relying on that alone, since this bordered box is
    // the actual "canvas" a couple sees, independent of canvas_width/height or table count.
    // w-full makes the frame itself fill the grid column explicitly (defensive — belt and
    // suspenders against the block-default sizing this relied on implicitly before).
    // mx-auto on the fixed-size content div centers it within that frame whenever
    // canvas_width/height is narrower than the available column (the common case at the
    // default 1200x800 size on a wide viewport) — margin:auto safely resolves to 0 rather
    // than centering when the content is WIDER than the frame instead (post-resize), so
    // this never reintroduces the classic flexbox-centered-overflow "can't scroll to the
    // start" trap; it just falls back to normal left-aligned scrollable overflow there.
    <div ref={setWrapRef} className={cn(
      "w-full rounded-3xl border border-line shadow-inner bg-paper overflow-auto",
      // flex-1 (not h-full) so it actually grows to fill the remaining space in the
      // full-view flex column below the toolbar; min-h-0 overrides flex's default
      // min-height:auto, which would otherwise refuse to shrink below content size
      // and silently break the overflow-auto scroll this relies on.
      fill ? "flex-1 min-h-0" : "max-h-[75vh] mb-8",
    )}>
      {/* This sizing div reserves the actual (zoomed) footprint for scrolling/centering —
          a CSS transform alone doesn't change layout size, so without this wrapper the
          scroll container would size itself off the unscaled content and either clip a
          zoomed-in canvas or leave dead space around a zoomed-out one. */}
      <div className="mx-auto" style={{ width: contentW * zoom, height: contentH * zoom }}>
        <div
          className="relative"
          style={{
            width: contentW,
            height: contentH,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            background: floorColor,
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onClick={() => setSelected(null)}
        >
          {areas.map((a: any) => (
            <AreaNode key={a.id} area={a} bounds={bounds} canvasRef={wrapRef} selected={selected?.kind === "area" && selected.id === a.id}
              onSelect={() => setSelected({ kind: "area", id: a.id })}
              onUpdate={(patch: any) => onUpdateArea(a.id, patch)}
              onDelete={() => onDeleteArea(a.id)} zoom={zoom} />
          ))}

          {tables.length === 0 && fixtures.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
              <div className="pointer-events-none">
                <OvalPhotoOrnament photo="cane" className="h-32 w-44 md:h-40 md:w-56" />
              </div>
              <p className="mt-5 font-serif text-3xl text-ink">Every seat a story</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">Drop in your first table, then drag guests from the sidebar to give everyone a place at the celebration.</p>
              <button
                onClick={(e) => { e.stopPropagation(); onFirstTable(); }}
                className="pointer-events-auto mt-5 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
                <Plus className="h-4 w-4" /> Add first table
              </button>
            </div>
          )}

          {fixtures.map((f: any) => (
            <FixtureNode key={f.id} fixture={f} bounds={bounds} canvasRef={wrapRef} selected={selected?.kind === "fixture" && selected.id === f.id}
              onSelect={() => setSelected({ kind: "fixture", id: f.id })}
              onUpdate={(patch: any) => onUpdateFixture(f.id, patch)}
              onDelete={() => onDeleteFixture(f.id)} zoom={zoom} />
          ))}
          {tables.map((t: any) => {
            // seat_index (nulls last) determines chair position around the table — see
            // reorderSeat in SeatingPage — so this order must match what was persisted,
            // not raw fetch order, or a dragged guest would render back where they started.
            const at = seats.filter((s: any) => s.table_id === t.id)
              .sort((a: any, b: any) => (a.seat_index ?? Infinity) - (b.seat_index ?? Infinity));
            const seated = at.map((a: any) => ({ a, g: guests.find((x: any) => x.id === a.guest_id) })).filter((x: any) => x.g);
            return (
              <TableNode key={t.id} table={t} seated={seated} bounds={bounds} canvasRef={wrapRef}
                selected={selected?.kind === "table" && selected.id === t.id}
                onSelect={() => setSelected({ kind: "table", id: t.id })}
                onUpdate={(patch: any) => onUpdateTable(t.id, patch)}
                onDelete={() => onDeleteTable(t.id)}
                onUnseat={onUnseat} zoom={zoom} />
            );
          })}
        </div>
      </div>

      {/* "Extend the canvas" controls — deliberately a sibling of the zoomed/scrollable
          content, not inside it, so they (a) stay pinned to the corner of whatever's
          currently visible instead of sitting at the bottom-right of the full canvas
          (which could be scrolled or zoomed out of view), and (b) render at one
          constant on-screen size regardless of zoom, instead of shrinking along with
          everything else at low zoom. `sticky` + zero-height tracks the viewport
          vertically as wrapRef scrolls; the explicit width (matching the real, zoomed
          canvas footprint, not just wrapRef's own visible width) is what keeps the
          right-3 buttons at the canvas's TRUE right edge as it grows. */}
      <div className="sticky bottom-3 z-40 h-0 pointer-events-none" style={{ width: contentW * zoom }}>
        <div className="absolute bottom-0 right-3 flex items-center gap-1.5">
          <button type="button" onClick={extendDown} title="Extend canvas downward"
            className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-paper border border-line text-muted-foreground hover:text-ink shadow-md cursor-pointer">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={extendRight} title="Extend canvas rightward"
            className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-paper border border-line text-muted-foreground hover:text-ink shadow-md cursor-pointer">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Draggable pointer element (used for tables, fixtures, and areas) ---
   Pointer deltas map 1:1 to stored pos_x/pos_y (real pixels, no scale conversion), and
   every move — mid-drag and on drop — is clamped to `bounds` (the canvas's current real
   size) so nothing can end up positioned outside it. */
// `margin` extends the clamp inward beyond the element's own box — tables need this
// since their seated guests' avatar chips orbit OUTSIDE the table's own rectangle
// (chairPositions places them chip-size + gap past the table edge); clamping only the
// table's own box would still let those avatars render off-canvas. Fixtures/areas have
// no such overhang, so they pass margin=0.
function useMovable(
  pos: { x: number; y: number },
  size: { w: number; h: number },
  bounds: { w: number; h: number },
  onEnd: (p: { x: number; y: number }) => void,
  margin = 0,
  zoom = 1,
) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const clamp = (x: number, y: number) => {
    const maxX = Math.max(margin, bounds.w - size.w - margin);
    const maxY = Math.max(margin, bounds.h - size.h - margin);
    return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    setDrag(clamp(pos.x, pos.y));
  };
  // Pointer coordinates arrive in real screen pixels regardless of the canvas's CSS zoom
  // transform, but pos_x/pos_y are stored in the canvas's own (unscaled) coordinate space —
  // dividing the raw delta by zoom converts "how far the cursor moved on screen" back into
  // "how far that is on the actual floor plan," so a table tracks the cursor 1:1 at any zoom.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const nx = startRef.current.ox + (e.clientX - startRef.current.px) / zoom;
    const ny = startRef.current.oy + (e.clientY - startRef.current.py) / zoom;
    setDrag(clamp(nx, ny));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (drag) onEnd(drag);
    startRef.current = null;
    setDrag(null);
  };
  // Clamp the resting position too — an element already saved out-of-bounds (e.g. before
  // this fix existed) renders back on-canvas immediately, not just after its next drag.
  return { handlers: { onPointerDown, onPointerMove, onPointerUp }, current: drag ?? clamp(pos.x, pos.y) };
}

/* --- Clamp an inline editor popup (table/area/fixture settings bar) so it never renders
   outside the currently-VISIBLE (scrolled) canvas viewport — e.g. a table near the right
   edge shifts its popup left instead of letting it overflow off-screen or get clipped by
   the canvas's own overflow. Measures real screen rects post-render against the scroll
   wrapper's own bounding rect (which reflects whatever's currently scrolled into view)
   and applies the correction as a plain translate() in real screen pixels. */
function useClampedPopup(canvasRef: React.RefObject<HTMLElement>, active: boolean) {
  const popRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });
  useEffect(() => {
    // No dependency array on purpose — re-measures on every render so a popup whose own
    // content changes width (e.g. typing a longer label) stays clamped. setOffset uses a
    // functional update that bails out (returns the same object) when nothing actually
    // changed, so this can't loop.
    if (!active) { setOffset((p) => (p.dx === 0 && p.dy === 0 ? p : { dx: 0, dy: 0 })); return; }
    const pop = popRef.current;
    const canvas = canvasRef.current;
    if (!pop || !canvas) return;
    const popRect = pop.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const margin = 8;
    let dx = 0, dy = 0;
    if (popRect.right > canvasRect.right - margin) dx = canvasRect.right - margin - popRect.right;
    else if (popRect.left < canvasRect.left + margin) dx = canvasRect.left + margin - popRect.left;
    if (popRect.bottom > canvasRect.bottom - margin) dy = canvasRect.bottom - margin - popRect.bottom;
    else if (popRect.top < canvasRect.top + margin) dy = canvasRect.top + margin - popRect.top;
    setOffset((p) => (p.dx === dx && p.dy === dy ? p : { dx, dy }));
  });
  return { popRef, offset };
}

/* --- Table --- */
// Clears the widest possible chair orbit (max chip size 52 + max gap 12, and the chip
// itself extends another half its own size past its center point) so seated guests'
// avatars never spill past the canvas edge even when the table is dragged flush against it.
const TABLE_DRAG_MARGIN = 70;

function TableNode({ table, seated, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, onUnseat, zoom = 1 }: any) {
  const noCapacity = !table.seats || table.seats <= 0;
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}`, disabled: noCapacity });
  const { handlers, current } = useMovable(
    { x: table.pos_x, y: table.pos_y },
    { w: table.width, h: table.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    TABLE_DRAG_MARGIN,
    zoom,
  );
  const { popRef, offset } = useClampedPopup(canvasRef, selected);
  const isRound = table.shape === "round";
  const over = seated.length > table.seats;
  // Total number of chair SLOTS the table has — capacity, or however many are actually
  // occupied if that's somehow more (over-capacity edge case) — as opposed to the old
  // model, which only ever rendered exactly `seated.length` positions and had no concept
  // of an empty seat at all.
  const slotCount = Math.max(table.seats ?? 0, seated.length, 0);
  // Scale chip size to table capacity: small tables have room to spare, so their initials
  // badges grow larger; large tables stay compact, same as before.
  const capacity = Math.max(table.seats ?? slotCount, slotCount, 1);

  // Live-preview resize, same pattern as FixtureNode/AreaNode: local state while dragging,
  // committed via onUpdate on release. chairPositions() already derives seat placement
  // from width/height, so feeding it the live `size` here (not table.width/height) keeps
  // seats glued to the table's edge as it grows/shrinks, not just after the drag ends.
  const [resize, setResize] = useState<{ w: number; h: number } | null>(null);
  const size = resize ?? { w: table.width, h: table.height };

  // On top of the capacity-driven tier, shrink further (never grow past it) when the
  // table itself has been resized below its shape's normal starting size, so a smaller
  // table gets visibly smaller chair chips instead of them floating oversized off its
  // edge. Floored at MIN_CHAIR_SIZE/MIN_CHAIR_FONT so initials stay legible on one line
  // even at the table's smallest allowed size.
  const baseline = SHAPE_DEFAULT_SIZE[(table.shape ?? "round") as ShapeKey];
  const sizeRatio = isRound ? size.w / baseline.w : Math.min(size.w / baseline.w, size.h / baseline.h);
  const sizeScale = Math.min(1, sizeRatio);
  const capacityTier = chairTierFor(capacity);
  const tier: ChairTier = {
    size: Math.max(MIN_CHAIR_SIZE, Math.round(capacityTier.size * sizeScale)),
    fontSize: Math.max(MIN_CHAIR_FONT, Math.round(capacityTier.fontSize * sizeScale)),
  };
  const GAP = capacity <= 4 ? 12 : capacity <= 8 ? 10 : 8;
  const labelSize = capacity <= 6 ? "text-lg" : capacity <= 8 ? "text-sm" : "text-sm";
  const subSize = capacity <= 8 ? "text-sm" : "text-xs";

  // "Head seats" only means anything for rect/square tables — round always renders
  // 'facing' regardless of what's stored (belt-and-suspenders alongside the ShapePicker's
  // own force-back-to-facing when switching TO round).
  const arrangement: "facing" | "head" = isRound ? "facing" : (table.seat_arrangement === "head" ? "head" : "facing");

  // Picks between the position-math functions for a given shape/size/arrangement and
  // converts to fractions of that size — shared by the default (no custom layout saved
  // yet) case below, by the arrangement/shape pickers' onChange, AND by initial table
  // creation (addTable seeds pos_x/y/shape only; the first render with no stored
  // seat_layout falls through to this same default path), so a regenerated layout is
  // always computed the exact same way regardless of which of those triggered it. Round
  // stays circular (arrangement is always 'facing' there); rect/square split between
  // facingPositions (long-sides-only) and headSeatPositions (short-end + long-sides).
  const computeLayoutFractions = (shape: string, w: number, h: number, arr: "facing" | "head") => {
    const positions = shape === "round"
      ? chairPositions(w, h, slotCount, tier.size, GAP)
      : arr === "head"
        ? headSeatPositions(w, h, slotCount, tier.size, GAP)
        : facingPositions(w, h, slotCount, tier.size, GAP);
    return positions.map((p) => ({ x: p.x / w, y: p.y / h }));
  };

  // Slot layout: a saved custom arrangement (wedding_tables.seat_layout, fractions of the
  // table's own width/height so it scales naturally on resize) if one exists and still
  // matches the current slot count, otherwise the same default chairPositions()/
  // headSeatPositions() output — converted to fractions so both cases render through the
  // same path. A capacity/size change invalidates a saved layout (length no longer
  // matches) and falls back to fresh defaults, same as the task asked for.
  const defaultLayoutFractions = () => computeLayoutFractions(table.shape ?? "round", size.w, size.h, arrangement);
  const storedLayout: { x: number; y: number }[] | null = Array.isArray(table.seat_layout) ? table.seat_layout : null;
  const layoutFractions = storedLayout && storedLayout.length === slotCount ? storedLayout : defaultLayoutFractions();
  const slotPixels = layoutFractions.map((f) => ({ x: f.x * size.w, y: f.y * size.h }));

  // Legacy seat_assignments rows from before slots had fixed identity may have a null (or
  // colliding) seat_index — resolve them to whichever slot indices aren't already
  // explicitly claimed, so nothing silently fails to render or doubles up on one slot.
  // Purely a render-time fallback: nothing is written until the guest is actually dragged.
  const claimed = new Set(seated.map((s: any) => s.a.seat_index).filter((i: any) => i != null && i < slotCount));
  const unclaimed: number[] = [];
  for (let i = 0; i < slotCount; i++) if (!claimed.has(i)) unclaimed.push(i);
  let unclaimedCursor = 0;
  const resolvedSeated = [...seated]
    .sort((a: any, b: any) => (a.a.seat_index ?? Infinity) - (b.a.seat_index ?? Infinity))
    .map((s: any) => ({
      ...s,
      slotIndex: s.a.seat_index != null && s.a.seat_index < slotCount ? s.a.seat_index : unclaimed[unclaimedCursor++],
    }));
  const occupantBySlot = new Map(resolvedSeated.map((s: any) => [s.slotIndex, s]));

  const setSlotPosition = (index: number, px: number, py: number) => {
    const next = layoutFractions.map((f, i) => (i === index ? { x: px / size.w, y: py / size.h } : f));
    onUpdate({ seat_layout: next });
  };

  // Round tables must stay circles: both dimensions scale together off whichever axis was
  // dragged further, rather than letting the corner handle stretch it into an oval. Rect
  // and square both resize freely on both axes, same as fixtures already do.
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, w: table.width, h: table.height };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / zoom;
      const dy = (ev.clientY - start.y) / zoom;
      if (isRound) {
        const d = Math.max(60, start.w + Math.max(dx, dy));
        setResize({ w: d, h: d });
      } else {
        setResize({ w: Math.max(60, start.w + dx), h: Math.max(50, start.h + dy) });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResize((r) => { if (r) onUpdate({ width: r.w, height: r.h }); return null; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`select-none cursor-move ${selected ? "z-20" : "z-10"}`}
    >
      {/* Chairs around the outside — every slot renders, occupied or not, so the couple
          sees exactly how many seats they have and where each one physically sits. */}
      {Array.from({ length: slotCount }, (_, i) => i).map((i) => {
        const pos = slotPixels[i];
        if (!pos) return null;
        const s = occupantBySlot.get(i);
        if (!s) {
          return (
            <EmptySlot key={`empty-${i}`} x={pos.x} y={pos.y} size={tier.size}
              tableId={table.id} index={i}
              onDragPosition={setSlotPosition}
            />
          );
        }
        const initials = getInitials(s.g.full_name ?? "");
        const hasDiet = (s.g.dietary_tags?.length ?? 0) > 0 || (s.g.food_allergies?.length ?? 0) > 0 || !!s.g.dietary_notes;
        return (
          <ChairChip key={s.a.id} x={pos.x} y={pos.y} tier={tier} name={s.g.full_name} initials={initials}
            guestId={s.g.id} slotId={`seat-slot:${table.id}:${s.a.id}`}
            hasDiet={hasDiet}
            dietary={[...(s.g.dietary_tags ?? []), ...(s.g.food_allergies ?? []).map((a: string) => `⚠ ${a}`)]}
            notes={s.g.dietary_notes}
            onUnseat={() => onUnseat(s.a.id)}
          />
        );
      })}

      <div
        ref={setNodeRef}
        className={`w-full h-full flex flex-col items-center justify-center text-center transition-shadow ${isRound ? "px-4" : "px-3"} py-2 ${
          isOver ? "ring-4 ring-clay" : selected ? "ring-2 ring-ink" : ""
        } ${over ? "ring-2 ring-destructive" : ""}`}
        style={{
          background: table.mat_color ?? "#F5EEDC",
          borderRadius: isRound ? "50%" : 16,
          boxShadow: "0 4px 14px rgba(26,21,18,0.12)",
        }}
      >
        <p className={cn("font-sans font-medium leading-tight text-ink truncate max-w-full", labelSize)}>{table.label}</p>
        {!noCapacity && <p className={cn("text-ink truncate max-w-full", subSize)}>{formatNumber(seated.length)}/{formatNumber(table.seats)}</p>}
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title={isRound ? "Drag to resize (stays round)" : "Drag to resize"}
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 whitespace-nowrap z-30">
            <input
              defaultValue={table.label}
              onBlur={(e) => e.target.value !== table.label && onUpdate({ label: e.target.value })}
              className="w-16 text-sm bg-transparent border-b border-line focus:outline-none focus:border-clay"
            />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Seats</span>
              <input type="number" min={1} max={30} defaultValue={table.seats}
                onBlur={(e) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  if (n !== table.seats) onUpdate({ seats: n });
                }}
                className="w-8 bg-transparent border-b border-line text-center focus:outline-none focus:border-clay" />
            </div>
            <ShapePicker value={table.shape ?? "round"} onChange={(sh) => {
              const w = sh === "rect" ? 200 : sh === "square" ? 120 : 140;
              const h = sh === "rect" ? 90  : sh === "square" ? 120 : 140;
              const patch: any = { shape: sh, width: w, height: h };
              // Head seats has no meaning on a round table — silently fall back to facing
              // and regenerate the layout for the new (round) dimensions, rather than
              // leaving a stale rect-shaped custom/head layout behind.
              if (sh === "round") {
                patch.seat_arrangement = "facing";
                patch.seat_layout = computeLayoutFractions("round", w, h, "facing");
              }
              onUpdate(patch);
            }} />
            {!isRound && (
              <ArrangementPicker value={arrangement} onChange={(v) => onUpdate({
                seat_arrangement: v,
                seat_layout: computeLayoutFractions(table.shape ?? "round", size.w, size.h, v),
              })} />
            )}
            <ColorPicker value={table.mat_color ?? "#F5EEDC"} presets={TABLECLOTHS} onChange={(c) => onUpdate({ mat_color: c })} />
            <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Chair chip around the table ---
   Sizing is capacity-driven (see chairTierFor): low-capacity tables have room to spare,
   so their initials badges are bigger; high-capacity tables stay compact. Initials only —
   not full names, just larger circles. */
type ChairTier = { size: number; fontSize: number };
function chairTierFor(capacity: number): ChairTier {
  if (capacity <= 4) return { size: 52, fontSize: 16 };
  if (capacity <= 6) return { size: 44, fontSize: 14 };
  if (capacity <= 8) return { size: 38, fontSize: 13 };
  if (capacity <= 10) return { size: 28, fontSize: 11 };
  return { size: 22, fontSize: 10 };
}
function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
// Draggable (to reposition around the table, or onto another table entirely) AND
// droppable (so another chip can be dropped ONTO this one to be inserted next to this
// guest — see reorderSeat in SeatingPage). The draggable id is just the guest's id, same
// scheme as the sidebar's GuestChip, so handleGuestDrop doesn't need to care which source
// a drag came from. A small pointer-distance activation constraint (set on the DndContext)
// keeps a plain click on the initials still working as "unseat", same as before.
function ChairChip({ x, y, tier, name, initials, guestId, slotId, hasDiet, dietary, notes, onUnseat }: any) {
  const [tipOpen, setTipOpen] = useState(false);
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: guestId });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: slotId });
  return (
    <div
      ref={setDropRef}
      data-nodrag
      onClick={(e) => e.stopPropagation()}
      style={{ position: "absolute", left: x - tier.size / 2, top: y - tier.size / 2, width: tier.size, height: tier.size, opacity: isDragging ? 0.4 : 1 }}
      className="z-20"
    >
      <div className={cn("relative w-full h-full rounded-full transition-shadow", isOver && "ring-2 ring-clay ring-offset-1")}>
        <button
          ref={setDragRef}
          {...listeners}
          {...attributes}
          onClick={onUnseat}
          title={`${name} — drag to reposition, click to unseat`}
          style={{ fontSize: tier.fontSize }}
          className="w-full h-full rounded-full bg-paper border border-ink/30 shadow flex items-center justify-center font-semibold text-ink hover:bg-blush-soft hover:border-ink transition-colors cursor-grab active:cursor-grabbing"
        >
          <span className="leading-none">{initials}</span>
        </button>
        {hasDiet && (
          <>
            <button
              onPointerEnter={() => setTipOpen(true)}
              onPointerLeave={() => setTipOpen(false)}
              onClick={(e) => { e.stopPropagation(); setTipOpen((v) => !v); }}
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-paper flex items-center justify-center text-[8px] font-bold cursor-pointer"
              aria-label="Dietary info"
            >i</button>
            {tipOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-40 rounded-lg bg-ink text-paper text-[10px] px-2 py-1.5 shadow-lg min-w-[120px] max-w-[180px] pointer-events-none">
                <p className="font-medium mb-0.5">{name}</p>
                {dietary.length > 0 && <p className="opacity-90">{dietary.join(", ")}</p>}
                {notes && <p className="opacity-75 mt-0.5 italic">{notes}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* --- Empty seat slot ---
   A real, positioned, unoccupied chair — droppable (so a sidebar guest can be dropped
   directly onto it, filling that exact spot) AND independently draggable via a plain
   pointer handler (not dnd-kit — dragging a slot repositions it, it doesn't "carry" a
   guest, so it's a different gesture from ChairChip's dnd-kit drag). Persists to
   wedding_tables.seat_layout on release via onDragPosition, same commit-on-release
   pattern as the fixture/table resize handles. */
function EmptySlot({ x, y, size, tableId, index, onDragPosition }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `empty-slot:${tableId}:${index}` });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const pos = drag ?? { x, y };

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start = { px: e.clientX, py: e.clientY, x, y };
    const move = (ev: PointerEvent) => setDrag({ x: start.x + (ev.clientX - start.px), y: start.y + (ev.clientY - start.py) });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag((d) => { if (d) onDragPosition(index, d.x, d.y); return null; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={setNodeRef}
      data-nodrag
      onPointerDown={startDrag}
      onClick={(e) => e.stopPropagation()}
      title="Empty seat — drag a guest here, or drag this dot to rearrange the layout"
      style={{ position: "absolute", left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size }}
      className={cn(
        "rounded-full border-2 border-dashed bg-transparent cursor-grab active:cursor-grabbing transition-colors z-10",
        isOver ? "border-clay bg-clay/10" : "border-ink/25 hover:border-ink/45",
      )}
    />
  );
}

/* --- Fixture --- */
function FixtureNode({ fixture, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, zoom = 1 }: any) {
  const { handlers, current } = useMovable(
    { x: fixture.pos_x, y: fixture.pos_y },
    { w: fixture.width, h: fixture.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    CANVAS_EDGE_PADDING,
    zoom,
  );
  const { popRef, offset } = useClampedPopup(canvasRef, selected);
  const [resize, setResize] = useState<{ w: number; h: number } | null>(null);
  const size = resize ?? { w: fixture.width, h: fixture.height };
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, w: fixture.width, h: fixture.height };
    const move = (ev: PointerEvent) => setResize({
      w: Math.max(60, start.w + (ev.clientX - start.x) / zoom),
      h: Math.max(30, start.h + (ev.clientY - start.y) / zoom),
    });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResize((r) => { if (r) onUpdate({ width: r.w, height: r.h }); return null; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const shape = fixture.shape ?? (fixture.kind === "dance_floor" ? "round" : "rect");
  const isRound = shape === "round";
  return (
    <div
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`select-none cursor-move ${selected ? "z-20" : "z-0"}`}
    >
      <div
        className={`w-full h-full flex items-center justify-center text-center text-sm font-medium tracking-wide uppercase transition-shadow ${isRound ? "px-4" : "px-2.5"} py-1.5 ${selected ? "ring-2 ring-ink" : ""}`}
        style={{
          background: fixture.color ?? "#EDE7DA",
          borderRadius: isRound ? "50%" : 8,
          color: isDark(fixture.color) ? "#FEFDFA" : "#1A1512",
          opacity: 0.92,
        }}
      >
        <span className="truncate max-w-full">{fixture.label}</span>
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title="Drag to resize"
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 z-30 whitespace-nowrap">
            <input
              defaultValue={fixture.label ?? ""}
              onBlur={(e) => e.target.value !== fixture.label && onUpdate({ label: e.target.value })}
              className="w-16 text-sm bg-transparent border-b border-line focus:outline-none focus:border-clay"
            />
            <ShapePicker value={shape} onChange={(sh) => {
              const patch: any = { shape: sh };
              if (sh === "square") { patch.width = Math.max(fixture.width, fixture.height); patch.height = patch.width; }
              onUpdate(patch);
            }} />
            <ColorPicker value={fixture.color ?? "#EDE7DA"}
              presets={["#3B2A1E", "#4C1D24", "#C7A96B", "#E9D8FD", "#2A3B36", "#FADADD"]}
              onChange={(c) => onUpdate({ color: c })} />
            <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Floor area (zone) — same drag/resize pattern as fixtures, but a light, low-opacity
   fill (rendered behind tables and fixtures) and no shape/kind, just a named region. --- */
function AreaNode({ area, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, zoom = 1 }: any) {
  const { handlers, current } = useMovable(
    { x: area.pos_x, y: area.pos_y },
    { w: area.width, h: area.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    CANVAS_EDGE_PADDING,
    zoom,
  );
  const { popRef, offset } = useClampedPopup(canvasRef, selected);
  const [resize, setResize] = useState<{ w: number; h: number } | null>(null);
  const size = resize ?? { w: area.width, h: area.height };
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, w: area.width, h: area.height };
    const move = (ev: PointerEvent) => setResize({
      w: Math.max(60, start.w + (ev.clientX - start.x) / zoom),
      h: Math.max(60, start.h + (ev.clientY - start.y) / zoom),
    });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResize((r) => { if (r) onUpdate({ width: r.w, height: r.h }); return null; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`select-none cursor-move ${selected ? "z-10" : "z-0"}`}
    >
      <div
        className={`absolute inset-0 rounded-2xl border border-dashed ${selected ? "ring-2 ring-ink border-ink/40" : "border-ink/15"}`}
        style={{ background: area.color ?? AREA_COLORS[0], opacity: 0.4 }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3 py-2">
        <span className="text-sm font-medium tracking-wide uppercase text-ink text-center truncate max-w-full">{area.label}</span>
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title="Drag to resize"
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 z-30 whitespace-nowrap">
            <input
              defaultValue={area.label ?? ""}
              onBlur={(e) => e.target.value !== area.label && onUpdate({ label: e.target.value })}
              className="w-16 text-sm bg-transparent border-b border-line focus:outline-none focus:border-clay"
            />
            <ColorPicker value={area.color ?? AREA_COLORS[0]} presets={AREA_COLORS} onChange={(c) => onUpdate({ color: c })} />
            <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Shared UI --- */
function ShapePicker({ value, onChange }: { value: string; onChange: (s: "round" | "rect" | "square") => void }) {
  return (
    <div className="flex items-center gap-1">
      {(["round", "rect", "square"] as const).map((sh) => (
        <button key={sh} onClick={() => onChange(sh)}
          className={`h-6 w-6 rounded flex items-center justify-center border cursor-pointer ${value === sh ? "border-ink bg-stone" : "border-line hover:bg-stone"}`}
          title={sh}>
          {sh === "round" ? <Circle className="h-3 w-3" /> : sh === "rect" ? <RectangleHorizontal className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </button>
      ))}
    </div>
  );
}

// Small two-option segmented control, same border/active-state language as ShapePicker
// (border-ink + bg-stone when active, border-line + hover:bg-stone otherwise) — sized for
// text labels instead of a fixed icon square. Only rendered for rect/square tables.
const ARRANGEMENT_OPTIONS: { value: "facing" | "head"; label: string }[] = [
  { value: "facing", label: "Facing" },
  { value: "head", label: "Head seats" },
];
function ArrangementPicker({ value, onChange }: { value: "facing" | "head"; onChange: (v: "facing" | "head") => void }) {
  return (
    <div className="flex items-center gap-1">
      {ARRANGEMENT_OPTIONS.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`h-6 px-2 rounded flex items-center justify-center border text-xs whitespace-nowrap cursor-pointer ${value === o.value ? "border-ink bg-stone" : "border-line hover:bg-stone"}`}
          title={o.label}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, presets, onChange }: { value: string; presets: string[]; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  useEffect(() => { setHex(value); }, [value]);
  const commit = (v: string) => {
    const cleaned = v.startsWith("#") ? v : `#${v}`;
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cleaned)) onChange(cleaned);
  };
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="h-6 w-6 rounded-full border border-line cursor-pointer"
        style={{ background: value }} title="Color" />
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-2 right-0 p-3 rounded-2xl bg-paper border border-line shadow-lg w-56">
            <div className="grid grid-cols-8 gap-1.5">
              {presets.map((c) => (
                <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                  className={`h-5 w-5 rounded-full border cursor-pointer hover:scale-110 transition-transform ${value === c ? "border-ink border-2" : "border-line"}`}
                  style={{ background: c }} aria-label={c} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Hex</label>
              <input value={hex} onChange={(e) => setHex(e.target.value)} onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); setOpen(false); } }}
                placeholder="#FADADD"
                className="flex-1 text-sm rounded-lg border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-clay font-mono" />
              <span className="h-5 w-5 rounded-full border border-line" style={{ background: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.startsWith("#") ? hex : `#${hex}`) ? (hex.startsWith("#") ? hex : `#${hex}`) : "transparent" }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Geometry: chair positions on the perimeter --- */
// Round tables only now (rect/square go through facingPositions/headSeatPositions below
// instead) — evenly distributes n seats around an ellipse inscribed by the table's own
// width/height.
function chairPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const off = chair / 2 + gap;
  const rx = w / 2 + off;
  const ry = h / 2 + off;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: w / 2 + rx * Math.cos(a), y: h / 2 + ry * Math.sin(a) });
  }
  return out;
}

// Which pair of edges counts as the table's "long sides" vs. "short ends" — the edges
// that run along the LONGER dimension are the long sides (e.g. a 200x90 table's top/
// bottom edges are each 200 long, so top/bottom are the long sides and left/right, each
// only 90 long, are the short ends). A tie (square) falls to top/bottom, arbitrarily but
// deterministically.
function longSidesAreTopBottom(w: number, h: number): boolean {
  return w >= h;
}

// "Facing" arrangement: seats split evenly between the two LONG sides only — n/2 and n/2
// (the extra seat on an odd n going to the first group), each evenly spaced and mirrored
// directly across from its counterpart on the opposite side (same spacing formula/count
// on both sides produces matching positions). Zero seats on the short ends.
function facingPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const off = chair / 2 + gap;
  const out: { x: number; y: number }[] = [];
  if (n <= 0) return out;
  const sideACount = Math.ceil(n / 2);
  const sideBCount = n - sideACount;
  if (longSidesAreTopBottom(w, h)) {
    for (let i = 0; i < sideACount; i++) out.push({ x: ((i + 1) / (sideACount + 1)) * w, y: -off });
    for (let i = 0; i < sideBCount; i++) out.push({ x: ((i + 1) / (sideBCount + 1)) * w, y: h + off });
  } else {
    for (let i = 0; i < sideACount; i++) out.push({ x: -off, y: ((i + 1) / (sideACount + 1)) * h });
    for (let i = 0; i < sideBCount; i++) out.push({ x: w + off, y: ((i + 1) / (sideBCount + 1)) * h });
  }
  return out;
}

// "Head seats" arrangement: one seat centered on each SHORT end, the rest split evenly
// (ceil/floor) between the two long sides. Only meaningful for rect/square tables (see
// seat_arrangement) — always returns exactly n positions, in the same pixel-offset-
// relative-to-table-origin convention facingPositions()/chairPositions() use. Order is
// [short end A, short end B, long side A..., long side B...], which becomes the slot
// index order (slot 0 = first head seat, slot 1 = the other head seat, etc).
function headSeatPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const off = chair / 2 + gap;
  const out: { x: number; y: number }[] = [];
  if (n <= 0) return out;
  const topBottomAreLong = longSidesAreTopBottom(w, h);
  // Short-end head seats: left/right centers when top/bottom are the long sides,
  // top/bottom centers otherwise.
  out.push(topBottomAreLong ? { x: -off, y: h / 2 } : { x: w / 2, y: -off });
  if (n === 1) return out;
  out.push(topBottomAreLong ? { x: w + off, y: h / 2 } : { x: w / 2, y: h + off });
  const remaining = n - 2;
  if (remaining <= 0) return out;
  const sideACount = Math.ceil(remaining / 2);
  const sideBCount = remaining - sideACount;
  if (topBottomAreLong) {
    for (let i = 0; i < sideACount; i++) out.push({ x: ((i + 1) / (sideACount + 1)) * w, y: -off });
    for (let i = 0; i < sideBCount; i++) out.push({ x: ((i + 1) / (sideBCount + 1)) * w, y: h + off });
  } else {
    for (let i = 0; i < sideACount; i++) out.push({ x: -off, y: ((i + 1) / (sideACount + 1)) * h });
    for (let i = 0; i < sideBCount; i++) out.push({ x: w + off, y: ((i + 1) / (sideBCount + 1)) * h });
  }
  return out;
}

function isDark(hex?: string | null) {
  if (!hex || !hex.startsWith("#")) return false;
  const h = hex.slice(1);
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}
