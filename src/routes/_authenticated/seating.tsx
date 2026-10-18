import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { CustomColorButton } from "@/components/custom-color";
import {
  DndContext, DragOverlay, pointerWithin, closestCenter, PointerSensor, useSensor, useSensors, MeasuringStrategy,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, type Modifier, type CollisionDetection,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Plus, X, Trash2, Circle, Square, RectangleHorizontal, Music, GlassWater, Mic, DoorOpen, Palette, Users, Armchair, Check, CalendarDays, Download, Settings, ZoomIn, ZoomOut, ArrowRight, ArrowDown, ArrowUp, ArrowLeft, Maximize2, Minimize2, SlidersHorizontal, Search, BoxSelect, RotateCw } from "lucide-react";
import { OvalPhotoOrnament } from "@/components/photo-empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ResizeHandle } from "@/components/resize-handle";
import { FitLabel, TextFrame } from "@/components/fit-label";
import { exportSeatingPdf } from "@/lib/seating-export";
import {
  type ShapeKey, SHAPE_DEFAULT_SIZE, MIN_CHAIR_SIZE, MIN_CHAIR_FONT, type ChairTier, chairTierFor, abbreviateTableLabel, getInitials,
  type Arrangement, isTogetherArr, TOGETHER_CYCLE, chairPositions, facingPositions, togetherPositions, headSeatPositions, isDark,
} from "@/lib/seating-geometry";
import { cn, formatNumber } from "@/lib/utils";

// Soft-wash design tokens (same family used across cards/homepage feature grid), reused
// here as the color palette for floor areas instead of inventing new hex values.
const AREA_COLORS = ["#E4EDD8", "#FCEEEB", "#F4E8CE", "#E5E7F5", "#F6E3D6", "#FADCE1"];
const AREA_SUGGESTIONS = ["Dance floor", "Bar", "Entrance", "Stage", "DJ booth", "Photo booth"];

const DEFAULT_SHAPE_CAPACITY: Record<ShapeKey, number> = { round: 8, rect: 10, square: 4 };
const SHAPE_LABELS: Record<ShapeKey, string> = { round: "Round", rect: "Rectangular", square: "Square" };

// The little initials circle that follows the pointer while a guest is dragged is centred right on the pointer. Without
// this it sits where the (much wider) name chip was, so the pointer ends up well away from the circle.
const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (draggingNodeRect && activatorEvent) {
    const point = getEventCoordinates(activatorEvent);
    if (!point) return transform;
    return {
      ...transform,
      x: transform.x + point.x - draggingNodeRect.left - draggingNodeRect.width / 2,
      y: transform.y + point.y - draggingNodeRect.top - draggingNodeRect.height / 2,
    };
  }
  return transform;
};

