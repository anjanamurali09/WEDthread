import { createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useMenuSections, useMenuItems, useFoodTags, type MenuItem, type FoodTag } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Plus, Trash2, X, Utensils, Pencil, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { dishCodes, foodLookup, legendFor, type FoodKind } from "@/lib/dietary-tags";
import { useFoodTagActions } from "@/lib/food-tags";
import { TagPicker, TagChip } from "@/components/tag-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";
import { exportMenuExcel, exportMenuPdf } from "@/lib/menu-export";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { getTemplate } from "@/lib/website-templates";
import { useGoogleFonts } from "@/lib/google-fonts";

export const Route = createFileRoute("/_authenticated/menu")({
  component: MenuPage,
  validateSearch: (s: Record<string, unknown>) => ({ event: typeof s.event === "string" ? s.event : undefined }),
});

// The dietary/allergen library plus its create/edit/delete handlers, shared by the dish
// form, the preview and the exports without threading props through every card.
type FoodTagsCtx = {
  tags: FoodTag[];
  create: (kind: FoodKind, input: { name: string; color: string; emoji: string | null }) => Promise<void>;
  update: (id: string, oldName: string, input: { name: string; color: string; emoji: string | null }) => Promise<void>;
  remove: (id: string, name: string) => Promise<void>;
};
const FoodTagsContext = createContext<FoodTagsCtx>({ tags: [], create: async () => {}, update: async () => {}, remove: async () => {} });

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
  const { data: foodTags = [] } = useFoodTags(wedding?.id);
  const foodActions = useFoodTagActions(wedding?.id, foodTags);
  const foodCtx = useMemo<FoodTagsCtx>(() => ({ tags: foodTags, ...foodActions }), [foodTags, wedding?.id]); // eslint-disable-line
  // The menu can wear the wedding website's colours and heading font (remembered per wedding in this browser).
  const [useSiteTheme, setUseSiteTheme] = usePersistedState<boolean>(`wedthread.menu-theme.${wedding?.id ?? "none"}`, false);
  const siteTemplate = getTemplate(wedding?.site_template_id);
  const menuTheme = useSiteTheme ? { bg: siteTemplate.palette.bg, ink: siteTemplate.palette.ink, accent: siteTemplate.palette.accent, font: siteTemplate.fonts.display } : null;
  useGoogleFonts(menuTheme ? [menuTheme.font] : []);
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

  const updateItem = async (id: string, item: { name: string; description: string; dietary_tags: string[] }) => {
    const { error } = await supabase.from("menu_items").update({
      name: item.name.trim(), description: item.description.trim() || null, dietary_tags: item.dietary_tags,
    }).eq("id", id);
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
    <FoodTagsContext.Provider value={foodCtx}>
    <AppShell
      title="Menu"
      subtitle="Build out the food and drink for each event, organized however makes sense to you."
      actions={
        <div className="flex items-center gap-2">
          <Dropdown className="w-56" value={eventId} onChange={setEventId} placeholder="Choose an event"
            options={events.map((e) => ({ value: e.id, label: e.name }))} />
          {event && sections.length > 0 && (
            <>
              <button type="button" role="switch" aria-checked={useSiteTheme} onClick={() => setUseSiteTheme((v) => !v)}
                title="Use your wedding website's colours and heading font for the menu preview and downloads"
                className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors",
                  useSiteTheme ? "border-ink bg-ink text-paper" : "border-line/70 bg-paper hover:bg-stone")}>
                <span className="inline-flex -space-x-1">
                  <span className="h-3 w-3 rounded-full border border-white" style={{ background: siteTemplate.palette.bg }} />
                  <span className="h-3 w-3 rounded-full border border-white" style={{ background: siteTemplate.palette.ink }} />
                </span>
                Website theme
              </button>
              <ExportMenu
                onExportExcel={() => exportMenuExcel({ theme: menuTheme, weddingLabel: wedding!.slug || wedding!.id, eventName: event.name, sections, items, foodTags })}
                onExportPdf={() => exportMenuPdf({ theme: menuTheme, weddingLabel: wedding!.slug || wedding!.id, eventName: event.name, sections, items, foodTags })}
              />
            </>
          )}
        </div>
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
          <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">
            {/* The actual menu leads (left), editing is the wider companion
                pane on the right — same split-pane pattern as Events/Agenda,
                minus the photo panel. Both are plain grid items (no sticky,
                no capped height) — the page scrolls as one, which keeps
                their top edges reliably aligned instead of depending on
                position:sticky's interaction with grid row sizing, and
                means there's never a second, nested scrollbar to fight
                with. */}
            <MenuPreviewPanel eventName={event?.name} sections={sections} items={items} theme={menuTheme} />

            <div className="mt-8 lg:mt-0">
              <div className="grid gap-4">
                {sections.map((s) => (
                  <MenuSectionCard key={s.id} section={s} items={items.filter((i) => i.section_id === s.id)}
                    onRename={(name) => renameSection(s.id, name)} onDelete={() => setConfirmDeleteSectionId(s.id)}
                    onAddItem={(item) => addItem(s.id, item)} onUpdateItem={updateItem} onDeleteItem={deleteItem} />
                ))}
              </div>
              <AddSectionRow className="mt-4 flex items-center gap-2"
                value={newSectionName} onChange={setNewSectionName} onSubmit={addSection}
              />
            </div>
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
    </FoodTagsContext.Provider>
  );
}

