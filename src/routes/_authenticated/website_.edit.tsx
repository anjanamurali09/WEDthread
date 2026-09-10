import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell, SIDEBAR_COLLAPSED_KEY } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding, useEvents, useWeddingPhotos } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GripVertical, Eye, EyeOff, Trash2, Plus, Upload, ExternalLink, ArrowLeft, Palette, CalendarDays, MapPin,
  Monitor, Smartphone, Type, LayoutGrid, Sparkles, Minus, Images, ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { TEMPLATES, SECTION_LIBRARY, getTemplate, type SectionType } from "@/lib/website-templates";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RichTextField } from "@/components/rich-text-field";
import { GOOGLE_FONT_OPTIONS, useGoogleFonts, useAllGoogleFontsWhenOpen, type FontGroup } from "@/lib/google-fonts";
import { FocalPointPicker, focalPosition } from "@/components/focal-point-picker";

// Sections that render a single photo get a full/left/right layout choice — everything
// else (gallery's grid, or types that don't use image_url at all) skips it.
const IMAGE_LAYOUT_TYPES: SectionType[] = ["hero", "story", "travel", "registry", "rsvp"];

// Sections with no heading/dominant text of their own — the per-section Font override
// in SectionEditor is skipped for these.
const NO_HEADING_TYPES: SectionType[] = ["text", "shape", "image"];

// Discrete presets (not freeform drag-resize) so an inserted image can never blow out the
// layout — each is a fixed, viewport-aware clamp so XS stays legible and XL still fits on
// mobile instead of overflowing.
const IMAGE_SIZES: Record<string, string> = {
  xs: "clamp(80px, 20vw, 120px)",
  s: "clamp(120px, 30vw, 180px)",
  m: "clamp(180px, 45vw, 280px)",
  l: "clamp(240px, 60vw, 380px)",
  xl: "clamp(280px, 75vw, 460px)",
};
const IMAGE_SIZE_OPTIONS = [
  { value: "xs", label: "XS" }, { value: "s", label: "S" }, { value: "m", label: "M" },
  { value: "l", label: "L" }, { value: "xl", label: "XL" },
];
const IMAGE_SHAPE_OPTIONS = [
  { value: "circle", label: "Circle" }, { value: "square", label: "Square" }, { value: "oval", label: "Oval" },
  { value: "rectangle", label: "Rectangle" }, { value: "heart", label: "Heart" },
];
// Heart normalized to a 0-100 box, drawn via an inline SVG <clipPath> rather than a CSS
// clip-path: path() — CSS path() clips in the box's literal pixel coordinates and won't
// rescale to the element's actual size, while an SVG clipPath scales with its viewBox.
const HEART_PATH_D = "M50,88 C20,65 0,45 0,25 C0,10 12,0 25,0 C35,0 45,7 50,18 C55,7 65,0 75,0 C88,0 100,10 100,25 C100,45 80,65 50,88 Z";

const FONT_SCALES = [
  { value: 0.9, label: "Small" },
  { value: 1, label: "Medium" },
  { value: 1.15, label: "Large" },
];

// "scroll" is today's exact behavior (default, zero risk for existing weddings). "nav" and
// "split" are same-page approximations of withjoy's Classic Navigation / Split View — a
// sticky anchor-nav bar and a sticky photo panel, not a true separate-pages rebuild.
export type PageLayout = "scroll" | "split" | "nav";
const PAGE_LAYOUT_OPTIONS: { value: PageLayout; label: string; desc: string }[] = [
  { value: "scroll", label: "Single Page Scroll", desc: "Everything stacked in one continuous scroll — today's default." },
  { value: "split", label: "Split View", desc: "Your Hero photo stays fixed on one side while the rest scrolls beside it." },
  { value: "nav", label: "Classic Navigation", desc: "A sticky bar links to each section, jumping there on click." },
];

// Tuned clamp() strings per level (not a flat multiplier on the base clamp) — a
// multiplier compounds unpredictably at the extremes (xlarge at 1.6x pushed the Hero
// names past 120px on desktop while barely changing on mobile). Each level here has its
// own hand-picked min/max so "smallest" and "largest" both stay legible and don't
// overflow on any viewport. Hero (h1) and section headings (h2) get separate scales
// since they start from very different base sizes.
const HERO_HEADING_SIZES: Record<string, string> = {
  small: "clamp(1.75rem, 4vw, 3rem)",
  medium: "clamp(2.5rem, 6vw, 5rem)",
  large: "clamp(3rem, 7vw, 6rem)",
  xlarge: "clamp(3.25rem, 7.5vw, 6.5rem)",
};
const SECTION_HEADING_SIZES: Record<string, string> = {
  small: "clamp(1.375rem, 3vw, 1.625rem)",
  medium: "clamp(1.875rem, 4vw, 2.25rem)",
  large: "clamp(2.25rem, 5vw, 2.75rem)",
  xlarge: "clamp(2.5rem, 5.5vw, 3.25rem)",
};
const SECTION_FONT_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

const FONT_GROUPS_ORDERED = Array.from(new Set(GOOGLE_FONT_OPTIONS.map((f) => f.group))) as FontGroup[];