// What is under the pointer wins; only when nothing is, the nearest centre does. Much less work per pointer move than
// measuring the distance to every seat and table on the floor plan.
const dropTarget: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};

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
  // Select mode: clicks add/remove items from the selection and dragging empty floor draws a box.
  const [selectMode, setSelectMode] = useState(false);
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
  const unseatedAll = guests.filter((g) => attendingIds.has(g.id) && !seatedIds.has(g.id));

  // Manage-guests filters: name search plus family/group, tag, dietary/allergy, and this
  // event's RSVP status — option lists come from whoever's actually in the unseated pool.
  const [guestQuery, setGuestQuery] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fTag, setFTag] = useState("");
  const [fDiet, setFDiet] = useState("");
  const [fRsvp, setFRsvp] = useState("");
  const rsvpByGuest = useMemo(() => {
    const m = new Map<string, string>();
    invites.filter((i) => i.event_id === eventId).forEach((i) => m.set(i.guest_id, i.rsvp_status));
    return m;
  }, [invites, eventId]);
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
  const groupOptions = uniq(unseatedAll.map((g) => g.household_group));
  const tagOptions = uniq(unseatedAll.flatMap((g) => g.tags ?? []));
  const dietOptions = uniq(unseatedAll.flatMap((g) => [...(g.dietary_tags ?? []), ...(g.food_allergies ?? [])]));
  const activeFilterCount = [fGroup, fTag, fDiet, fRsvp].filter(Boolean).length;
  const unseated = unseatedAll.filter((g) => {
    if (guestQuery && !g.full_name.toLowerCase().includes(guestQuery.toLowerCase())) return false;
    if (fGroup && g.household_group !== fGroup) return false;
    if (fTag && !g.tags?.includes(fTag)) return false;
    if (fDiet && !g.dietary_tags?.includes(fDiet) && !g.food_allergies?.includes(fDiet)) return false;
    if (fRsvp && rsvpByGuest.get(g.id) !== fRsvp) return false;
    return true;
  });
  const clearGuestFilters = () => { setGuestQuery(""); setFGroup(""); setFTag(""); setFDiet(""); setFRsvp(""); };

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
      tables, fixtures, areas, seats, guests,
      floorColor: layout?.background_color,
      canvasWidth: layout?.canvas_width ?? DEFAULT_CANVAS_W,
      canvasHeight: layout?.canvas_height ?? DEFAULT_CANVAS_H,
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
      toast.error("Couldn't save the canvas size: " + error.message);
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
            <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-ink text-paper"><CalendarDays className="h-5 w-5" /></span>
            <h2 className="mt-4 font-serif text-2xl">Add an event first</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seating plans live under an event. Add your ceremony or reception, then come back to design the floor plan.</p>
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
        <FullHeightCenter>
          <SeatingSetupCard onStart={startSeatingSetup} onSkip={() => setSetupSkipped(true)} />
        </FullHeightCenter>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={dropTarget}
        // Seat and table positions are measured once when a drag starts, not again on every move.
        measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
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
                selectMode={selectMode}
                onToggleSelect={() => setSelectMode((v) => !v)}
                zoom={zoom}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                fullView={fullView}
                onToggleFullView={toggleFullView}
              />
              <FloorCanvas
                zoom={zoom}
                selectMode={selectMode}
                onEnterSelect={() => setSelectMode(true)}
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
                  <h3 className="font-sans text-xl font-semibold flex-1">Manage guests</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" title="Filter guests"
                        className={cn("relative grid h-8 w-8 place-items-center rounded-full border cursor-pointer", activeFilterCount ? "bg-clay text-paper border-clay" : "border-line hover:bg-stone")}>
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-paper text-[9px] text-ink border border-line">{activeFilterCount}</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 rounded-2xl border-line bg-paper p-3 space-y-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Filter guests</p>
                      <FilterField label="Family / group" value={fGroup} onChange={setFGroup} options={groupOptions} />
                      <FilterField label="Tag" value={fTag} onChange={setFTag} options={tagOptions} />
                      <FilterField label="Dietary / allergy" value={fDiet} onChange={setFDiet} options={dietOptions} />
                      <FilterField label="RSVP" value={fRsvp} onChange={setFRsvp} options={["attending", "maybe", "pending"]} />
                      {(activeFilterCount > 0 || guestQuery) && (
                        <button type="button" onClick={clearGuestFilters} className="text-xs text-clay hover:underline cursor-pointer">Clear filters ×</button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={guestQuery} onChange={(e) => setGuestQuery(e.target.value)} placeholder="Search guests"
                    className="w-full rounded-full border border-line bg-paper pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                </div>
                <p className="text-sm uppercase tracking-widest text-clay">
                  Unseated · {formatNumber(unseated.length)}{unseated.length !== unseatedAll.length && ` of ${formatNumber(unseatedAll.length)}`}
                </p>
                <div className="mt-2 space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
                  {unseated.length === 0 && <p className="text-sm text-muted-foreground italic">{unseatedAll.length === 0 ? "Everyone attending has a seat." : "No guests match these filters."}</p>}
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
        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
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

// A fixed `100vh - Npx` guess for "the rest of the viewport below the page header" only
// holds if N happens to match this page's actual header height — it didn't here, which is
// why the card centered above the true middle instead of in it. Measuring this div's own
// distance from the viewport top and using THAT as the height budget is correct regardless
// of header height, font size, or viewport size, with no number to keep in sync by hand.
function FullHeightCenter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => setMinHeight(window.innerHeight - (ref.current?.getBoundingClientRect().top ?? 0));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div ref={ref} className="flex items-center justify-center" style={{ minHeight: minHeight ?? undefined }}>
      {children}
    </div>
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
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper"><Armchair className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-2xl">Let's set up your floor plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Pick what you need. We'll drop them onto your canvas as a starting point. Add or remove anything later.</p>

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
              {areas.length === 0 && <p className="text-sm text-muted-foreground italic">No areas yet. Add one below.</p>}
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
                      <CustomColorButton className="h-4 w-4" value={a.color} active={!AREA_COLORS.includes(a.color)} onChange={(c) => onUpdateArea(a.id, { color: c })} />
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
                  <CustomColorButton value={customColor} active={!AREA_COLORS.includes(customColor)} onChange={setCustomColor} />
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
function Toolbar({ floorColor, onFloor, onAddTable, onAddFixture, onOpenSettings, selectMode, onToggleSelect, zoom, onZoomIn, onZoomOut, fullView, onToggleFullView }: any) {
  const [colorOpen, setColorOpen] = useState(false);
  return (
    <div className="paper-card p-2.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      <div className="flex items-center gap-0.5 shrink-0">
        <TB onClick={() => onAddTable("round")} icon={<Circle className="h-3.5 w-3.5" />} label="Round" />
        <TB onClick={() => onAddTable("rect")}  icon={<RectangleHorizontal className="h-3.5 w-3.5" />} label="Rect" />
        <TB onClick={() => onAddTable("square")} icon={<Square className="h-3.5 w-3.5" />} label="Square" />
      </div>
      <ToolbarDivider />
      <div className="flex items-center gap-0.5 shrink-0">
        {FIXTURE_KINDS.map((f) => {
          const I = f.icon;
          return <TB key={f.kind} onClick={() => onAddFixture(f)} icon={<I className="h-3.5 w-3.5" />} label={f.label} />;
        })}
      </div>
      <ToolbarDivider beforePill />
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap shrink-0">
            <Palette className="h-3.5 w-3.5" /> Floor
            <span className="inline-block h-4 w-4 rounded-full border border-neutral-300" style={{ background: floorColor }} />
          </button>
        </PopoverTrigger>
        {/* Opens in its own layer above the toolbar, which scrolls sideways and would otherwise cut it off. */}
        <PopoverContent align="start" className="w-auto p-2.5 rounded-2xl border border-neutral-300 bg-paper shadow-lg">
          <p className="mb-2 text-xs text-muted-foreground">Floor colour</p>
          <div className="flex items-center gap-2">
            {FLOORS.map((c) => (
              <button key={c} onClick={() => { onFloor(c); setColorOpen(false); }}
                className={cn("h-7 w-7 rounded-full border cursor-pointer hover:scale-110 transition-transform", floorColor === c ? "border-ink ring-2 ring-ink/30" : "border-neutral-300")}
                style={{ background: c }} aria-label={`Floor colour ${c}`} />
            ))}
            <CustomColorButton className="h-7 w-7" value={floorColor} active={!FLOORS.includes(floorColor)} onChange={onFloor} />
          </div>
        </PopoverContent>
      </Popover>
      <button onClick={onOpenSettings} title="Floor areas & table defaults"
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap shrink-0">
        <Settings className="h-3.5 w-3.5" /> Settings
      </button>
      <button onClick={onToggleSelect} title="Pick any tables or items. Click them or drag a box. Then move them together (Ctrl/Cmd+A selects everything)"
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-xs cursor-pointer whitespace-nowrap shrink-0",
          selectMode ? "border-[#FFE08A] bg-[#FFF2B2] text-ink" : "border-neutral-300 hover:bg-stone")}>
        <BoxSelect className="h-3.5 w-3.5" /> Select
      </button>

      <div className="ml-auto flex items-center gap-3 pl-2 shrink-0">
        <div className="inline-flex items-center rounded-full border border-neutral-300 shrink-0">
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
        <button onClick={onToggleFullView} title={fullView ? "Exit full view" : "Full view. Fit the whole floor plan on screen"}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2 py-1.5 text-xs hover:bg-stone cursor-pointer whitespace-nowrap">
          {fullView ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {fullView ? "Close" : "Full view"}
        </button>
      </div>
    </div>
  );
}
// Text buttons (TB) carry 8px of their own horizontal padding before the visible text,
// while the bordered "Floor" pill's visible edge is its border itself — so a divider that
// sits right before a pill needs that same 8px added on its pill side, or the gap there
// looks tighter than the others even though the margins are numerically equal.
function ToolbarDivider({ beforePill = false }: { beforePill?: boolean }) {
  return <span aria-hidden className={cn("h-5 w-px shrink-0 bg-neutral-300", beforePill && "mr-2")} />;
}
function TB({ onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs whitespace-nowrap hover:bg-stone cursor-pointer">
      {icon}<span>{label}</span>
    </button>
  );
}

function FilterField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <Dropdown size="sm" value={value} onChange={onChange} placeholder="Any"
        options={[{ value: "", label: "Any" }, ...options.map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))]} />
    </div>
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
function FloorCanvas({ floorColor, canvasWidth, canvasHeight, onResizeCanvas, tables, fixtures, areas, seats, guests, onUpdateTable, onUpdateFixture, onUpdateArea, onDeleteTable, onDeleteFixture, onDeleteArea, onUnseat, onFirstTable, zoom = 1, selectMode = false, onEnterSelect, wrapRef: externalWrapRef, fill = false }: any) {
  const [selected, setSelected] = useState<{ kind: "table" | "fixture" | "area"; id: string } | null>(null);
  // Multi-selection ("select everything and move it together"): keys like "table:<id>".
  // While more than one thing is selected, dragging any member moves them all by the same
  // delta (kept clamped so none can leave the canvas); positions are saved on release.
  const [multi, setMulti] = useState<string[]>([]);
  const [groupDelta, setGroupDelta] = useState<{ x: number; y: number } | null>(null);
  const deltaRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  // Drag-a-box selection on empty canvas: live rectangle in canvas coordinates.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number; x1: number; y1: number; shift: boolean; base: string[] } | null>(null);
  const suppressBgClickRef = useRef(false);
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

  // Shrinking needs a floor — never smaller than whatever's actually placed on the
  // canvas (plus a little breathing room), so reducing the size can't strand a table
  // or fixture outside the new bounds.
  const placed = [...tables, ...fixtures, ...areas];
  const contentMaxX = placed.reduce((m, p: any) => Math.max(m, p.pos_x + p.width), 0);
  const contentMaxY = placed.reduce((m, p: any) => Math.max(m, p.pos_y + p.height), 0);
  // contentMaxX/Y can be fractional (a table's pos_x/width aren't guaranteed whole
  // pixels after a drag), so Math.round has to wrap the WHOLE max(), not just the
  // shrink side of it — canvas_width/height are `int` columns, and a fractional
  // value ("1279.3689...") gets rejected outright rather than silently truncated.
  const shrinkLeft = () => onResizeCanvas(Math.round(Math.max(contentMaxX + 40, canvasWidth / 1.1)), canvasHeight);
  const shrinkUp = () => onResizeCanvas(canvasWidth, Math.round(Math.max(contentMaxY + 40, canvasHeight / 1.1)));

  const items = [
    ...areas.map((a: any) => ({ k: `area:${a.id}`, p: a, margin: CANVAS_EDGE_PADDING, update: (patch: any) => onUpdateArea(a.id, patch) })),
    ...fixtures.map((f: any) => ({ k: `fixture:${f.id}`, p: f, margin: CANVAS_EDGE_PADDING, update: (patch: any) => onUpdateFixture(f.id, patch) })),
    ...tables.map((t: any) => ({ k: `table:${t.id}`, p: t, margin: TABLE_DRAG_MARGIN, update: (patch: any) => onUpdateTable(t.id, patch) })),
  ];
  const multiSet = new Set(multi);
  const members = items.filter((i) => multiSet.has(i.k));
  const selectAll = () => { setSelected(null); setMulti(items.map((i) => i.k)); };

  // Largest shared shift that keeps every member inside the canvas, using the same per-kind
  // edge margin each one's own single-item drag uses.
  const clampDelta = (dx: number, dy: number) => {
    let loX = -Infinity, hiX = Infinity, loY = -Infinity, hiY = Infinity;
    members.forEach(({ p, margin }) => {
      loX = Math.max(loX, margin - p.pos_x);
      hiX = Math.min(hiX, Math.max(margin, contentW - p.width - margin) - p.pos_x);
      loY = Math.max(loY, margin - p.pos_y);
      hiY = Math.min(hiY, Math.max(margin, contentH - p.height - margin) - p.pos_y);
    });
    return {
      x: Math.min(Math.max(dx, loX), Math.max(loX, hiX)),
      y: Math.min(Math.max(dy, loY), Math.max(loY, hiY)),
    };
  };
  const onGroupMove = (dx: number, dy: number) => { const d = clampDelta(dx, dy); deltaRef.current = d; setGroupDelta(d); };
  const onGroupEnd = () => {
    const d = deltaRef.current;
    deltaRef.current = null;
    setGroupDelta(null);
    if (!d || (Math.abs(d.x) < 0.5 && Math.abs(d.y) < 0.5)) return;
    suppressClickRef.current = true; // the click that follows a drag shouldn't change the selection
    members.forEach(({ p, update }) => update({ pos_x: p.pos_x + d.x, pos_y: p.pos_y + d.y }));
  };
  const groupFor = (k: string): GroupDrag => ({ member: multiSet.has(k), delta: groupDelta, onMove: onGroupMove, onEnd: onGroupEnd });

  const marqueeHits = (m: { x0: number; y0: number; x1: number; y1: number }) => {
    const l = Math.min(m.x0, m.x1), r = Math.max(m.x0, m.x1), t = Math.min(m.y0, m.y1), b = Math.max(m.y0, m.y1);
    return items.filter(({ p }) => p.pos_x < r && p.pos_x + p.width > l && p.pos_y < b && p.pos_y + p.height > t).map((i) => i.k);
  };
  const canvasPoint = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };
  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget || e.button !== 0) return; // only empty floor starts a box
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = canvasPoint(e);
    const base = (selectMode || e.shiftKey) ? (multi.length ? multi : selected ? [`${selected.kind}:${selected.id}`] : []) : [];
    marqueeRef.current = { x0: x, y0: y, x1: x, y1: y, shift: e.shiftKey, base };
  };
  const onBgPointerMove = (e: React.PointerEvent) => {
    const m = marqueeRef.current;
    if (!m) return;
    const { x, y } = canvasPoint(e);
    m.x1 = x; m.y1 = y;
    if (Math.hypot((x - m.x0) * zoom, (y - m.y0) * zoom) > 4) setMarquee({ x0: m.x0, y0: m.y0, x1: x, y1: y });
  };
  const onBgPointerUp = (e: React.PointerEvent) => {
    const m = marqueeRef.current;
    if (!m) return;
    marqueeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!marquee) return; // never moved far enough: a plain click, handled by onClick
    suppressBgClickRef.current = true;
    setMarquee(null);
    const next = Array.from(new Set([...m.base, ...marqueeHits(m)]));
    if (next.length <= 1 && !selectMode) { // select mode keeps even a single pick in the glowing group
      setMulti([]);
      const [nk] = next;
      setSelected(nk ? { kind: nk.split(":")[0] as any, id: nk.slice(nk.indexOf(":") + 1) } : null);
    } else { setSelected(null); setMulti(next); }
  };

  // Plain click selects one thing; shift/ctrl/cmd-click adds or removes it from a group.
  const handleSelect = (kind: "table" | "fixture" | "area", id: string, e?: React.MouseEvent) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    const k = `${kind}:${id}`;
    if (selectMode || (e && (e.shiftKey || e.metaKey || e.ctrlKey))) {
      const base = multi.length ? multi : selected ? [`${selected.kind}:${selected.id}`] : [];
      const next = base.includes(k) ? base.filter((x) => x !== k) : [...base, k];
      if (next.length <= 1 && !selectMode) { // select mode keeps even a single pick in the glowing group
        setMulti([]);
        const [nk] = next;
        setSelected(nk ? { kind: nk.split(":")[0] as any, id: nk.slice(nk.indexOf(":") + 1) } : null);
      } else { setSelected(null); setMulti(next); }
      return;
    }
    setMulti([]);
    setSelected({ kind, id });
  };

  // Leaving select mode drops whatever was picked.
  useEffect(() => { if (!selectMode) setMulti([]); }, [selectMode]);

  // Cmd/Ctrl+A selects everything (unless typing in a field); Escape drops the group.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); onEnterSelect?.(); selectAll(); }
      else if (e.key === "Escape") setMulti([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    <div className={cn("relative", fill ? "flex-1 min-h-0 flex flex-col" : "mb-8")}>
    <div ref={setWrapRef} className={cn(
      "w-full rounded-3xl border border-neutral-300 shadow-inner bg-paper overflow-auto",
      // flex-1 (not h-full) so it actually grows to fill the remaining space in the
      // full-view flex column below the toolbar; min-h-0 overrides flex's default
      // min-height:auto, which would otherwise refuse to shrink below content size
      // and silently break the overflow-auto scroll this relies on.
      fill ? "flex-1 min-h-0" : "max-h-[75vh]",
    )}>
      {/* This sizing div reserves the actual (zoomed) footprint for scrolling/centering —
          a CSS transform alone doesn't change layout size, so without this wrapper the
          scroll container would size itself off the unscaled content and either clip a
          zoomed-in canvas or leave dead space around a zoomed-out one. */}
      <div className="mx-auto" style={{ width: contentW * zoom, height: contentH * zoom }}>
        <div
          className={cn("relative", selectMode && "cursor-crosshair")}
          style={{
            width: contentW,
            height: contentH,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            background: floorColor,
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onPointerDown={onBgPointerDown}
          onPointerMove={onBgPointerMove}
          onPointerUp={onBgPointerUp}
          onClick={() => {
            if (suppressBgClickRef.current) { suppressBgClickRef.current = false; return; }
            if (selectMode) return; // in select mode only Esc / toggling off clears
            setSelected(null); setMulti([]);
          }}
        >
          {marquee && (
            <div className="absolute z-30 pointer-events-none rounded-sm border border-dashed border-[#4A7CAD] bg-[#7FA8D6]/15"
              style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }} />
          )}
          {areas.map((a: any) => (
            <AreaNode key={a.id} area={a} bounds={bounds} canvasRef={wrapRef} selected={selected?.kind === "area" && selected.id === a.id}
              onSelect={(e: React.MouseEvent) => handleSelect("area", a.id, e)}
              group={groupFor(`area:${a.id}`)} grouped={multiSet.has(`area:${a.id}`)}
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
              onSelect={(e: React.MouseEvent) => handleSelect("fixture", f.id, e)}
              group={groupFor(`fixture:${f.id}`)} grouped={multiSet.has(`fixture:${f.id}`)}
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
                onSelect={(e: React.MouseEvent) => handleSelect("table", t.id, e)}
                group={groupFor(`table:${t.id}`)} grouped={multiSet.has(`table:${t.id}`)}
                onUpdate={(patch: any) => onUpdateTable(t.id, patch)}
                onDelete={() => onDeleteTable(t.id)}
                onUnseat={onUnseat} zoom={zoom} />
            );
          })}
        </div>
      </div>
    </div>

      {/* "Extend/shrink the canvas" controls — a sibling of the scrollable frame
          itself (not of its scrolled content, and not inside it at all), positioned
          against the outer `relative` wrapper instead. A plain absolute position
          here is pinned to that wrapper's own box — i.e. the frame's visible corner
          — completely independent of the inner div's scroll offset, so it's always
          visible no matter where the canvas has been scrolled to. (An earlier
          version tried `position: sticky` on an element *inside* the scrolling
          content; that only reliably sticks along the axis the content is taller
          than the viewport in, not both at once, which is what actually caused the
          "only shows up scrolled all the way over" bug.) */}
      <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1.5">
        <button type="button" onClick={shrinkUp} title="Shrink canvas height"
          className="grid h-8 w-8 place-items-center rounded-full bg-paper border border-neutral-300 text-muted-foreground hover:text-ink shadow-md cursor-pointer">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={extendDown} title="Extend canvas downward"
          className="grid h-8 w-8 place-items-center rounded-full bg-paper border border-neutral-300 text-muted-foreground hover:text-ink shadow-md cursor-pointer">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={shrinkLeft} title="Shrink canvas width"
          className="grid h-8 w-8 place-items-center rounded-full bg-paper border border-neutral-300 text-muted-foreground hover:text-ink shadow-md cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={extendRight} title="Extend canvas rightward"
          className="grid h-8 w-8 place-items-center rounded-full bg-paper border border-neutral-300 text-muted-foreground hover:text-ink shadow-md cursor-pointer">
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
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
  group?: GroupDrag,
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
    // Part of a multi-selection: the canvas owns the drag (one shared delta for every
    // member) instead of this element tracking its own position.
    if (group?.member) return;
    setDrag(clamp(pos.x, pos.y));
  };
  // Pointer coordinates arrive in real screen pixels regardless of the canvas's CSS zoom
  // transform, but pos_x/pos_y are stored in the canvas's own (unscaled) coordinate space —
  // dividing the raw delta by zoom converts "how far the cursor moved on screen" back into
  // "how far that is on the actual floor plan," so a table tracks the cursor 1:1 at any zoom.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    if (group?.member) {
      group.onMove((e.clientX - startRef.current.px) / zoom, (e.clientY - startRef.current.py) / zoom);
      return;
    }
    const nx = startRef.current.ox + (e.clientX - startRef.current.px) / zoom;
    const ny = startRef.current.oy + (e.clientY - startRef.current.py) / zoom;
    setDrag(clamp(nx, ny));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (group?.member) {
      group.onEnd();
      startRef.current = null;
      return;
    }
    if (drag) onEnd(drag);
    startRef.current = null;
    setDrag(null);
  };
  // Clamp the resting position too — an element already saved out-of-bounds (e.g. before
  // this fix existed) renders back on-canvas immediately, not just after its next drag.
  const grouped = !!group?.member;
  const rest = clamp(pos.x, pos.y);
  const current = grouped && group!.delta ? { x: pos.x + group!.delta.x, y: pos.y + group!.delta.y } : drag ?? rest;
  return { handlers: { onPointerDown, onPointerMove, onPointerUp }, current, dragging: drag !== null || (grouped && !!group!.delta) };
}

