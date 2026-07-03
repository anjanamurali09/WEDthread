import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seating")({ component: SeatingPage });

function SeatingPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const [eventId, setEventId] = useState<string>("");
  const qc = useQueryClient();
  const invalidate = useInvalidateWedding();

  useEffect(() => { if (!eventId && events.length) setEventId(events[0].id); }, [events, eventId]);

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", wedding?.id, eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await supabase.from("wedding_tables").select("*").eq("event_id", eventId).order("sort_order");
      return data ?? [];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", eventId, tables.map((t: any) => t.id).join(",")],
    enabled: tables.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("seat_assignments").select("*").in("table_id", tables.map((t: any) => t.id));
      return data ?? [];
    },
  });

  const attendingGuestIds = useMemo(() =>
    new Set(invites.filter((i) => i.event_id === eventId && i.rsvp_status !== "declined").map((i) => i.guest_id)),
  [invites, eventId]);

  const seatedGuestIds = useMemo(() => new Set(seats.map((s: any) => s.guest_id)), [seats]);
  const unseated = guests.filter((g) => attendingGuestIds.has(g.id) && !seatedGuestIds.has(g.id));

  const addTable = async () => {
    if (!eventId) return;
    await supabase.from("wedding_tables").insert({
      event_id: eventId,
      label: `Table ${tables.length + 1}`,
      seats: 8,
      sort_order: tables.length,
    });
    qc.invalidateQueries({ queryKey: ["tables", wedding?.id, eventId] });
  };

  const updateTable = async (id: string, patch: { label?: string; seats?: number }) => {
    await supabase.from("wedding_tables").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tables", wedding?.id, eventId] });
  };

  const removeTable = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    await supabase.from("wedding_tables").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tables", wedding?.id, eventId] });
  };

  const unseat = async (assignmentId: string) => {
    await supabase.from("seat_assignments").delete().eq("id", assignmentId);
    qc.invalidateQueries({ queryKey: ["seats", eventId, tables.map((t: any) => t.id).join(",")] });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const gid = e.active.id as string;
    const tid = e.over?.id as string | undefined;
    if (!tid) return;
    // Check capacity
    const tbl = tables.find((t: any) => t.id === tid);
    const currentSeated = seats.filter((s: any) => s.table_id === tid).length;
    if (tbl && currentSeated >= tbl.seats) return toast.error(`${tbl.label} is at capacity`);
    // Move: remove from any current table then insert
    await supabase.from("seat_assignments").delete().eq("guest_id", gid);
    const { error } = await supabase.from("seat_assignments").insert({ table_id: tid, guest_id: gid });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seats", eventId, tables.map((t: any) => t.id).join(",")] });
  };

  if (!events.length) {
    return <AppShell title="Seating" subtitle="Add events first."><p className="text-muted-foreground text-sm">Head to Events to add a ceremony.</p></AppShell>;
  }

  return (
    <AppShell
      title="Seating"
      subtitle="Drag attending guests onto tables. Vowzy warns you on capacity and dietary clusters."
      actions={
        <div className="flex gap-2">
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-full border border-line px-4 py-2 text-sm bg-paper">
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={addTable} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay"><Plus className="h-4 w-4" /> Add table</button>
        </div>
      }
    >
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Unseated pool */}
          <div className="paper-card p-5 h-fit lg:sticky lg:top-6">
            <p className="text-[10px] uppercase tracking-widest text-clay">Unseated</p>
            <p className="font-serif text-2xl mt-1">{unseated.length} guest{unseated.length === 1 ? "" : "s"}</p>
            <p className="text-xs text-muted-foreground">Attending this event but not at a table yet.</p>
            <div className="mt-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
              {unseated.length === 0 && <p className="text-xs text-muted-foreground">Everyone attending has a seat.</p>}
              {unseated.map((g) => <DraggableGuest key={g.id} id={g.id} name={g.full_name} tags={[...(g.dietary_tags ?? []), ...(g.food_allergies ?? []).map((a) => "⚠ " + a)]} />)}
            </div>
          </div>

          {/* Tables */}
          <div>
            {tables.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line p-16 text-center">
                <h3 className="font-serif text-2xl">No tables yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Add a table to start seating.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tables.map((t: any) => {
                  const at = seats.filter((s: any) => s.table_id === t.id);
                  const tGuests = at.map((a: any) => guests.find((g) => g.id === a.guest_id)).filter(Boolean) as any[];
                  const allergiesSet = new Set(tGuests.flatMap((g) => g.food_allergies ?? []));
                  const over = at.length > t.seats;
                  return (
                    <TableDrop key={t.id} id={t.id}>
                      <div className={`paper-card p-5 ${over ? "ring-2 ring-destructive" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <input
                              value={t.label}
                              onChange={(e) => updateTable(t.id, { label: e.target.value })}
                              className="font-serif text-xl bg-transparent border-b border-transparent hover:border-line focus:border-clay focus:outline-none w-full"
                            />
                            <div className={`text-xs mt-1 flex items-center gap-2 ${over ? "text-destructive" : "text-muted-foreground"}`}>
                              <span>{at.length} /</span>
                              <input
                                type="number" min={1} max={30} value={t.seats}
                                onChange={(e) => updateTable(t.id, { seats: Math.max(1, Number(e.target.value) || 1) })}
                                className="w-12 bg-transparent border-b border-transparent hover:border-line focus:border-clay focus:outline-none text-center"
                              />
                              <span>seats {over && "· over capacity"}</span>
                            </div>
                          </div>
                          <button onClick={() => removeTable(t.id)} className="p-1.5 rounded-full hover:bg-stone text-muted-foreground shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        {allergiesSet.size > 0 && (
                          <p className="mt-2 text-[11px] text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Allergies here: {[...allergiesSet].join(", ")}</p>
                        )}
                        <div className="mt-3 min-h-[80px] flex flex-wrap gap-1.5">
                          {tGuests.length === 0 && <p className="text-xs text-muted-foreground">Drag guests here</p>}
                          {at.map((a: any) => {
                            const g = guests.find((x) => x.id === a.guest_id);
                            if (!g) return null;
                            return (
                              <span key={a.id} className="inline-flex items-center gap-1 bg-stone text-xs rounded-full pl-3 pr-1 py-1">
                                {g.full_name}
                                <button onClick={() => unseat(a.id)} className="rounded-full hover:bg-line p-0.5"><X className="h-3 w-3" /></button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </TableDrop>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </AppShell>
  );
}

function DraggableGuest({ id, name, tags }: { id: string; name: string; tags: string[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing bg-stone/60 rounded-2xl px-3 py-2 text-xs ${isDragging ? "opacity-40" : ""}`}>
      <p className="font-medium">{name}</p>
      {tags.length > 0 && <p className="text-[10px] text-muted-foreground truncate">{tags.join(" · ")}</p>}
    </div>
  );
}

function TableDrop({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`rounded-3xl transition-colors ${isOver ? "ring-2 ring-clay" : ""}`}>{children}</div>;
}