// Every option renders live in its own typeface (not a generic list of names) — matches
// the app's established dropdown-list styling (rounded-xl, hover:bg-blush-soft, the same
// classes CategoryDropdown/FilterSelect already use elsewhere) rather than a native
// <select>, since native <option> elements ignore per-option font-family styling on most
// platforms. The full curated list only loads (one batched request) once this is opened.
function FontPicker({ value, onChange, allowClear = true }: { value: string; onChange: (v: string) => void; allowClear?: boolean }) {
  const [open, setOpen] = useState(false);
  useAllGoogleFontsWhenOpen(open);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button"
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-line bg-pearl px-3 py-2 text-sm hover:border-wine cursor-pointer">
          <span style={value ? { fontFamily: `"${value}"` } : undefined} className="truncate">{value || "Use site font"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-h-72 overflow-y-auto rounded-2xl border-line bg-paper p-1.5">
        {allowClear && (
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", !value && "font-medium")}>
            Use site font
          </button>
        )}
        {FONT_GROUPS_ORDERED.map((group) => (
          <div key={group}>
            <p className="px-3 pt-2 pb-1 text-[8px] uppercase tracking-widest text-muted-foreground">{group}</p>
            {GOOGLE_FONT_OPTIONS.filter((f) => f.group === group).map((f) => (
              <button key={f.name} type="button" onClick={() => { onChange(f.name); setOpen(false); }}
                style={{ fontFamily: `"${f.name}"` }}
                className={cn("w-full text-left px-3 py-2 text-base rounded-xl hover:bg-blush-soft cursor-pointer truncate", value === f.name && "font-medium bg-blush-soft/60")}>
                {f.name}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export const Route = createFileRoute("/_authenticated/website_/edit")({ component: EditorPage });

type Section = {
  id: string;
  wedding_id: string;
  section_type: SectionType;
  sort_order: number;
  visible: boolean;
  content: Record<string, any>;
  image_url: string | null;
};

function EditorPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const invalidateWedding = useInvalidateWedding();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const template = getTemplate(wedding?.site_template_id);
  const custom = (wedding?.site_customization as any) ?? {};
  const palette = { ...template.palette, ...(custom.palette ?? {}) };
  const fonts = { ...template.fonts, ...(custom.fonts ?? {}) };
  const fontScale = custom.fontScale ?? 1;
  const pageLayout: PageLayout = custom.pageLayout ?? "scroll";

  // The editor's own workspace (sections, editor, live preview) needs all the horizontal
  // room it can get, so collapse the main app sidebar via its existing toggle/localStorage
  // key the moment this page mounts — written during render (before AppShell below reads
  // that same key in its own lazy useState initializer), not in an effect, so AppShell
  // never mounts expanded first and then jumps to collapsed.
  const collapsedSidebarOnce = useRef(false);
  if (!collapsedSidebarOnce.current) {
    collapsedSidebarOnce.current = true;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1"); } catch {}
  }

  const { data: rawSections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["website-sections", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_sections")
        .select("*").eq("wedding_id", wedding!.id).order("sort_order");
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

  // If no sections yet, seed from template. Must wait for the fetch to actually settle
  // (sectionsLoading false) — otherwise rawSections' default `[]` while still loading is
  // indistinguishable from "genuinely empty", and this would insert duplicate default
  // sections on top of a wedding's real (not-yet-loaded) sections.
  useEffect(() => {
    if (!wedding?.id || sectionsLoading || rawSections.length > 0) return;
    (async () => {
      const rows = template.sections.map((type, i) => {
        const def = SECTION_LIBRARY.find((s) => s.type === type)!;
        return {
          wedding_id: wedding.id,
          section_type: type,
          sort_order: i,
          visible: true,
          content: def.defaultContent,
          image_url: template.images?.[type] ?? null,
        };
      });
      await (supabase as any).from("website_sections").insert(rows);
      qc.invalidateQueries({ queryKey: ["website-sections", wedding.id] });
    })();
  }, [wedding?.id, sectionsLoading, rawSections.length, template.sections, qc]);

  const sections = rawSections;
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const persistOrder = async (ordered: Section[]) => {
    await Promise.all(ordered.map((s, i) =>
      (supabase as any).from("website_sections").update({ sort_order: i }).eq("id", s.id)
    ));
    qc.invalidateQueries({ queryKey: ["website-sections", wedding?.id] });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    const next = arrayMove(sections, oldIdx, newIdx);
    qc.setQueryData(["website-sections", wedding?.id], next);
    persistOrder(next);
  };

  const updateSection = async (id: string, patch: Partial<Section>) => {
    qc.setQueryData(["website-sections", wedding?.id], (prev: Section[] = []) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
    const { error } = await (supabase as any).from("website_sections").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeSection = async (id: string) => {
    await (supabase as any).from("website_sections").delete().eq("id", id);
    if (selectedId === id) setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["website-sections", wedding?.id] });
  };

  const confirmDeleteSection = async () => {
    if (!confirmDeleteId) return;
    await removeSection(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  // atIndex lets the inter-row "+" dividers insert exactly where clicked (e.g. "above Our
  // story") instead of always appending to the end — the new row is spliced into the local
  // order, then persistOrder rewrites every sort_order the same way drag/move already do.
  const addSection = async (type: SectionType, atIndex?: number) => {
    if (!wedding?.id) return;
    const def = SECTION_LIBRARY.find((s) => s.type === type)!;
    const insertPos = atIndex ?? sections.length;
    const { data, error } = await (supabase as any).from("website_sections").insert({
      wedding_id: wedding.id,
      section_type: type,
      sort_order: insertPos,
      visible: true,
      content: def.defaultContent,
    }).select().single();
    if (error) return toast.error(error.message);
    const withNew = [...sections];
    withNew.splice(insertPos, 0, data as Section);
    qc.setQueryData(["website-sections", wedding.id], withNew);
    await persistOrder(withNew);
    setSelectedId(data.id);
  };

  const setPalette = async (key: string, value: string) => {
    if (!wedding) return;
    const next = { ...custom, palette: { ...(custom.palette ?? {}), [key]: value } };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };
  const resetPalette = async () => {
    if (!wedding) return;
    const next = { ...custom, palette: undefined };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };

  const setFont = async (key: "display" | "body", value: string) => {
    if (!wedding) return;
    const next = { ...custom, fonts: { ...(custom.fonts ?? {}), [key]: value } };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };
  const setFontScale = async (value: number) => {
    if (!wedding) return;
    const next = { ...custom, fontScale: value };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };
  const resetFonts = async () => {
    if (!wedding) return;
    const next = { ...custom, fonts: undefined, fontScale: undefined };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };

  const setPageLayout = async (value: PageLayout) => {
    if (!wedding) return;
    const next = { ...custom, pageLayout: value };
    await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    invalidateWedding(wedding.id);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!wedding) return null;
  const url = `/w/${wedding.slug ?? ""}`;

  return (
    <AppShell
      title="Website editor"
      subtitle={`Template: ${template.name}. Drag to reorder, click any section to edit.`}
      actions={
        <div className="flex gap-2">
          <Link to="/website" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone"><ArrowLeft className="h-4 w-4" /> Templates</Link>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone cursor-pointer">
                <Palette className="h-4 w-4" /> Colors
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 rounded-2xl border-line bg-paper p-4">
              <p className="text-[10px] uppercase tracking-widest text-wine">Colors</p>
              <div className="mt-3 space-y-2">
                {(["bg", "ink", "accent", "soft"] as const).map((k) => (
                  <label key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{k === "bg" ? "background" : k}</span>
                    <input type="color" value={palette[k]} onChange={(e) => setPalette(k, e.target.value)}
                      className="h-7 w-14 rounded border border-line bg-transparent cursor-pointer" />
                  </label>
                ))}
              </div>
              <button onClick={resetPalette} className="mt-3 text-sm text-muted-foreground hover:text-wine underline cursor-pointer">Reset to template</button>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone cursor-pointer">
                <Type className="h-4 w-4" /> Font
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 rounded-2xl border-line bg-paper p-4">
              <p className="text-[10px] uppercase tracking-widest text-wine">Font</p>
              <div className="mt-3 space-y-2">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Display font</span>
                  <div className="mt-1"><FontPicker value={fonts.display} onChange={(v) => setFont("display", v)} allowClear={false} /></div>
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Body font</span>
                  <div className="mt-1"><FontPicker value={fonts.body} onChange={(v) => setFont("body", v)} allowClear={false} /></div>
                </label>
              </div>
              <div className="mt-3">
                <span className="text-sm text-muted-foreground">Text size</span>
                <div className="mt-1 inline-flex rounded-full border border-line p-0.5 w-full">
                  {FONT_SCALES.map((s) => (
                    <button key={s.value} type="button" onClick={() => setFontScale(s.value)}
                      className={cn("flex-1 rounded-full px-3 py-1 text-sm cursor-pointer", fontScale === s.value ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={resetFonts} className="mt-3 text-sm text-muted-foreground hover:text-wine underline cursor-pointer">Reset to template</button>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone cursor-pointer">
                <LayoutGrid className="h-4 w-4" /> Layout
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-2xl border-line bg-paper p-2">
              <p className="px-2 pt-1 text-[10px] uppercase tracking-widest text-wine">Page layout</p>
              <div className="mt-1 space-y-1">
                {PAGE_LAYOUT_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => setPageLayout(o.value)}
                    className={cn("w-full text-left px-3 py-2 rounded-xl cursor-pointer", pageLayout === o.value ? "bg-blush-soft" : "hover:bg-stone")}>
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine">Preview <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      }
    >
      {sectionsLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* LEFT: section list + selected section's editor, stacked — keeps the preview on
            the right fully visible at all times instead of the editor pushing it down. */}
        <div className="space-y-4">
          <div className="paper-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-wine mb-3">Sections</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div>
                  <InsertSectionDivider onAdd={(t) => addSection(t, 0)} existing={sections.map((s) => s.section_type)} />
                  {sections.map((s, i) => (
                    <div key={s.id}>
                      <SortableSectionRow section={s} selected={s.id === selectedId}
                        onSelect={() => setSelectedId((prev) => (prev === s.id ? null : s.id))}
                        onToggle={() => updateSection(s.id, { visible: !s.visible })}
                        onDelete={() => setConfirmDeleteId(s.id)} />
                      <InsertSectionDivider onAdd={(t) => addSection(t, i + 1)} existing={sections.map((sec) => sec.section_type)} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <AddSectionMenu onAdd={addSection} existing={sections.map((s) => s.section_type)} />
          </div>

          {selected && (
            <SectionEditor
              key={selected.id}
              section={selected}
              weddingId={wedding.id}
              events={events}
              pageLayout={pageLayout}
              onChange={(patch) => updateSection(selected.id, patch)}
            />
          )}
        </div>

        {/* RIGHT: live preview, always fully visible */}
        <div className="paper-card p-0 overflow-hidden self-start lg:sticky lg:top-6">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-wine">Live preview</p>
            <div className="inline-flex rounded-full border border-line p-0.5">
              <button type="button" onClick={() => setPreviewDevice("desktop")} title="Desktop"
                className={cn("rounded-full p-1.5 cursor-pointer", previewDevice === "desktop" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setPreviewDevice("mobile")} title="Mobile"
                className={cn("rounded-full p-1.5 cursor-pointer", previewDevice === "mobile" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-[80vh] overflow-y-auto scroll-smooth bg-stone/30">
            <div className={cn(previewDevice === "mobile" && "max-w-[390px] mx-auto border-x border-line")}>
              <SitePreview wedding={wedding} sections={sections} palette={palette} template={template} fonts={fonts} fontScale={fontScale} pageLayout={pageLayout} events={events} />
            </div>
          </div>
        </div>
      </div>
      )}
      {confirmDeleteId && (() => {
        const s = sections.find((sec) => sec.id === confirmDeleteId);
        const def = s ? SECTION_LIBRARY.find((d) => d.type === s.section_type) : null;
        return (
          <ConfirmDialog
            title="Delete section"
            description={`Delete the "${def?.label ?? "section"}" section from your wedding website? This can't be undone.`}
            confirmLabel="Delete section"
            onConfirm={confirmDeleteSection}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </AppShell>
  );
}

function SortableSectionRow({ section, selected, onSelect, onToggle, onDelete }: {
  section: Section; selected: boolean; onSelect: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const def = SECTION_LIBRARY.find((s) => s.type === section.section_type);
  // The couple's own title (once they've set one) is what they'll recognize this section
  // by — falling back to the generic type label only when there isn't one yet.
  const label = section.content?.title || def?.label || section.section_type;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-1 rounded-2xl px-2 py-1.5 text-sm ${selected ? "bg-wine text-pearl" : "hover:bg-stone"}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-60 hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onSelect} className="flex-1 text-left truncate focus:outline-none">
        {label}
      </button>
      <button onClick={onToggle} className="p-1 opacity-60 hover:opacity-100" title={section.visible ? "Hide" : "Show"}>
        {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDelete} className="p-1 opacity-60 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// Groups the flat SECTION_LIBRARY so "where do I add a text/image/shape section" has an
// obvious answer instead of one alphabetical-ish grid — icons only on the types the user
// couldn't find (header/footer/text/shape); the rest keep their plain label. Shared by the
// bottom "Add section" button (appends) and the inter-row "+" dividers (insert at a spot).
const SECTION_GROUPS: { label: string; types: SectionType[] }[] = [
  { label: "Structure", types: ["header", "hero", "footer"] },
  { label: "Content", types: ["text", "image", "story", "events", "gallery", "party", "travel", "registry", "rsvp", "faq", "quote"] },
  { label: "Decoration", types: ["shape"] },
];
const SECTION_ICONS: Partial<Record<SectionType, any>> = { header: LayoutGrid, footer: Minus, text: Type, shape: Sparkles, image: ImageIcon };

function SectionTypePicker({ onPick, existing }: { onPick: (t: SectionType) => void; existing: SectionType[] }) {
  return (
    <div className="space-y-3">
      {SECTION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">{group.label}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {group.types.map((type) => {
              const def = SECTION_LIBRARY.find((d) => d.type === type)!;
              const Icon = SECTION_ICONS[type];
              return (
                <button key={type} onClick={() => onPick(type)}
                  className="flex items-center gap-1.5 text-left text-sm rounded-xl border border-line px-3 py-2 hover:border-wine hover:bg-cream cursor-pointer">
                  {Icon && <Icon className="h-3.5 w-3.5 text-wine shrink-0" />}
                  <span className="truncate">{def.label}</span>
                  {existing.includes(type) && <span className="ml-auto text-[8px] text-muted-foreground shrink-0">·added</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddSectionMenu({ onAdd, existing }: { onAdd: (t: SectionType) => void; existing: SectionType[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-line py-2 text-sm hover:border-wine hover:text-wine cursor-pointer">
        <Plus className="h-3.5 w-3.5" /> Add section
      </button>
      {open && (
        <div className="mt-2">
          <SectionTypePicker onPick={(t) => { onAdd(t); setOpen(false); }} existing={existing} />
        </div>
      )}
    </div>
  );
}

// Slim hover-reveal "+" between two rows (and above the first) — lets a new section be
// inserted exactly there ("add a text box above Our story") instead of always appending to
// the end and dragging it into place.
function InsertSectionDivider({ onAdd, existing }: { onAdd: (t: SectionType) => void; existing: SectionType[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative h-3 group">
      <div className={cn("absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-wine/40 transition-opacity", open ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button title="Insert section here"
            className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-4 w-4 place-items-center rounded-full bg-wine text-pearl transition-opacity cursor-pointer", open ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            <Plus className="h-2.5 w-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-64 rounded-2xl border-line bg-paper p-3">
          <SectionTypePicker onPick={(t) => { onAdd(t); setOpen(false); }} existing={existing} />
        </PopoverContent>
      </Popover>
    </div>
  );
}


function SectionEditor({ section, weddingId, events, pageLayout, onChange }: {
  section: Section; weddingId: string; events: { id: string; name: string }[]; pageLayout: PageLayout; onChange: (patch: Partial<Section>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const def = SECTION_LIBRARY.find((s) => s.type === section.section_type)!;
  const qc = useQueryClient();
  const { data: library = [] } = useWeddingPhotos(weddingId);

  const setField = (key: string, value: any) =>
    onChange({ content: { ...section.content, [key]: value } });

  const setFocal = (x: number, y: number) =>
    onChange({ content: { ...section.content, focalX: x, focalY: y } });

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${weddingId}/website/${section.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-assets").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("wedding-assets").getPublicUrl(path);
    onChange({ image_url: data.publicUrl });
    // Every upload also joins the reusable photo library, so it's there to pick from next
    // time without re-uploading the same file to a different section.
    await supabase.from("wedding_photos").insert({ wedding_id: weddingId, url: data.publicUrl, sort_order: library.length });
    qc.invalidateQueries({ queryKey: ["wedding-photos", weddingId] });
    setUploading(false);
  };

  return (
    <div className="paper-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-wine">Editing</p>
          <h3 className="font-serif text-2xl">{def.label}</h3>
        </div>
      </div>

      {/* Always a single stacked column now — this editor lives in the narrower left
          column alongside the section list, not its own half of the page, so a
          viewport-width md: breakpoint would force two columns into too little space. */}
      <div className="space-y-4">
        <div className="space-y-3">
          <SectionFields section={section} setField={setField} events={events} />
        </div>

        {!NO_HEADING_TYPES.includes(section.section_type) && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Font (this section only)</p>
            <FontPicker value={section.content?.fontFamily ?? ""} onChange={(v) => setField("fontFamily", v)} />
            <div className="mt-2 flex flex-wrap gap-1">
              {SECTION_FONT_SIZE_OPTIONS.map((s) => (
                <button key={s.value} type="button" onClick={() => setField("fontSize", s.value || undefined)}
                  className={cn("rounded-full border px-3 py-1 text-sm cursor-pointer", (section.content?.fontSize ?? "") === s.value ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">Section photo</p>
          {section.image_url ? (
            <FocalPointPicker src={section.image_url} x={section.content?.focalX ?? 50} y={section.content?.focalY ?? 50} onChange={setFocal} />
          ) : (
            <div className="relative aspect-[4/3] rounded-2xl border border-dashed border-line overflow-hidden bg-stone/40">
              <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">No photo</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-wine disabled:opacity-60 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : section.image_url ? "Replace" : "Upload"}
            </button>
            <Popover open={libraryOpen} onOpenChange={setLibraryOpen}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-wine cursor-pointer">
                  <Images className="h-3.5 w-3.5" /> Choose from library
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 rounded-2xl border-line bg-paper p-3">
                {library.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No photos yet — upload one first and it'll show up here.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                    {library.map((p) => (
                      <button key={p.id} onClick={() => { onChange({ image_url: p.url }); setLibraryOpen(false); }}
                        className={cn("aspect-square rounded-lg overflow-hidden border-2 cursor-pointer", section.image_url === p.url ? "border-wine" : "border-transparent hover:border-line")}>
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {section.image_url && (
              <button onClick={() => onChange({ image_url: null })} className="text-sm text-muted-foreground hover:text-wine underline cursor-pointer">Remove</button>
            )}
          </div>
          {IMAGE_LAYOUT_TYPES.includes(section.section_type) && pageLayout !== "split" && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground mb-1.5">Photo layout</p>
              <div className="inline-flex rounded-full border border-line p-0.5">
                {(["full", "left", "right"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setField("imageLayout", v)}
                    className={cn("rounded-full px-3 py-1 text-sm capitalize cursor-pointer", (section.content?.imageLayout ?? "full") === v ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                    {v === "full" ? "Full width" : v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionFields({ section, setField, events }: { section: Section; setField: (k: string, v: any) => void; events: { id: string; name: string }[] }) {
  const c = section.content ?? {};
  const inp = "w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:border-wine";
  const label = (t: string) => <label className="block text-sm text-muted-foreground mb-1">{t}</label>;

  switch (section.section_type) {
    case "hero":
      return (
        <>
          <div>{label("Eyebrow")}<input className={inp} value={c.eyebrow ?? ""} onChange={(e) => setField("eyebrow", e.target.value)} /></div>
          <div>{label("Tagline")}<input className={inp} value={c.tagline ?? ""} onChange={(e) => setField("tagline", e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={c.showCountdown ?? false} onChange={(e) => setField("showCountdown", e.target.checked)} />
            Show a live countdown to your next event
          </label>
        </>
      );
    case "header":
      return (
        <div>{label("Tagline (shown above your names)")}<input className={inp} placeholder="The wedding of" value={c.tagline ?? ""} onChange={(e) => setField("tagline", e.target.value)} /></div>
      );
    case "footer":
      return (
        <div>{label("Footer text")}<input className={inp} placeholder="Partner A & Partner B" value={c.text ?? ""} onChange={(e) => setField("text", e.target.value)} /></div>
      );
    case "text":
      return (
        <>
          <div>{label("Text")}<RichTextField value={c.body ?? ""} onChange={(v) => setField("body", v)} placeholder="Write anything you like here." /></div>
          <div>
            {label("Alignment")}
            <div className="inline-flex rounded-full border border-line p-0.5">
              {(["left", "center", "right"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setField("align", v)}
                  className={cn("rounded-full px-3 py-1 text-sm capitalize cursor-pointer", (c.align ?? "center") === v ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    case "shape":
      return (
        <div>
          {label("Shape")}
          <div className="inline-flex rounded-full border border-line p-0.5">
            {(["line", "dots", "blob"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setField("kind", v)}
                className={cn("rounded-full px-3 py-1 text-sm capitalize cursor-pointer", (c.kind ?? "line") === v ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                {v}
              </button>
            ))}
          </div>
        </div>
      );
    case "image":
      return (
        <>
          <div>
            {label("Shape")}
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_SHAPE_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setField("shape", o.value)}
                  className={cn("rounded-full border px-3 py-1 text-sm cursor-pointer", (c.shape ?? "rectangle") === o.value ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            {label("Size")}
            <div className="inline-flex rounded-full border border-line p-0.5">
              {IMAGE_SIZE_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setField("size", o.value)}
                  className={cn("rounded-full px-3 py-1 text-sm cursor-pointer", (c.size ?? "m") === o.value ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    case "story":
    case "travel":
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <div>{label("Body")}<RichTextField value={c.body ?? ""} onChange={(v) => setField("body", v)} /></div>
        </>
      );
    case "registry":
    case "rsvp":
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <div>{label("Body")}<RichTextField value={c.body ?? ""} onChange={(v) => setField("body", v)} /></div>
          <div>{label("Button label")}<input className={inp} placeholder={section.section_type === "registry" ? "View our registry" : "RSVP now"} value={c.ctaLabel ?? ""} onChange={(e) => setField("ctaLabel", e.target.value)} /></div>
        </>
      );
    case "events": {
      const hidden: string[] = c.hiddenEventIds ?? [];
      const toggleHidden = (id: string) => setField("hiddenEventIds", hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Events shown on the site</p>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No events yet.</p>
            ) : (
              <div className="space-y-1.5">
                {events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!hidden.includes(e.id)} onChange={() => toggleHidden(e.id)} />
                    {e.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      );
    }
    case "gallery": {
      const images: string[] = c.images ?? [];
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          {label("Image URLs, one per line")}
          <textarea rows={5} className={inp} value={images.join("\n")}
            onChange={(e) => setField("images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
        </>
      );
    }
    case "party": {
      const members: { name: string; role: string }[] = c.members ?? [];
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input className={inp} placeholder="Name" value={m.name} onChange={(e) => { const n = [...members]; n[i] = { ...n[i], name: e.target.value }; setField("members", n); }} />
                <input className={inp} placeholder="Role" value={m.role} onChange={(e) => { const n = [...members]; n[i] = { ...n[i], role: e.target.value }; setField("members", n); }} />
                <button onClick={() => setField("members", members.filter((_, x) => x !== i))} className="text-sm text-muted-foreground hover:text-wine">×</button>
              </div>
            ))}
            <button onClick={() => setField("members", [...members, { name: "", role: "" }])} className="text-sm text-wine hover:underline">+ Add member</button>
          </div>
        </>
      );
    }
    case "faq": {
      const items: { q: string; a: string }[] = c.items ?? [];
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? "FAQ"} onChange={(e) => setField("title", e.target.value)} /></div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="space-y-1 border-t border-line pt-2">
                <input className={inp} placeholder="Question" value={it.q} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], q: e.target.value }; setField("items", n); }} />
                <textarea rows={2} className={inp} placeholder="Answer" value={it.a} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], a: e.target.value }; setField("items", n); }} />
                <button onClick={() => setField("items", items.filter((_, x) => x !== i))} className="text-sm text-muted-foreground hover:text-wine">Remove</button>
              </div>
            ))}
            <button onClick={() => setField("items", [...items, { q: "", a: "" }])} className="text-sm text-wine hover:underline">+ Add question</button>
          </div>
        </>
      );
    }
    case "quote":
      return (
        <>
          <div>{label("Quote")}<textarea rows={3} className={inp} value={c.text ?? ""} onChange={(e) => setField("text", e.target.value)} /></div>
          <div>{label("Author")}<input className={inp} value={c.author ?? ""} onChange={(e) => setField("author", e.target.value)} /></div>
        </>
      );
    default:
      return null;
  }
}

// Every section renders on the right in document order; the ones with a photo double as
// scroll triggers — as each one crosses into view, the fixed left panel crossfades to its
// photo. A separate component (not a branch inside SiteShell) because it needs its own
// hooks, which can't live inside one conditional branch of a function also used for the
// other, hookless layout modes.
function SplitViewShell({ wedding, sections, palette, template, events, monogram }: {
  wedding: any; sections: Section[]; palette: any; template: any; events: any[]; monogram: React.ReactNode;
}) {
  const withPhoto = sections.filter((s) => s.image_url);
  const [activeId, setActiveId] = useState<string | null>(withPhoto[0]?.id ?? null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const photoKey = withPhoto.map((s) => s.id).join("|");

  useEffect(() => {
    if (!photoKey) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Closest to the top of the viewport among everything currently in view — the
        // section the couple is most looking at right now.
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0].target.getAttribute("data-section-id");
        if (id) setActiveId(id);
      },
      { threshold: 0.35 },
    );
    photoKey.split("|").forEach((id) => { const el = nodesRef.current.get(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [photoKey]);

  return (
    <div className="flex flex-wrap">
      {/* Below lg, the fixed side-by-side panels don't fit — each section's photo instead
          renders inline as its own full-screen slide, immediately followed by that
          section's content, so scrolling alternates photo/content/photo/content. */}
      <div className="hidden lg:block relative flex-1 basis-96 lg:sticky lg:top-0 lg:h-screen overflow-hidden" style={{ background: palette.soft }}>
        {withPhoto.length === 0 && <div className="absolute inset-0 grid place-items-center">{monogram}</div>}
        {withPhoto.map((s) => (
          <img key={s.id} src={s.image_url!} alt="" style={{ ...focalPosition(s.content), opacity: activeId === s.id ? 1 : 0 }}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out" />
        ))}
      </div>
      <div className="flex-1 basis-96 lg:h-screen lg:overflow-y-auto">
        {withPhoto.length === 0 && <div className="min-h-[50vh] grid place-items-center lg:hidden" style={{ background: palette.soft }}>{monogram}</div>}
        {sections.map((s) => (
          <div key={s.id}
            ref={(el) => { if (el) nodesRef.current.set(s.id, el); else nodesRef.current.delete(s.id); }}
            data-section-id={s.id}
            className={s.image_url ? "lg:min-h-[50vh] lg:flex lg:flex-col lg:justify-center" : undefined}>
            {s.image_url && (
              <div className="relative min-h-screen overflow-hidden lg:hidden" style={{ background: palette.soft }}>
                <img src={s.image_url} alt="" style={focalPosition(s.content)} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}
            <RenderSection section={s} palette={palette} template={template} wedding={wedding} events={events} suppressImage={!!s.image_url} />
          </div>
        ))}
        {sections.length === 0 && <div className="p-10 text-center text-sm">Add more sections to fill this side.</div>}
      </div>
    </div>
  );
}

// Same-page approximations of withjoy's Split View / Classic Navigation — not a true
// multi-page rebuild with its own routes. Shared by the editor's SitePreview and the
// public w.$slug.tsx so both always render a given wedding's chosen layout identically.
export function SiteShell({ wedding, sections, palette, template, events, layoutMode }: {
  wedding: any; sections: Section[]; palette: any; template: any; events: any[]; layoutMode: PageLayout;
}) {
  const monogram = (
    <p className="font-serif text-3xl text-center px-6" style={{ fontFamily: `"${template.fonts.display}", serif` }}>
      {wedding.partner_a} & {wedding.partner_b}
    </p>
  );

  if (layoutMode === "split") {
    return <SplitViewShell wedding={wedding} sections={sections} palette={palette} template={template} events={events} monogram={monogram} />;
  }

  if (layoutMode === "nav") {
    return (
      <div>
        {/* Scoped to this render only — cleans up on unmount, doesn't leak scroll-behavior
            to other pages in the app. */}
        <style>{"html { scroll-behavior: smooth; }"}</style>
        <nav className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-1 px-6 py-3 border-b" style={{ background: palette.bg, borderColor: palette.soft }}>
          {sections.map((s) => (
            <a key={s.id} href={`#section-${s.id}`} className="text-sm uppercase tracking-widest hover:opacity-70" style={{ color: palette.ink }}>
              {SECTION_LIBRARY.find((d) => d.type === s.section_type)?.label ?? s.section_type}
            </a>
          ))}
        </nav>
        {sections.map((s) => (
          <div key={s.id} id={`section-${s.id}`}>
            <RenderSection section={s} palette={palette} template={template} wedding={wedding} events={events} />
          </div>
        ))}
        {sections.length === 0 && <div className="p-10 text-center text-sm">All sections hidden.</div>}
      </div>
    );
  }

  return (
    <>
      {sections.map((s) => <RenderSection key={s.id} section={s} palette={palette} template={template} wedding={wedding} events={events} />)}
      {sections.length === 0 && <div className="p-10 text-center text-sm">All sections hidden.</div>}
    </>
  );
}

function SitePreview({ wedding, sections, palette, template, fonts, fontScale, pageLayout, events }: {
  wedding: any; sections: Section[]; palette: any; template: any; fonts?: { display: string; body: string }; fontScale?: number; pageLayout?: PageLayout; events: any[];
}) {
  const visible = sections.filter((s) => s.visible);
  // Overriding fonts here (rather than threading a separate prop through RenderSection)
  // means every RenderSection case's existing `template.fonts.display/body` reads just
  // work unchanged. --site-scale is a plain CSS variable, so it cascades to every
  // descendant's `calc(... * var(--site-scale, 1))` heading style with no prop drilling.
  const effectiveTemplate = fonts ? { ...template, fonts } : template;
  // Only load fonts this wedding's site actually uses — the sitewide pair plus any
  // per-section overrides — not the whole curated GOOGLE_FONT_OPTIONS list.
  useGoogleFonts([effectiveTemplate.fonts.display, effectiveTemplate.fonts.body, ...sections.map((s) => s.content?.fontFamily)]);
  return (
    <div style={{ background: palette.bg, color: palette.ink, fontFamily: `"${effectiveTemplate.fonts.body}", sans-serif`, ["--site-scale" as any]: fontScale ?? 1 }}>
      <SiteShell wedding={wedding} sections={visible} palette={palette} template={effectiveTemplate} events={events} layoutMode={pageLayout ?? "scroll"} />
    </div>
  );
}

// Live countdown to a target date/time — its own component (not inline in RenderSection)
// because it needs its own ticking interval; RenderSection itself stays a plain render
// switch with no timers of its own.
function CountdownTimer({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return <p className="mt-4 text-sm opacity-70 tabular-nums">{days}d {hours}h {minutes}m {seconds}s</p>;
}

// Hand-drawn (not sourced — self-authored, so no licensing question), used by any
// template that opts in via `decoration: "floral"` for a bit of its own visual identity
// beyond just font/color/photo. A simple vine-and-blooms corner accent, nothing more.
function FloralFlourish({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("pointer-events-none", className)} fill="none">
      <path d="M20 180 C 40 140, 60 120, 90 100 C 110 86, 130 70, 140 40" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M90 100 C 100 90, 115 85, 130 90" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M70 130 C 82 122, 96 120, 108 126" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="140" cy="40" r="6" fill={color} opacity="0.85" />
      <circle cx="128" cy="55" r="4" fill={color} opacity="0.65" />
      <circle cx="108" cy="126" r="3.5" fill={color} opacity="0.6" />
      <circle cx="70" cy="130" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

// A section's own content.fontFamily (set via SectionEditor's per-section Font block)
// overrides the site-wide template.fonts.display for just that section's dominant text —
// this is what makes "select the Hero section and change its font" possible.
function sectionFontFamily(content: Record<string, any> | undefined, displayFont: any) {
  return content?.fontFamily ? `"${content.fontFamily}", serif` : displayFont.fontFamily;
}

// --site-scale is set by the enclosing wrapper (SitePreview here, or w.$slug.tsx on the
// public site) from the sitewide Font popover's Small/Medium/Large control. A section's own
// content.fontSize (small/medium/large/xlarge) takes precedence over that sitewide scale for
// just this section's heading when set — using SECTION_HEADING_SIZES' own tuned clamp()
// per level rather than multiplying the base clamp (a flat multiplier compounded badly at
// the extremes, e.g. blowing past 120px on desktop while barely moving on mobile).
// Tailwind's fixed-rem size classes can't be rescaled by an ancestor's font-size, so this
// applies size via inline style instead, scoped to headings only (not body text).
function sectionHeadingStyle(displayFont: any, content?: Record<string, any>) {
  const tuned = content?.fontSize ? SECTION_HEADING_SIZES[content.fontSize] : undefined;
  return {
    fontFamily: sectionFontFamily(content, displayFont),
    fontSize: tuned ?? `calc(${SECTION_HEADING_SIZES.medium} * var(--site-scale, 1))`,
  };
}

// Section body text is stored as an HTML string (RichTextField's bold/italic/underline
// output) — this is the wedding owner's own content on their own public page, the same
// trust boundary the Notes feature already operates under, not a new XSS surface.
function RichBody({ html, className }: { html: string; className?: string }) {
  return <div className={cn("opacity-80 leading-relaxed", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Shared by story/travel/registry/rsvp (and hero's own two-column variant below) — all
// four are "title + optional photo + body [+ optional CTA]", differing only in text
// alignment and the trailing CTA. The imageLayout branch here is what would otherwise be
// quadruplicated across those four cases.
function MediaSection({ section, title, body, displayFont, align = "left", cta, suppressImage = false }: {
  section: Section; title: string; body: string; displayFont: any; align?: "left" | "center"; cta?: React.ReactNode; suppressImage?: boolean;
}) {
  const layout = (section.content?.imageLayout as "full" | "left" | "right" | undefined) ?? "full";
  const hasImage = !!section.image_url && !suppressImage;

  if (hasImage && layout !== "full") {
    // flex-wrap (not grid + a viewport md: breakpoint) so this responds to the space it's
    // actually rendered in — a real phone, the editor's narrower preview column, or the
    // simulated mobile-width preview all wrap correctly, since flex-wrap reacts to the
    // container's own width, not a media query on the browser window. Text stays
    // left-aligned in both the side-by-side and stacked arrangement rather than
    // conditionally centering, so there's nothing that only looks right at one width.
    const imageBlock = (
      <div className="flex-1 basis-72 min-w-[220px] max-w-[420px] mx-auto">
        <div className="aspect-[4/3] rounded-2xl overflow-hidden">
          <img src={section.image_url!} alt="" style={focalPosition(section.content)} className="w-full h-full object-cover" />
        </div>
      </div>
    );
    const textBlock = (
      <div className="flex-1 basis-72 min-w-[240px] text-left">
        <h2 style={sectionHeadingStyle(displayFont, section.content)} className="mb-4">{title}</h2>
        <RichBody html={body} />
        {cta}
      </div>
    );
    return (
      <section className="px-6 py-16 max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8">
        {layout === "right" ? <>{textBlock}{imageBlock}</> : <>{imageBlock}{textBlock}</>}
      </section>
    );
  }

  return (
    <section className={cn("px-6 py-16 max-w-3xl mx-auto", align === "center" && "text-center")}>
      <h2 style={sectionHeadingStyle(displayFont, section.content)} className="mb-4">{title}</h2>
      {hasImage && <img src={section.image_url!} alt="" style={focalPosition(section.content)} className="rounded-2xl mb-4 w-full max-h-96 object-cover" />}
      <RichBody html={body} />
      {cta}
    </section>
  );
}

// suppressImage is set by SiteShell's Split View, where every section's own photo already
// shows in the fixed left panel (crossfading as the couple scrolls) — rendering it again
// inline here would just duplicate it. Never affects "scroll"/"nav" layouts.
export function RenderSection({ section, palette, template, wedding, events = [], suppressImage = false }: {
  section: Section; palette: any; template: any; wedding: any; events?: any[]; suppressImage?: boolean;
}) {
  const c = section.content ?? {};
  const displayFont = { fontFamily: `"${template.fonts.display}", serif` };
  switch (section.section_type) {
    case "hero": {
      const layout = (c.imageLayout as "full" | "left" | "right" | undefined) ?? "full";
      // Countdown targets the soonest dated event — weddings has no single canonical
      // "the date," each event carries its own, so this is the couple's actual next
      // upcoming moment rather than an arbitrary pick.
      const nextEvent = events
        .filter((e: any) => e.event_date)
        .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date))[0];
      const heroText = (
        <>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accent }}>{c.eyebrow || "Together with their families"}</p>
          <h1 className="mt-6" style={{
            fontFamily: sectionFontFamily(c, displayFont),
            fontSize: c.fontSize
              ? HERO_HEADING_SIZES[c.fontSize]
              : `calc(${HERO_HEADING_SIZES.medium} * var(--site-scale, 1))`,
            lineHeight: 1,
          }}>
            {wedding.partner_a}<br /><span style={{ color: palette.accent }}>&</span><br />{wedding.partner_b}
          </h1>
          {c.tagline && <p className="mt-6 text-sm opacity-70">{c.tagline}</p>}
          {c.showCountdown && nextEvent && <CountdownTimer target={nextEvent.event_date} />}
        </>
      );
      const scrollCue = layout === "full" && (
        <ChevronDown className="mx-auto mt-10 h-4 w-4 animate-bounce opacity-50" style={{ color: palette.accent }} />
      );
      if (suppressImage) {
        return (
          <section className="relative px-6 py-16 text-center overflow-hidden">
            {template.decoration === "floral" && (
              <FloralFlourish color={palette.accent} className="absolute -top-4 -right-4 h-20 w-20 opacity-70" />
            )}
            {heroText}
          </section>
        );
      }
      if (section.image_url && layout !== "full") {
        // flex-wrap, not grid + a viewport md: breakpoint — see the matching comment in
        // MediaSection for why: it needs to respond to the space it's actually rendered
        // in (a real phone, the editor's narrower preview column, the simulated
        // mobile-width preview), not the browser window's real size.
        const photo = (
          <div className="flex-1 basis-72 min-w-[220px] max-w-[420px] mx-auto">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <img src={section.image_url} alt="" style={focalPosition(c)} className="w-full h-full object-cover" />
            </div>
          </div>
        );
        const textBlock = <div className="flex-1 basis-72 min-w-[240px] text-left">{heroText}</div>;
        return (
          <section className="px-6 py-16 max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-10">
            {layout === "right" ? <>{textBlock}{photo}</> : <>{photo}{textBlock}</>}
          </section>
        );
      }
      return (
        <section className="relative px-6 py-24 text-center overflow-hidden" style={{ background: section.image_url ? undefined : palette.bg }}>
          {template.decoration === "floral" && (
            <FloralFlourish color={palette.accent} className="absolute -top-4 -right-4 h-24 w-24 md:h-32 md:w-32 opacity-70" />
          )}
          {section.image_url && (
            <div className="mx-auto max-w-3xl aspect-[16/10] rounded-3xl overflow-hidden mb-8">
              <img src={section.image_url} alt="" style={focalPosition(c)} className="w-full h-full object-cover" />
            </div>
          )}
          {heroText}
          {scrollCue}
        </section>
      );
    }
    case "header":
      return (
        <section className="px-6 py-6 flex items-center justify-center gap-3">
          {section.image_url && !suppressImage && (
            <img src={section.image_url} alt="" style={focalPosition(c)} className="h-10 w-10 rounded-full object-cover shrink-0" />
          )}
          <div className="text-center">
            {c.tagline && <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accent }}>{c.tagline}</p>}
            <p style={{ fontFamily: sectionFontFamily(c, displayFont) }} className="text-xl">{wedding.partner_a} & {wedding.partner_b}</p>
          </div>
        </section>
      );
    case "footer":
      return (
        <section className="px-6 py-8 text-center border-t" style={{ borderColor: palette.soft }}>
          <p className="text-sm opacity-70">{c.text || `${wedding.partner_a} & ${wedding.partner_b}`}</p>
        </section>
      );
    case "text": {
      const align = (c.align as "left" | "center" | "right" | undefined) ?? "center";
      return (
        <section className={cn("px-6 py-12 max-w-2xl mx-auto", align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center")}>
          <RichBody html={c.body} />
        </section>
      );
    }
    case "shape": {
      const kind = (c.kind as "line" | "dots" | "blob" | undefined) ?? "line";
      return (
        <section className="px-6 py-10 flex items-center justify-center">
          {kind === "line" && <div className="w-24 h-px" style={{ background: palette.accent }} />}
          {kind === "dots" && (
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: palette.accent }} />)}
            </div>
          )}
          {kind === "blob" && <div className="blob h-16 w-16" style={{ background: palette.accent }} />}
        </section>
      );
    }
    case "image": {
      // The whole point of this section is its photo — once Split View is showing it in
      // the fixed left panel, there's nothing left to render on the right; it stays only
      // as an (invisible) scroll trigger for the left panel to switch to it.
      if (!section.image_url || suppressImage) return null;
      const shape = (c.shape as string | undefined) ?? "rectangle";
      const size = IMAGE_SIZES[(c.size as string | undefined) ?? "m"];
      const shapeClass = shape === "circle" ? "aspect-square rounded-full"
        : shape === "square" ? "aspect-square rounded-2xl"
        : shape === "oval" ? "aspect-[3/2] rounded-full"
        : shape === "heart" ? "aspect-square"
        : "aspect-[4/3] rounded-2xl";
      return (
        <section className="px-6 py-10 flex items-center justify-center">
          <div style={{ width: size }} className={cn("overflow-hidden", shapeClass)}>
            {shape === "heart" ? (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <clipPath id={`heart-${section.id}`} clipPathUnits="userSpaceOnUse">
                    <path d={HEART_PATH_D} />
                  </clipPath>
                </defs>
                <image href={section.image_url} width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#heart-${section.id})`} />
              </svg>
            ) : (
              <img src={section.image_url} alt="" style={focalPosition(c)} className="w-full h-full object-cover" />
            )}
          </div>
        </section>
      );
    }
    case "story":
    case "travel":
      return <MediaSection section={section} title={c.title} body={c.body} displayFont={displayFont} align="left" suppressImage={suppressImage} />;
    case "registry":
      return (
        <MediaSection section={section} title={c.title} body={c.body} displayFont={displayFont} align="center" suppressImage={suppressImage}
          cta={
            <Link to="/w/$slug/registry" params={{ slug: wedding.slug ?? "" }}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              style={{ background: palette.accent, color: palette.bg }}>
              {c.ctaLabel || "View our registry"}
            </Link>
          } />
      );
    case "rsvp":
      return (
        <MediaSection section={section} title={c.title} body={c.body} displayFont={displayFont} align="center" suppressImage={suppressImage}
          cta={
            <Link to="/rsvp/w/$slug" params={{ slug: wedding.slug ?? "" }}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              style={{ background: palette.accent, color: palette.bg }}>
              {c.ctaLabel || "RSVP now"}
            </Link>
          } />
      );
    case "events": {
      const hiddenEventIds: string[] = c.hiddenEventIds ?? [];
      const shownEvents = events.filter((e: any) => !hiddenEventIds.includes(e.id));
      return (
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 style={sectionHeadingStyle(displayFont, c)} className="mb-6 text-center">{c.title || "Celebrations"}</h2>
          <div className="space-y-4">
            {shownEvents.map((e: any, i: number) => (
              <div key={e.id} className="rounded-3xl p-6 md:p-8" style={{ background: palette.soft }}>
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl" style={{ color: palette.accent, ...displayFont }}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-3xl" style={displayFont}>{e.name}</h3>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-70">
                  {e.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(e.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}{e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}</span>}
                  {(e.venue_name || e.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[e.venue_name, e.city].filter(Boolean).join(", ")}</span>}
                </div>
                {e.description && <p className="mt-4 text-sm opacity-75">{e.description}</p>}
              </div>
            ))}
            {shownEvents.length === 0 && <p className="text-center text-sm opacity-60">Details coming soon.</p>}
          </div>
        </section>
      );
    }
    case "gallery": {
      const images: string[] = c.images ?? [];
      // Only section.image_url (index 0) is what Split View's left panel already shows —
      // the rest are plain pasted URLs, unrelated to that mechanism, so they still render.
      const all = section.image_url && !suppressImage ? [section.image_url, ...images] : images;
      return (
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 style={sectionHeadingStyle(displayFont, c)} className="mb-6 text-center">{c.title || "Moments"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* focalX/focalY only apply to index 0 — that's the one uploaded via this
                section's own photo picker; the rest are plain pasted URLs with no
                per-image focal point mechanism of their own. */}
            {all.map((src, i) => <img key={i} src={src} alt="" style={i === 0 && !suppressImage ? focalPosition(c) : undefined} className="aspect-square object-cover rounded-2xl" />)}
            {all.length === 0 && <p className="col-span-full text-center text-sm opacity-60">Add photo URLs or upload one for this section.</p>}
          </div>
        </section>
      );
    }
    case "party": {
      const members: { name: string; role: string }[] = c.members ?? [];
      return (
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 style={sectionHeadingStyle(displayFont, c)} className="mb-6 text-center">{c.title || "Wedding party"}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map((m, i) => (
              <div key={i} className="text-center rounded-2xl p-4" style={{ background: palette.soft }}>
                <p style={displayFont} className="text-xl">{m.name}</p>
                <p className="text-sm opacity-70 mt-1">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "faq": {
      const items: { q: string; a: string }[] = c.items ?? [];
      return (
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 style={sectionHeadingStyle(displayFont, c)} className="mb-6 text-center">{c.title || "FAQ"}</h2>
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="border-t pt-4" style={{ borderColor: palette.soft }}>
                <p className="font-medium">{it.q}</p>
                <p className="opacity-75 mt-1 text-sm">{it.a}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "quote":
      return (
        <section className="px-6 py-20 text-center" style={{ background: palette.soft }}>
          <p style={{ fontFamily: sectionFontFamily(c, displayFont) }} className="text-2xl md:text-3xl max-w-2xl mx-auto leading-snug">"{c.text}"</p>
          {c.author && <p className="mt-4 text-sm opacity-60 uppercase tracking-widest">by {c.author}</p>}
        </section>
      );
    default:
      return null;
  }
}