// Shared-drag wiring handed to every node that's part of a multi-selection.
type GroupDrag = { member: boolean; delta: { x: number; y: number } | null; onMove: (dx: number, dy: number) => void; onEnd: () => void };

/* --- Inline editor popup (table/area/fixture settings bar), rendered through a portal
   straight into document.body instead of staying a normal-flow descendant of the
   scrollable canvas. A translate()-based correction (the previous approach) can re-measure
   as often as it likes, but it can never escape an ancestor's overflow:auto clipping —
   the canvas will always visually cut off a popup that's still, DOM-wise, a child of it
   once the popup's natural position lands near an edge. Portaling it out entirely sidesteps
   that whole class of bug: position is computed as real `position: fixed` screen
   coordinates from the anchor element's own current rect, clamped to stay inside the
   canvas's visible viewport, and re-measured on every render plus on scroll/resize
   (capture:true on window so it catches scroll events from the canvas's own scroll
   container, which don't bubble to window on their own). */
function useClampedPopup(canvasRef: React.RefObject<HTMLElement | null>, anchorRef: React.RefObject<HTMLElement | null>, active: boolean) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const measure = () => {
    if (!active) { setPos(null); return; }
    const anchor = anchorRef.current;
    const canvas = canvasRef.current;
    if (!anchor || !canvas) return;
    const anchorRect = anchor.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const pop = popRef.current;
    const popWidth = pop?.offsetWidth ?? 220;
    const popHeight = pop?.offsetHeight ?? 44;
    const margin = 8;
    // Natural position: centered under the anchor, matching where the old CSS-only
    // placement (-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2) put it.
    let left = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
    let top = anchorRect.bottom + 8;
    left = Math.min(Math.max(left, canvasRect.left + margin), canvasRect.right - popWidth - margin);
    top = Math.min(Math.max(top, canvasRect.top + margin), canvasRect.bottom - popHeight - margin);
    setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
  };
  // useLayoutEffect (not useEffect) so the corrected position is applied before the
  // browser paints — no dependency array on purpose, re-measures on every render so a
  // popup whose own content changes width (e.g. typing a longer label) stays clamped.
  useLayoutEffect(measure);
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [active]);
  return { popRef, pos };
}