function ExportMenu({ onExportExcel, onExportPdf }: { onExportExcel: () => void; onExportPdf: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer focus:outline-none">
        <Download className="h-4 w-4" /> Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 min-w-[180px] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onExportExcel(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer focus:outline-none">
              Export as Excel
            </button>
            <button type="button" onClick={() => { onExportPdf(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer focus:outline-none">
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
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
        placeholder="E.g. Starters, Mains, Dessert bar"
        className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      <button onClick={onSubmit} disabled={!value.trim()}
        className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer shrink-0", buttonClassName)}>
        <Plus className="h-4 w-4" /> Add section
      </button>
    </div>
  );
}

// Read-only, guest-facing-style rendering of the whole menu — same idea as
// the Events page's Agenda preview, grouped by section instead of by date,
// so the couple can see how the printed/shared menu actually reads instead
// of just the editing form.
function MenuPreviewPanel({ eventName, sections, items, theme }: {
  eventName?: string; sections: { id: string; name: string }[]; items: MenuItem[];
  theme?: { bg: string; ink: string; accent: string; font: string } | null;
}) {
  const { tags: foodTags } = useContext(FoodTagsContext);
  const lookup = foodLookup(foodTags);
  const legend = legendFor(items.flatMap((it) => it.dietary_tags), foodTags);

  return (
    <div className={cn("rounded-3xl p-8", !theme && "bg-ink text-paper")}
      style={theme ? { background: theme.bg, color: theme.ink, fontFamily: `"${theme.font}", serif`, border: `1px solid ${theme.ink}22` } : undefined}>
      <h2 className="font-serif text-3xl" style={theme ? { fontFamily: `"${theme.font}", serif` } : undefined}>{eventName ? `${eventName} Menu` : "Menu"}</h2>

      <div className="mt-6 grid gap-6">
        {sections.length === 0 ? (
          <p className="text-sm opacity-70">Add a section to see it here.</p>
        ) : (
          sections.map((s) => {
            const sectionItems = items.filter((i) => i.section_id === s.id);
            return (
              <div key={s.id}>
                <p className="text-xs uppercase tracking-widest opacity-60 border-b border-current/20 pb-2 mb-4">{s.name}</p>
                {sectionItems.length === 0 ? (
                  <p className="text-sm opacity-60 italic">Nothing added yet.</p>
                ) : (
                  <div className="grid gap-4">
                    {sectionItems.map((it) => {
                      const { diet, allergens } = dishCodes(it.dietary_tags, lookup);
                      return (
                        <div key={it.id}>
                          <p className="font-serif text-lg" style={theme ? { fontFamily: `"${theme.font}", serif` } : undefined}>
                            {it.name}
                            {diet.length > 0 && <span className="ml-1.5 font-sans text-sm opacity-60 align-middle">({diet.join(", ")})</span>}
                            {allergens.length > 0 && <span className="ml-1.5 font-sans text-sm text-red-300 align-middle">({allergens.join(", ")})</span>}
                          </p>
                          {it.description && <p className="text-sm opacity-70 mt-0.5 leading-relaxed">{it.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {legend.length > 0 && (
        <p className="mt-4 pt-4 border-t border-current/20 text-xs opacity-60">
          {legend}
        </p>
      )}
    </div>
  );
}

function MenuSectionCard({ section, items, onRename, onDelete, onAddItem, onUpdateItem, onDeleteItem }: {
  section: { id: string; name: string };
  items: MenuItem[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddItem: (item: { name: string; description: string; dietary_tags: string[] }) => void;
  onUpdateItem: (id: string, item: { name: string; description: string; dietary_tags: string[] }) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);
  const [adding, setAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const { tags: foodTags } = useContext(FoodTagsContext);

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
        <div className="mt-4 border-t border-line/60">
          {items.map((it) => (
            editingItemId === it.id ? (
              <div key={it.id} className="py-3">
                <ItemForm
                  initial={{ name: it.name, description: it.description ?? "", dietary_tags: it.dietary_tags }}
                  submitLabel="Save" submitIcon={Check}
                  onSubmit={(item) => { onUpdateItem(it.id, item); setEditingItemId(null); }}
                  onCancel={() => setEditingItemId(null)}
                />
              </div>
            ) : (
              <div key={it.id} className="py-3 flex items-start justify-between gap-3 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{it.name}</p>
                    {it.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1 shrink-0">
                        {it.dietary_tags.map((t) => {
                          const ft = foodTags.find((x) => x.name === t);
                          return <TagChip key={t} tag={ft ?? { name: t, color: "#6E9B72" }} className="text-[10px] px-2 py-0.5 shadow-none" />;
                        })}
                      </div>
                    )}
                  </div>
                  {it.description && <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{it.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingItemId(it.id)}
                    className="text-muted-foreground hover:text-ink p-1 cursor-pointer" title="Edit item">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDeleteItem(it.id)}
                    className="text-muted-foreground hover:text-cherry p-1 cursor-pointer" title="Delete item">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {adding ? (
        <ItemForm onCancel={() => setAdding(false)} submitLabel="Add" submitIcon={Plus}
          onSubmit={(item) => { onAddItem(item); setAdding(false); }} />
      ) : (
        <button onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-clay hover:underline cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      )}
    </div>
  );
}

// Shared by both "add a new dish" and "edit an existing dish" — same fields,
// same dietary/allergen chip toggles, just pre-filled (or not) and a
// different submit label.
function ItemForm({ initial, submitLabel, submitIcon: SubmitIcon, onSubmit, onCancel }: {
  initial?: { name: string; description: string; dietary_tags: string[] };
  submitLabel: string;
  submitIcon: any;
  onSubmit: (item: { name: string; description: string; dietary_tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.dietary_tags ?? []);
  const food = useContext(FoodTagsContext);

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name, description, dietary_tags: tags });
  };

  return (
    <div className="mt-4 pt-4 border-t border-line/60 space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name"
          className="rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          className="rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {([["diet", "Add dietary tag"], ["allergy", "Add allergen"]] as const).map(([kind, label]) => {
          const library = food.tags.filter((t) => t.kind === kind);
          return (
          <TagPicker key={kind} triggerLabel={label}
            library={library}
            // Only the tags of this kind are counted, so picking an allergen does not also show on the dietary button.
            selected={tags.filter((n) => library.some((t) => t.name === n))}
            onToggle={toggleTag}
            onCreate={(input) => food.create(kind, input)}
            onUpdate={food.update}
            onDelete={food.remove}
            autoSelectOnCreate={false} />
          );
        })}
        {tags.map((t) => {
          const ft = food.tags.find((x) => x.name === t);
          return <TagChip key={t} tag={ft ?? { name: t, color: "#6E9B72" }} onRemove={() => toggleTag(t)} />;
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-1.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
          <SubmitIcon className="h-3.5 w-3.5" /> {submitLabel}
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm hover:bg-stone cursor-pointer">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
