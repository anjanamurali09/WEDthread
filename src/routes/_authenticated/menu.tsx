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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";

export const Route = createFileRoute("/_authenticated/menu")({
  component: MenuPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

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
  const menuEnabled = event ? (event.enabled_categories?.length ? event.enabled_categories.includes("menu") : true) : false;
  const { data: sections = [], isLoading: sectionsLoading } = useMenuSections(eventId);
  const sectionIds = sections.map((s) => s.id);
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(sectionIds);
  // Same gap as Seating: while events have resolved but the effect hasn't picked an
  // eventId yet (or the event-scoped queries are still in flight), avoid flashing an
  // empty menu.
  const loading = weddingLoading || eventsLoading || (events.length > 0 && !eventId) || sectionsLoading || itemsLoading;
  const [newSectionName, setNewSectionName] = useState("");
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);

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
    const { error } = await supabase.from("menu_sections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const confirmDeleteSection = async () => {
    if (!confirmDeleteSectionId) return;
    await deleteSection(confirmDeleteSectionId);
    setConfirmDeleteSectionId(null);
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
        <Dropdown className="w-56" value={eventId} onChange={setEventId} placeholder="Choose an event"
          options={events.map((e) => ({ value: e.id, label: e.name }))} />
      }
    >
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> :
      event && !menuEnabled ? (
        <div className="paper-card p-8 max-w-2xl text-center mx-auto">
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-stone text-muted-foreground"><Utensils className="h-5 w-5" /></span>
          <h2 className="mt-4 font-serif text-2xl">Menu isn't enabled for this event</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Turn on "Menu" under "What does this event need?" while editing {event.name} in Events to build out its menu.
          </p>
        </div>
      ) : (
        sections.length === 0 ? (
          // Centered as one unit (card + input + button) within the FULL available
          // content area — deliberately not nested inside the max-w-6xl wrapper the
          // populated view below uses, since that box isn't itself centered and would
          // leave this off-center on wide viewports. Width capped at max-w-2xl, matching
          // this same warm-wash card style used elsewhere (Registry/Notes empty states).
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-5 px-4">
            <section className="warm-wash rounded-[40px] border border-line/60 px-6 md:px-12 py-10 text-center w-full max-w-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cherry">Your menu</p>
              <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">Start with a section</h3>
              <p className="mt-3 text-sm text-ink leading-relaxed">Starters, mains, live counters, dessert, name it however you like, then add the dishes inside.</p>
            </section>
            <AddSectionRow
              className="w-full max-w-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              buttonClassName="w-full sm:w-auto"
              value={newSectionName} onChange={setNewSectionName} onSubmit={addSection}
            />
          </div>
        ) : (
          <div className="max-w-6xl space-y-5">
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-5">
              {sections.map((s) => (
                <div key={s.id} className="break-inside-avoid mb-5">
                  <MenuSectionCard section={s} items={items.filter((i) => i.section_id === s.id)}
                    onRename={(name) => renameSection(s.id, name)} onDelete={() => setConfirmDeleteSectionId(s.id)}
                    onAddItem={(item) => addItem(s.id, item)} onDeleteItem={deleteItem} />
                </div>
              ))}
            </div>
            <AddSectionRow className="max-w-3xl flex items-center gap-2"
              value={newSectionName} onChange={setNewSectionName} onSubmit={addSection}
            />
          </div>
        )
      )}
      {confirmDeleteSectionId && (() => {
        const s = sections.find((sec) => sec.id === confirmDeleteSectionId);
        const itemCount = items.filter((i) => i.section_id === confirmDeleteSectionId).length;
        return (
          <ConfirmDialog
            title="Delete section"
            description={itemCount > 0
              ? `Delete "${s?.name ?? "this section"}"? ${itemCount} item${itemCount === 1 ? "" : "s"} inside it will also be removed. This can't be undone.`
              : `Delete "${s?.name ?? "this section"}"? This can't be undone.`}
            confirmLabel="Delete section"
            onConfirm={confirmDeleteSection}
            onCancel={() => setConfirmDeleteSectionId(null)}
          />
        );
      })()}
    </AppShell>
  );
}

// Shared between the empty state (centered, stacks on narrow screens) and the normal
// below-the-grid position (left-aligned, always a row) so the input/button markup and
// its onChange/onKeyDown/onClick logic isn't duplicated between the two layouts.
function AddSectionRow({ className, buttonClassName, value, onChange, onSubmit }: {
  className: string; buttonClassName?: string; value: string; onChange: (v: string) => void; onSubmit: () => void;
}) {
  return (
    <div className={className}>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="E.g. Cocktail hour, Mains, Dessert bar"
        className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      <button onClick={onSubmit} disabled={!value.trim()}
        className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer shrink-0", buttonClassName)}>
        <Plus className="h-4 w-4" /> Add section
      </button>
    </div>
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
                {it.description && <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{it.description}</p>}
                {it.dietary_tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {it.dietary_tags.map((t) => (
                      <span key={t} className="text-[10px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink">{t}</span>
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
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-clay hover:underline cursor-pointer">
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
                "rounded-full border px-2.5 py-1 text-sm transition-colors cursor-pointer",
                on ? "bg-sage-deep text-pearl border-sage-deep" : "bg-pearl text-ink border-line hover:bg-stone",
              )}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-1.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
          <Check className="h-3.5 w-3.5" /> Add
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm hover:bg-stone cursor-pointer">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
