import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useMenuSections, useMenuItems, type MenuItem } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X, Utensils, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIETARY, ALLERGIES } from "@/lib/dietary-tags";
import { PhotoEmptyState } from "@/components/photo-empty-state";

export const Route = createFileRoute("/_authenticated/menu")({
  component: MenuPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

const CHEVRON_BG = { backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A1512' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundPosition: "right 14px center" };

function MenuPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const search = Route.useSearch();
  const [eventId, setEventId] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (search.event && events.some((e) => e.id === search.event)) setEventId(search.event);
    else if (!eventId && events.length) setEventId(events[0].id);
  }, [events, search.event]); // eslint-disable-line

  const event = events.find((e) => e.id === eventId);
  const { data: sections = [], isLoading: sectionsLoading } = useMenuSections(eventId);
  const sectionIds = sections.map((s) => s.id);
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(sectionIds);
  // Same gap as Seating: while events have resolved but the effect hasn't picked an
  // eventId yet (or the event-scoped queries are still in flight), avoid flashing an
  // empty menu.
  const loading = weddingLoading || eventsLoading || (events.length > 0 && !eventId) || sectionsLoading || itemsLoading;
  const [newSectionName, setNewSectionName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["menu-sections", eventId] });
    qc.invalidateQueries({ queryKey: ["menu-items"] });
  };

  const addSection = async () => {
    const name = newSectionName.trim();
    if (!name || !eventId) return;
    const { error } = await supabase.from("menu_sections").insert({ event_id: eventId, name, sort_order: sections.length });
    if (error) return toast.error(error.message);
    setNewSectionName("");
    invalidate();
  };

  const renameSection = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("menu_sections").update({ name: trimmed }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section? Items inside it will also be removed.")) return;
    const { error } = await supabase.from("menu_sections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const addItem = async (sectionId: string, item: { name: string; description: string; dietary_tags: string[] }) => {
    const count = items.filter((i) => i.section_id === sectionId).length;
    const { error } = await supabase.from("menu_items").insert({
      section_id: sectionId, name: item.name.trim(), description: item.description.trim() || null,
      dietary_tags: item.dietary_tags, sort_order: count,
    });
    if (error) return toast.error(error.message);
    invalidate();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  if (!eventsLoading && !events.length) {
    return (
      <AppShell title="Menu" subtitle="Add events first.">
        <p className="text-muted-foreground text-sm">Head to Events to add a ceremony.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Menu"
      subtitle="Build out the food and drink for each event, organized however makes sense to you."
      actions={
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}
          className="rounded-full border border-line pl-4 pr-10 py-2 text-sm bg-paper cursor-pointer appearance-none bg-no-repeat" style={CHEVRON_BG}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      }
    >
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> :
      event && !event.food_included ? (
        <div className="paper-card p-8 max-w-2xl text-center mx-auto">
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-stone text-muted-foreground"><Utensils className="h-5 w-5" /></span>
          <h2 className="mt-4 font-serif text-2xl">Food isn't included at this event</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Turn on "Food included at this event" while editing {event.name} in Events to build out its menu.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl space-y-5">
          {sections.length === 0 && (
            <div className="max-w-3xl">
              <PhotoEmptyState
                photo="cane"
                variant="landscape"
                eyebrow="Your menu"
                title="Start with a section"
                body="Starters, mains, live counters, dessert, name it however you like, then add the dishes inside."
              />
            </div>
          )}
          {sections.length > 0 && (
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-5">
              {sections.map((s) => (
                <div key={s.id} className="break-inside-avoid mb-5">
                  <MenuSectionCard section={s} items={items.filter((i) => i.section_id === s.id)}
                    onRename={(name) => renameSection(s.id, name)} onDelete={() => deleteSection(s.id)}
                    onAddItem={(item) => addItem(s.id, item)} onDeleteItem={deleteItem} />
                </div>
              ))}
            </div>
          )}

          <div className="max-w-3xl flex items-center gap-2">
            <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              placeholder="e.g. Starters, Mains, Live counters, Dessert"
              className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            <button onClick={addSection} disabled={!newSectionName.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer shrink-0">
              <Plus className="h-4 w-4" /> Add section
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MenuSectionCard({ section, items, onRename, onDelete, onAddItem, onDeleteItem }: {
  section: { id: string; name: string };
  items: MenuItem[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddItem: (item: { name: string; description: string; dietary_tags: string[] }) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);
  const [adding, setAdding] = useState(false);

  const commitName = () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft.trim() !== section.name) onRename(nameDraft.trim());
    else setNameDraft(section.name);
  };

  return (
    <div className="paper-card p-6">
      <div className="flex items-center justify-between gap-3">
        {editingName ? (
          <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName} onKeyDown={(e) => e.key === "Enter" && commitName()}
            className="font-serif text-2xl bg-transparent border-b border-line focus:outline-none focus:border-clay flex-1" />
        ) : (
          <h3 className="font-serif text-2xl truncate">{section.name}</h3>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {!editingName && (
            <button onClick={() => { setNameDraft(section.name); setEditingName(true); }}
              className="text-muted-foreground hover:text-ink p-1.5 cursor-pointer" title="Rename section">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onDelete} className="text-muted-foreground hover:text-cherry p-1.5 cursor-pointer" title="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 divide-y divide-line/60 border-t border-line/60">
          {items.map((it) => (
            <div key={it.id} className="py-3 flex items-start justify-between gap-3 group">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{it.name}</p>
                {it.description && <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{it.description}</p>}
                {it.dietary_tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {it.dietary_tags.map((t) => (
                      <span key={t} className="text-[10px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink/70">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onDeleteItem(it.id)}
                className="text-muted-foreground hover:text-cherry p-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <AddItemForm onCancel={() => setAdding(false)} onAdd={(item) => { onAddItem(item); setAdding(false); }} />
      ) : (
        <button onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-clay hover:underline cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      )}
    </div>
  );
}

function AddItemForm({ onAdd, onCancel }: {
  onAdd: (item: { name: string; description: string; dietary_tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name, description, dietary_tags: tags });
  };

  return (
    <div className="mt-4 pt-4 border-t border-line/60 space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name"
          className="rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          className="rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...DIETARY, ...ALLERGIES].map((t) => {
          const on = tags.includes(t);
          return (
            <button key={t} type="button" onClick={() => toggleTag(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors cursor-pointer",
                on ? "bg-sage-deep text-pearl border-sage-deep" : "bg-pearl text-ink/70 border-line hover:bg-stone",
              )}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-1.5 text-xs hover:bg-clay disabled:opacity-60 cursor-pointer">
          <Check className="h-3.5 w-3.5" /> Add
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-xs hover:bg-stone cursor-pointer">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
