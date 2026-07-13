import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Trash2, Circle, Square, RectangleHorizontal, Music, GlassWater, Mic, DoorOpen, Palette, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seating")({
  component: SeatingPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

const CANVAS_W = 1400;
const CANVAS_H = 900;

const TABLECLOTHS = ["#F5EEDC", "#FADADD", "#D9E8DC", "#F4C7BA", "#E6D5F2", "#F8E4B7", "#C9E0EA", "#FFFFFF"];
const FLOORS = ["#FEFDFA", "#F5EEDC", "#EDE7DA", "#E6DFCB", "#2A3B36", "#1A1512", "#F0E4D0"];
const FIXTURE_KINDS: { kind: string; label: string; icon: any; color: string; w: number; h: number }[] = [
  { kind: "dance_floor", label: "Dance floor", icon: Music, color: "#E9D8FD", w: 260, h: 260 },
  { kind: "bar",         label: "Bar",         icon: GlassWater, color: "#3B2A1E", w: 220, h: 70 },
  { kind: "stage",       label: "Stage",       icon: Mic, color: "#4C1D24", w: 240, h: 90 },
  { kind: "entrance",    label: "Entrance",    icon: DoorOpen, color: "#C7A96B", w: 120, h: 40 },
];

function SeatingPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const search = Route.useSearch();
  const [eventId, setEventId] = useState<string>("");
  const qc = useQueryClient();

  useEffect(() => {
    if (search.event && events.some((e) => e.id === search.event)) setEventId(search.event);
    else if (!eventId && events.length) setEventId(events[0].id);
  }, [events, search.event]); // eslint-disable-line

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

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", eventId],
    enabled: !!eventId,
    queryFn: async () => (await supabase.from("wedding_tables").select("*").eq("event_id", eventId).order("sort_order")).data ?? [],
  });

  const { data: fixtures = [] } = useQuery({
    queryKey: ["fixtures", eventId],
    enabled: !!eventId,
    queryFn: async () => (await supabase.from("seating_fixtures").select("*").eq("event_id", eventId)).data ?? [],
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", eventId, tables.map((t: any) => t.id).join(",")],
    enabled: tables.length > 0,
    queryFn: async () => (await supabase.from("seat_assignments").select("*").in("table_id", tables.map((t: any) => t.id))).data ?? [],
  });

  const attendingIds = useMemo(
    () => new Set(invites.filter((i) => i.event_id === eventId && i.rsvp_status !== "declined").map((i) => i.guest_id)),
    [invites, eventId],
  );
  const seatedIds = useMemo(() => new Set(seats.map((s: any) => s.guest_id)), [seats]);
  const unseated = guests.filter((g) => attendingIds.has(g.id) && !seatedIds.has(g.id));

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["tables", eventId] });
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
    qc.invalidateQueries({ queryKey: ["seats", eventId] });
  };

  const addTable = async (shape: "round" | "rect" | "square") => {
    if (!eventId) return;
    const isRect = shape === "rect";
    await supabase.from("wedding_tables").insert({
      event_id: eventId,
      label: `Table ${tables.length + 1}`,
      seats: isRect ? 10 : 8,
      shape,
      width: isRect ? 200 : shape === "square" ? 120 : 140,
      height: isRect ? 90 : shape === "square" ? 120 : 140,
      pos_x: 120 + (tables.length % 5) * 160,
      pos_y: 120 + Math.floor(tables.length / 5) * 160,
      sort_order: tables.length,
      mat_color: TABLECLOTHS[tables.length % TABLECLOTHS.length],
    });
    qc.invalidateQueries({ queryKey: ["tables", eventId] });
  };

  const addFixture = async (kind: (typeof FIXTURE_KINDS)[number]) => {
    if (!eventId) return;
    await supabase.from("seating_fixtures").insert({
      event_id: eventId, kind: kind.kind, label: kind.label,
      color: kind.color, width: kind.w, height: kind.h, pos_x: 200, pos_y: 200,
    });
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
    if (!confirm("Delete this table?")) return;
    await supabase.from("wedding_tables").delete().eq("id", id);
    invalidateAll();
  };
  const deleteFixture = async (id: string) => {
    await supabase.from("seating_fixtures").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fixtures", eventId] });
  };
  const unseat = async (assignmentId: string) => {
    await supabase.from("seat_assignments").delete().eq("id", assignmentId);
    qc.invalidateQueries({ queryKey: ["seats", eventId] });
  };
  const setFloor = async (color: string) => {
    if (!layout) return;
    qc.setQueryData(["seating-layout", eventId], { ...layout, background_color: color });
    await supabase.from("seating_layouts").update({ background_color: color }).eq("id", layout.id);
  };

  const handleGuestDrop = async (e: DragEndEvent) => {
    const gid = e.active.id as string;
    const tid = e.over?.id as string | undefined;
    if (!tid || !String(tid).startsWith("table:")) return;
    const tableId = String(tid).slice(6);
    const tbl = tables.find((t: any) => t.id === tableId);
    if (tbl && seats.filter((s: any) => s.table_id === tableId).length >= tbl.seats) {
      return toast.error(`${tbl.label} is at capacity`);
    }
    await supabase.from("seat_assignments").delete().eq("guest_id", gid);
    const { error } = await supabase.from("seat_assignments").insert({ table_id: tableId, guest_id: gid });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seats", eventId] });
  };

  if (!events.length) {
    return (
      <AppShell title="Seating" subtitle="Add events first.">
        <p className="text-muted-foreground text-sm">Head to Events to add a ceremony.</p>
      </AppShell>
    );
  }

  const floorColor = layout?.background_color ?? "#FEFDFA";

  return (
    <AppShell
      title="Seating"
      subtitle="Design your floor plan. Drag tables and fixtures, then drop guests from the sidebar."
      actions={
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-full border border-line pl-4 pr-10 py-2 text-sm bg-paper cursor-pointer appearance-none bg-no-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A1512' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundPosition: "right 14px center" }}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      }
    >
      <DndContext onDragEnd={handleGuestDrop}>
        <div className="grid lg:grid-cols-[300px_1fr] gap-4">
          {/* Guest sidebar */}
          <aside className="paper-card p-5 h-fit lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-clay" />
              <h3 className="font-serif text-xl">Manage guests</h3>
            </div>
            <p className="text-[11px] uppercase tracking-widest text-clay">Unseated · {unseated.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Drag onto a table.</p>
            <div className="mt-4 space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
              {unseated.length === 0 && <p className="text-xs text-muted-foreground italic">Everyone attending has a seat.</p>}
              {unseated.map((g) => <GuestChip key={g.id} id={g.id} name={g.full_name} />)}
            </div>
          </aside>

          {/* Canvas + toolbar */}
          <div className="space-y-3">
            <Toolbar
              floorColor={floorColor}
              onFloor={setFloor}
              onAddTable={addTable}
              onAddFixture={addFixture}
              tableCount={tables.length}
            />
            <FloorCanvas
              floorColor={floorColor}
              tables={tables}
              fixtures={fixtures}
              seats={seats}
              guests={guests}
              onUpdateTable={updateTable}
              onUpdateFixture={updateFixture}
              onDeleteTable={deleteTable}
              onDeleteFixture={deleteFixture}
              onUnseat={unseat}
              onFirstTable={() => addTable("round")}
            />
          </div>
        </div>
      </DndContext>
    </AppShell>
  );
}

/* --- Toolbar --- */
function Toolbar({ floorColor, onFloor, onAddTable, onAddFixture, tableCount }: any) {
  const [colorOpen, setColorOpen] = useState(false);
  return (
    <div className="paper-card p-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 pr-2 border-r border-line">
        <TB onClick={() => onAddTable("round")} icon={<Circle className="h-4 w-4" />} label="Round" />
        <TB onClick={() => onAddTable("rect")}  icon={<RectangleHorizontal className="h-4 w-4" />} label="Rect" />
        <TB onClick={() => onAddTable("square")} icon={<Square className="h-4 w-4" />} label="Square" />
      </div>
      <div className="flex items-center gap-1 pr-2 border-r border-line">
        {FIXTURE_KINDS.map((f) => {
          const I = f.icon;
          return <TB key={f.kind} onClick={() => onAddFixture(f)} icon={<I className="h-4 w-4" />} label={f.label} />;
        })}
      </div>
      <div className="relative">
        <button onClick={() => setColorOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-stone cursor-pointer">
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
      <span className="ml-auto text-xs text-muted-foreground">{tableCount} table{tableCount === 1 ? "" : "s"}</span>
    </div>
  );
}
function TB({ onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs hover:bg-stone cursor-pointer">
      {icon}<span>{label}</span>
    </button>
  );
}

/* --- Guest chip in sidebar --- */
function GuestChip({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing bg-stone/60 rounded-xl px-3 py-2 text-xs hover:bg-stone transition-colors ${isDragging ? "opacity-40" : ""}`}>
      {name}
    </div>
  );
}

/* --- Canvas --- */
function FloorCanvas({ floorColor, tables, fixtures, seats, guests, onUpdateTable, onUpdateFixture, onDeleteTable, onDeleteFixture, onUnseat, onFirstTable }: any) {
  const [selected, setSelected] = useState<{ kind: "table" | "fixture"; id: string } | null>(null);
  return (
    <div className="rounded-3xl border border-line overflow-hidden shadow-inner">
      <div
        className="relative"
        style={{
          width: "100%",
          height: `min(75vh, ${CANVAS_H}px)`,
          background: floorColor,
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onClick={() => setSelected(null)}
      >
        {tables.length === 0 && fixtures.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="font-serif text-2xl text-ink/70">Your floor is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Add a table to start seating.</p>
            <button
              onClick={(e) => { e.stopPropagation(); onFirstTable(); }}
              className="pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay cursor-pointer">
              <Plus className="h-4 w-4" /> Add table
            </button>
          </div>
        )}

        {fixtures.map((f: any) => (
          <FixtureNode key={f.id} fixture={f} selected={selected?.kind === "fixture" && selected.id === f.id}
            onSelect={() => setSelected({ kind: "fixture", id: f.id })}
            onUpdate={(patch: any) => onUpdateFixture(f.id, patch)}
            onDelete={() => onDeleteFixture(f.id)} />
        ))}
        {tables.map((t: any) => {
          const at = seats.filter((s: any) => s.table_id === t.id);
          const seated = at.map((a: any) => ({ a, g: guests.find((x: any) => x.id === a.guest_id) })).filter((x: any) => x.g);
          return (
            <TableNode key={t.id} table={t} seated={seated}
              selected={selected?.kind === "table" && selected.id === t.id}
              onSelect={() => setSelected({ kind: "table", id: t.id })}
              onUpdate={(patch: any) => onUpdateTable(t.id, patch)}
              onDelete={() => onDeleteTable(t.id)}
              onUnseat={onUnseat} />
          );
        })}
      </div>
    </div>
  );
}

/* --- Draggable pointer element (used for table + fixture) --- */
function useMovable(pos: { x: number; y: number }, onEnd: (p: { x: number; y: number }) => void) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    setDrag(pos);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const nx = startRef.current.ox + (e.clientX - startRef.current.px);
    const ny = startRef.current.oy + (e.clientY - startRef.current.py);
    setDrag({ x: Math.max(0, nx), y: Math.max(0, ny) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (drag) onEnd(drag);
    startRef.current = null;
    setDrag(null);
  };
  return { handlers: { onPointerDown, onPointerMove, onPointerUp }, current: drag ?? pos };
}

/* --- Table --- */
function TableNode({ table, seated, selected, onSelect, onUpdate, onDelete, onUnseat }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}` });
  const { handlers, current } = useMovable({ x: table.pos_x, y: table.pos_y }, (p) => onUpdate({ pos_x: p.x, pos_y: p.y }));
  const isRound = table.shape === "round";
  const over = seated.length > table.seats;
  const seatCount = Math.max(seated.length, 1);
  // Scale chair size to table capacity: small tables → bigger chairs, large tables → smaller.
  const capacity = Math.max(table.seats ?? seatCount, seatCount);
  const CHAIR = capacity <= 4 ? 38 : capacity <= 6 ? 32 : capacity <= 8 ? 26 : capacity <= 10 ? 22 : 20;
  const GAP = capacity <= 4 ? 10 : 8;
  const chairs = chairPositions(table.shape ?? "round", table.width, table.height, seatCount, CHAIR, GAP);
  return (
    <div
      style={{ position: "absolute", left: current.x, top: current.y, width: table.width, height: table.height }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`select-none cursor-move ${selected ? "z-20" : "z-10"}`}
    >
      {/* Chairs around the outside */}
      {seated.map((s: any, i: number) => {
        const pos = chairs[i];
        if (!pos) return null;
        const initials = getInitials(s.g.full_name ?? "");
        const hasDiet = (s.g.dietary_tags?.length ?? 0) > 0 || (s.g.food_allergies?.length ?? 0) > 0 || !!s.g.dietary_notes;
        return (
          <ChairChip key={s.a.id} x={pos.x} y={pos.y} size={CHAIR} name={s.g.full_name} initials={initials}
            hasDiet={hasDiet}
            dietary={[...(s.g.dietary_tags ?? []), ...(s.g.food_allergies ?? []).map((a: string) => `⚠ ${a}`)]}
            notes={s.g.dietary_notes}
            onUnseat={() => { if (confirm(`Unseat ${s.g.full_name}?`)) onUnseat(s.a.id); }}
          />
        );
      })}

      <div
        ref={setNodeRef}
        className={`w-full h-full flex flex-col items-center justify-center text-center transition-shadow ${
          isOver ? "ring-4 ring-clay" : selected ? "ring-2 ring-ink" : ""
        } ${over ? "ring-2 ring-destructive" : ""}`}
        style={{
          background: table.mat_color ?? "#F5EEDC",
          borderRadius: isRound ? "50%" : 16,
          boxShadow: "0 4px 14px rgba(26,21,18,0.12)",
        }}
      >
        <p className="font-serif text-[13px] leading-tight text-ink px-2 truncate max-w-full">{table.label}</p>
        <p className="text-[10px] text-ink/70">{seated.length}/{table.seats}</p>
      </div>

      {selected && (
        <div data-nodrag onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-paper border border-line rounded-2xl shadow-lg p-3 flex items-center gap-2 whitespace-nowrap z-30">
          <input
            defaultValue={table.label}
            onBlur={(e) => e.target.value !== table.label && onUpdate({ label: e.target.value })}
            className="w-24 text-xs bg-transparent border-b border-line focus:outline-none focus:border-clay"
          />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Seats</span>
            <input type="number" min={1} max={30} defaultValue={table.seats}
              onBlur={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                if (n !== table.seats) onUpdate({ seats: n });
              }}
              className="w-10 bg-transparent border-b border-line text-center focus:outline-none focus:border-clay" />
          </div>
          <ShapePicker value={table.shape ?? "round"} onChange={(sh) => onUpdate({
            shape: sh,
            width: sh === "rect" ? 200 : sh === "square" ? 120 : 140,
            height: sh === "rect" ? 90  : sh === "square" ? 120 : 140,
          })} />
          <ColorPicker value={table.mat_color ?? "#F5EEDC"} presets={TABLECLOTHS} onChange={(c) => onUpdate({ mat_color: c })} />
          <button onClick={onDelete} className="p-1 rounded-full hover:bg-stone text-muted-foreground cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* --- Chair chip around the table --- */
function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function ChairChip({ x, y, size, name, initials, hasDiet, dietary, notes, onUnseat }: any) {
  const [tipOpen, setTipOpen] = useState(false);
  const fontSize = size >= 34 ? 12 : size >= 28 ? 11 : size >= 24 ? 10 : 9;
  return (
    <div
      data-nodrag
      onClick={(e) => e.stopPropagation()}
      style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }}
      className="z-20"
    >
      <div className="relative w-full h-full">
        <button
          onClick={onUnseat}
          title={name}
          style={{ fontSize }}
          className="w-full h-full rounded-full bg-paper border border-ink/30 shadow flex items-center justify-center font-semibold text-ink hover:bg-blush-soft hover:border-ink transition-colors cursor-pointer"
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

/* --- Fixture --- */
function FixtureNode({ fixture, selected, onSelect, onUpdate, onDelete }: any) {
  const { handlers, current } = useMovable({ x: fixture.pos_x, y: fixture.pos_y }, (p) => onUpdate({ pos_x: p.x, pos_y: p.y }));
  const [resize, setResize] = useState<{ w: number; h: number } | null>(null);
  const size = resize ?? { w: fixture.width, h: fixture.height };
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, w: fixture.width, h: fixture.height };
    const move = (ev: PointerEvent) => setResize({
      w: Math.max(60, start.w + (ev.clientX - start.x)),
      h: Math.max(30, start.h + (ev.clientY - start.y)),
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
        className={`w-full h-full flex items-center justify-center text-[11px] font-medium tracking-wide uppercase transition-shadow ${selected ? "ring-2 ring-ink" : ""}`}
        style={{
          background: fixture.color ?? "#EDE7DA",
          borderRadius: isRound ? "50%" : 8,
          color: isDark(fixture.color) ? "#FEFDFA" : "#1A1512",
          opacity: 0.92,
        }}
      >
        {fixture.label}
      </div>

      {selected && (
        <>
          <div
            data-nodrag
            onPointerDown={startResize}
            className="absolute -right-1.5 -bottom-1.5 h-4 w-4 bg-paper border border-ink rounded-sm cursor-nwse-resize z-30"
          />
          <div data-nodrag onClick={(e) => e.stopPropagation()}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-paper border border-line rounded-2xl shadow-lg p-2 flex items-center gap-2 z-30 whitespace-nowrap">
            <input
              defaultValue={fixture.label ?? ""}
              onBlur={(e) => e.target.value !== fixture.label && onUpdate({ label: e.target.value })}
              className="w-24 text-xs bg-transparent border-b border-line focus:outline-none focus:border-clay"
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
                className="flex-1 text-xs rounded-lg border border-line px-2 py-1 focus:outline-none focus:ring-2 focus:ring-clay font-mono" />
              <span className="h-5 w-5 rounded-full border border-line" style={{ background: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.startsWith("#") ? hex : `#${hex}`) ? (hex.startsWith("#") ? hex : `#${hex}`) : "transparent" }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* --- Geometry: chair positions on the perimeter --- */
function chairPositions(shape: string, w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const off = chair / 2 + gap;
  if (shape === "round" || shape === "square") {
    // round: circle around ellipse; square: also distribute on circle for even spacing
    const rx = w / 2 + off;
    const ry = h / 2 + off;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: w / 2 + rx * Math.cos(a), y: h / 2 + ry * Math.sin(a) });
    }
    return out;
  }
  // rect: distribute proportionally along the four sides
  const perim = 2 * (w + h);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n * perim;
    let x = 0, y = 0;
    if (t < w)                { x = t; y = -off; }
    else if (t < w + h)       { x = w + off; y = t - w; }
    else if (t < 2 * w + h)   { x = w - (t - w - h); y = h + off; }
    else                       { x = -off; y = h - (t - 2 * w - h); }
    out.push({ x, y });
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