/* --- Table --- */
// Clears the widest possible chair orbit (max chip size 52 + max gap 12, and the chip
// itself extends another half its own size past its center point) so seated guests'
// avatars never spill past the canvas edge even when the table is dragged flush against it.
const TABLE_DRAG_MARGIN = 70;
// Brand-yellow glow marking everything in a multi-selection, so it's obvious at a glance.
const GROUP_GLOW = "0 0 0 3px rgba(255,224,138,0.9), 0 0 20px 6px rgba(255,224,138,0.4)";

function TableNode({ table, seated, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, onUnseat, zoom = 1, group, grouped }: any) {
  const noCapacity = !table.seats || table.seats <= 0;
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}`, disabled: noCapacity });
  const { handlers, current, dragging } = useMovable(
    { x: table.pos_x, y: table.pos_y },
    { w: table.width, h: table.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    TABLE_DRAG_MARGIN,
    zoom,
    group,
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  // Suspended while actively dragging: repositioning the popup needs a synchronous
  // layout read (getBoundingClientRect) on every single pointermove, which is exactly
  // the kind of forced-reflow-per-frame that shows up as stutter while dragging. The
  // popup reappears, correctly positioned, the moment the drag ends.
  const { popRef, pos: popPos } = useClampedPopup(canvasRef, anchorRef, selected && !dragging);
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
  // Below this, the table's actual full label stops fitting on one line regardless of
  // capacity — swap to the short "T5" form and drop the font a notch rather than letting
  // `truncate` clip it to "T...".
  const isMinSize = isRound ? size.w <= 70 : Math.min(size.w, size.h) <= 70;
  const displayLabel = isMinSize ? abbreviateTableLabel(table.label) : table.label;
  const labelSize = isMinSize ? "text-xs" : capacity <= 6 ? "text-base" : "text-sm";
  const subSize = isMinSize ? "text-[10px]" : capacity <= 8 ? "text-sm" : "text-xs";

  // "Head seats" only means anything for rect/square tables — round always renders
  // 'facing' regardless of what's stored (belt-and-suspenders alongside the ShapePicker's
  // own force-back-to-facing when switching TO round).
  const stored = table.seat_arrangement;
  const arrangement: Arrangement = isRound ? "facing"
    : stored === "head" || TOGETHER_CYCLE.includes(stored as Arrangement) ? (stored as Arrangement)
    : "facing";

  // Picks between the position-math functions for a given shape/size/arrangement and
  // converts to fractions of that size — shared by the default (no custom layout saved
  // yet) case below, by the arrangement/shape pickers' onChange, AND by initial table
  // creation (addTable seeds pos_x/y/shape only; the first render with no stored
  // seat_layout falls through to this same default path), so a regenerated layout is
  // always computed the exact same way regardless of which of those triggered it. Round
  // stays circular (arrangement is always 'facing' there); rect/square split between
  // facingPositions (long-sides-only) and headSeatPositions (short-end + long-sides).
  const computeLayoutFractions = (shape: string, w: number, h: number, arr: Arrangement) => {
    const positions = shape === "round"
      ? chairPositions(w, h, slotCount, tier.size, GAP)
      : arr === "head"
        ? headSeatPositions(w, h, slotCount, tier.size, GAP)
        : isTogetherArr(arr)
          ? togetherPositions(w, h, slotCount, tier.size, GAP, arr === "together_flip" ? "bottom" : arr === "together_left" ? "left" : arr === "together_right" ? "right" : "top")
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
  // A saved layout whose chips touch or overlap (e.g. one generated back when "together"
  // seats were packed tighter) is discarded in favour of the current, properly spaced default.
  const storedUsable = !!storedLayout && storedLayout.length === slotCount && !storedLayout.some((a, i) =>
    storedLayout.some((b, j) => j > i && Math.hypot((a.x - b.x) * size.w, (a.y - b.y) * size.h) < tier.size + 6));
  const layoutFractions = storedUsable ? storedLayout! : defaultLayoutFractions();
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
      ref={anchorRef}
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(e); }}
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
          boxShadow: grouped ? GROUP_GLOW : "0 4px 14px rgba(26,21,18,0.12)",
        }}
      >
        {/* The label and seat count size themselves to the table, never cut off, and can be turned on their side. */}
        <TextFrame width={isRound ? size.w * 0.72 : size.w - 20} height={isRound ? size.h * 0.6 : size.h - 16} rotation={table.rotation ?? 0}>
          {({ w, h }) => (
            <>
              <FitLabel text={table.label} boxW={w} boxH={noCapacity ? h : h * 0.6} max={16} min={10} weight={500} className="text-ink" />
              {!noCapacity && <FitLabel text={`${formatNumber(seated.length)}/${formatNumber(table.seats)}`} boxW={w} boxH={h * 0.36} max={14} min={9} weight={400} className="text-ink" />}
            </>
          )}
        </TextFrame>
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title={isRound ? "Drag to resize (stays round)" : "Drag to resize"}
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          {popPos && createPortal(
            <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", left: popPos.left, top: popPos.top }}
              className="bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 whitespace-nowrap z-50">
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
              <button type="button" onClick={() => onUpdate({ rotation: ((table.rotation ?? 0) + 90) % 360 })} title="Turn the text a quarter turn"
                className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0"><RotateCw className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  );
}

/* --- Chair chip around the table ---
   Sizing is capacity-driven (see chairTierFor): low-capacity tables have room to spare,
   so their initials badges are bigger; high-capacity tables stay compact. Initials only —
   not full names, just larger circles. */
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
          title={`${name}. Drag to reposition, click to unseat`}
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
      title="Empty seat. Drag a guest here, or drag this dot to rearrange the layout"
      style={{ position: "absolute", left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size }}
      className={cn(
        "rounded-full border-2 border-dashed bg-transparent cursor-grab active:cursor-grabbing transition-colors z-10",
        isOver ? "border-clay bg-clay/10" : "border-ink/25 hover:border-ink/45",
      )}
    />
  );
}

/* --- Fixture --- */
function FixtureNode({ fixture, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, zoom = 1, group, grouped }: any) {
  const { handlers, current, dragging } = useMovable(
    { x: fixture.pos_x, y: fixture.pos_y },
    { w: fixture.width, h: fixture.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    CANVAS_EDGE_PADDING,
    zoom,
    group,
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const { popRef, pos: popPos } = useClampedPopup(canvasRef, anchorRef, selected && !dragging);
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
      ref={anchorRef}
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(e); }}
      className={`select-none cursor-move ${selected ? "z-20" : "z-0"}`}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center text-center transition-shadow ${selected ? "ring-2 ring-ink" : ""}`}
        style={{
          background: fixture.color ?? "#EDE7DA",
          borderRadius: isRound ? "50%" : 8,
          color: isDark(fixture.color) ? "#FEFDFA" : "#1A1512",
          opacity: 0.92,
          boxShadow: grouped ? GROUP_GLOW : undefined,
        }}
      >
        <TextFrame width={isRound ? size.w * 0.72 : size.w - 16} height={isRound ? size.h * 0.6 : size.h - 12} rotation={fixture.rotation ?? 0}>
          {({ w, h }) => <FitLabel text={fixture.label ?? ""} boxW={w} boxH={h} max={14} min={9} weight={500} spacingEm={0.04} uppercase />}
        </TextFrame>
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title="Drag to resize"
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          {popPos && createPortal(
            <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", left: popPos.left, top: popPos.top }}
              className="bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 z-50 whitespace-nowrap">
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
              <button type="button" onClick={() => onUpdate({ rotation: ((fixture.rotation ?? 0) + 90) % 360 })} title="Turn the text a quarter turn"
                className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0"><RotateCw className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  );
}

/* --- Floor area (zone) — same drag/resize pattern as fixtures, but a light, low-opacity
   fill (rendered behind tables and fixtures) and no shape/kind, just a named region. --- */
function AreaNode({ area, bounds, canvasRef, selected, onSelect, onUpdate, onDelete, zoom = 1, group, grouped }: any) {
  const { handlers, current, dragging } = useMovable(
    { x: area.pos_x, y: area.pos_y },
    { w: area.width, h: area.height },
    bounds,
    (p) => onUpdate({ pos_x: p.x, pos_y: p.y }),
    CANVAS_EDGE_PADDING,
    zoom,
    group,
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const { popRef, pos: popPos } = useClampedPopup(canvasRef, anchorRef, selected && !dragging);
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
      ref={anchorRef}
      style={{ position: "absolute", left: current.x, top: current.y, width: size.w, height: size.h, boxShadow: grouped ? GROUP_GLOW : undefined }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(e); }}
      className={`select-none cursor-move ${grouped ? "rounded-2xl" : ""} ${selected ? "z-10" : "z-0"}`}
    >
      <div
        className={`absolute inset-0 rounded-2xl border border-dashed ${selected ? "ring-2 ring-ink border-ink/40" : "border-ink/15"}`}
        style={{ background: area.color ?? AREA_COLORS[0], opacity: 0.4 }}
      />
      <div className="absolute inset-0 pointer-events-none text-ink">
        <TextFrame width={size.w - 20} height={size.h - 16} rotation={area.text_rotation ?? 0}>
          {({ w, h }) => <FitLabel text={area.label ?? ""} boxW={w} boxH={h} max={18} min={9} weight={500} spacingEm={0.04} uppercase />}
        </TextFrame>
      </div>

      {selected && (
        <>
          <ResizeHandle
            data-nodrag
            title="Drag to resize"
            onPointerDown={startResize}
            className="absolute -right-3 -bottom-3 z-30 shadow"
          />
          {popPos && createPortal(
            <div ref={popRef} data-nodrag onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", left: popPos.left, top: popPos.top }}
              className="bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-1.5 z-50 whitespace-nowrap">
              <input
                defaultValue={area.label ?? ""}
                onBlur={(e) => e.target.value !== area.label && onUpdate({ label: e.target.value })}
                className="w-16 text-sm bg-transparent border-b border-line focus:outline-none focus:border-clay"
              />
              <ColorPicker value={area.color ?? AREA_COLORS[0]} presets={AREA_COLORS} onChange={(c) => onUpdate({ color: c })} />
              <button type="button" onClick={() => onUpdate({ text_rotation: ((area.text_rotation ?? 0) + 90) % 360 })} title="Turn the text a quarter turn"
                className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0"><RotateCw className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>,
            document.body,
          )}
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

function ArrangementPicker({ value, onChange }: { value: Arrangement; onChange: (v: Arrangement) => void }) {
  const isTogether = isTogetherArr(value);
  const nextTogether = isTogether ? TOGETHER_CYCLE[(TOGETHER_CYCLE.indexOf(value) + 1) % TOGETHER_CYCLE.length] : "together";
  return (
    <div className="flex items-center gap-1">
      {ARRANGEMENT_OPTIONS.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`h-6 px-2 rounded flex items-center justify-center border text-xs whitespace-nowrap cursor-pointer ${value === o.value ? "border-ink bg-stone" : "border-line hover:bg-stone"}`}
          title={o.label}>
          {o.label}
        </button>
      ))}
      {/* All seats on one long side (a couple's sweetheart table, or a one-sided
          head table). Clicking it again while it's already active moves them to the
          next side: top, bottom, left, right, then back to top. */}
      <button onClick={() => onChange(nextTogether)}
        className={`h-6 px-2 rounded flex items-center justify-center border text-xs whitespace-nowrap cursor-pointer ${isTogether ? "border-ink bg-stone" : "border-line hover:bg-stone"}`}
        title={isTogether ? "Click again to move to the next side" : "All seats on one side"}>
        Together
      </button>
    </div>
  );
}

function ColorPicker({ value, presets, onChange }: { value: string; presets: string[]; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="h-6 w-6 rounded-full border border-line cursor-pointer"
        style={{ background: value }} title="Color" />
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-2 right-0 p-3 rounded-2xl bg-paper border border-line shadow-lg w-56">
            <div className="grid grid-cols-6 gap-2">
              {presets.map((c) => (
                <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                  className={`h-6 w-6 rounded-full border cursor-pointer hover:scale-110 transition-transform ${value === c ? "border-ink border-2" : "border-line"}`}
                  style={{ background: c }} aria-label={c} />
              ))}
              <CustomColorButton className="h-6 w-6" value={value} active={!presets.includes(value)} onChange={(c) => { onChange(c); }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

