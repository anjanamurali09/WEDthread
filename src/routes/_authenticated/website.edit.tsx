import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Eye, EyeOff, Trash2, Plus, Upload, ExternalLink, ArrowLeft, Palette } from "lucide-react";
import { TEMPLATES, SECTION_LIBRARY, getTemplate, type SectionType } from "@/lib/website-templates";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/website/edit")({ component: EditorPage });

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
  const invalidateWedding = useInvalidateWedding();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const template = getTemplate(wedding?.site_template_id);
  const custom = (wedding?.site_customization as any) ?? {};
  const palette = { ...template.palette, ...(custom.palette ?? {}) };

  const { data: rawSections = [] } = useQuery({
    queryKey: ["website-sections", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_sections")
        .select("*").eq("wedding_id", wedding!.id).order("sort_order");
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

  // If no sections yet, seed from template
  useEffect(() => {
    if (!wedding?.id || rawSections.length > 0) return;
    (async () => {
      const rows = template.sections.map((type, i) => {
        const def = SECTION_LIBRARY.find((s) => s.type === type)!;
        return {
          wedding_id: wedding.id,
          section_type: type,
          sort_order: i,
          visible: true,
          content: def.defaultContent,
          image_url: null,
        };
      });
      await (supabase as any).from("website_sections").insert(rows);
      qc.invalidateQueries({ queryKey: ["website-sections", wedding.id] });
    })();
  }, [wedding?.id, rawSections.length, template.sections, qc]);

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
    if (!confirm("Delete this section?")) return;
    await (supabase as any).from("website_sections").delete().eq("id", id);
    if (selectedId === id) setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["website-sections", wedding?.id] });
  };

  const addSection = async (type: SectionType) => {
    if (!wedding?.id) return;
    const def = SECTION_LIBRARY.find((s) => s.type === type)!;
    const { data, error } = await (supabase as any).from("website_sections").insert({
      wedding_id: wedding.id,
      section_type: type,
      sort_order: sections.length,
      visible: true,
      content: def.defaultContent,
    }).select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["website-sections", wedding?.id] });
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

  if (!wedding) return null;
  const url = `/w/${wedding.slug ?? ""}`;

  return (
    <AppShell
      title="Website editor"
      subtitle={`Template: ${template.name}. Drag to reorder, click any section to edit.`}
      actions={
        <div className="flex gap-2">
          <Link to="/website" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone"><ArrowLeft className="h-4 w-4" /> Templates</Link>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine">Preview <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      }
    >
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* LEFT: section list + template controls */}
        <div className="space-y-4">
          <div className="paper-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-wine">Sections</p>
              <span className="text-xs text-muted-foreground">{sections.length}</span>
            </div>
            <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {sections.map((s) => (
                    <SortableSectionRow key={s.id} section={s} selected={s.id === selectedId}
                      onSelect={() => setSelectedId(s.id)}
                      onToggle={() => updateSection(s.id, { visible: !s.visible })}
                      onDelete={() => removeSection(s.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <AddSectionMenu onAdd={addSection} existing={sections.map((s) => s.section_type)} />
          </div>

          <div className="paper-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-wine flex items-center gap-1.5"><Palette className="h-3 w-3" /> Colors</p>
            <p className="text-xs text-muted-foreground mt-1">Override the template palette.</p>
            <div className="mt-3 space-y-2">
              {(["bg", "ink", "accent", "soft"] as const).map((k) => (
                <label key={k} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{k === "bg" ? "background" : k}</span>
                  <input type="color" value={palette[k]} onChange={(e) => setPalette(k, e.target.value)}
                    className="h-7 w-14 rounded border border-line bg-transparent cursor-pointer" />
                </label>
              ))}
            </div>
            <button onClick={resetPalette} className="mt-3 text-xs text-muted-foreground hover:text-wine underline">Reset to template</button>
          </div>
        </div>

        {/* RIGHT: preview + selected editor */}
        <div className="space-y-4">
          {selected ? (
            <SectionEditor
              key={selected.id}
              section={selected}
              weddingId={wedding.id}
              onChange={(patch) => updateSection(selected.id, patch)}
            />
          ) : (
            <div className="paper-card p-6 text-sm text-muted-foreground">
              Select a section on the left to edit its content and photo.
            </div>
          )}

          <div className="paper-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-line text-[10px] uppercase tracking-widest text-wine">Live preview</div>
            <div className="max-h-[70vh] overflow-y-auto">
              <SitePreview wedding={wedding} sections={sections} palette={palette} template={template} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SortableSectionRow({ section, selected, onSelect, onToggle, onDelete }: {
  section: Section; selected: boolean; onSelect: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const def = SECTION_LIBRARY.find((s) => s.type === section.section_type);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-1 rounded-2xl px-2 py-1.5 text-sm ${selected ? "bg-wine text-pearl" : "hover:bg-stone"}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-60 hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onSelect} className="flex-1 text-left truncate">
        {def?.label ?? section.section_type}
      </button>
      <button onClick={onToggle} className="p-1 opacity-60 hover:opacity-100" title={section.visible ? "Hide" : "Show"}>
        {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDelete} className="p-1 opacity-60 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function AddSectionMenu({ onAdd, existing }: { onAdd: (t: SectionType) => void; existing: SectionType[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-line py-2 text-xs hover:border-wine hover:text-wine">
        <Plus className="h-3.5 w-3.5" /> Add section
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {SECTION_LIBRARY.map((def) => (
            <button key={def.type} onClick={() => { onAdd(def.type); setOpen(false); }}
              className="text-left text-xs rounded-xl border border-line px-3 py-2 hover:border-wine hover:bg-cream">
              {def.label}
              {existing.includes(def.type) && <span className="ml-1 text-[9px] text-muted-foreground">·added</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionEditor({ section, weddingId, onChange }: {
  section: Section; weddingId: string; onChange: (patch: Partial<Section>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const def = SECTION_LIBRARY.find((s) => s.type === section.section_type)!;

  const setField = (key: string, value: any) =>
    onChange({ content: { ...section.content, [key]: value } });

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${weddingId}/website/${section.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-assets").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("wedding-assets").getPublicUrl(path);
    onChange({ image_url: data.publicUrl });
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <SectionFields section={section} setField={setField} />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Section photo</p>
          <div className="relative aspect-[4/3] rounded-2xl border border-dashed border-line overflow-hidden bg-stone/40">
            {section.image_url ? (
              <img src={section.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No photo</div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-wine disabled:opacity-60">
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : section.image_url ? "Replace" : "Upload"}
            </button>
            {section.image_url && (
              <button onClick={() => onChange({ image_url: null })} className="text-xs text-muted-foreground hover:text-wine underline">Remove</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionFields({ section, setField }: { section: Section; setField: (k: string, v: any) => void }) {
  const c = section.content ?? {};
  const inp = "w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:border-wine";
  const label = (t: string) => <label className="block text-xs text-muted-foreground mb-1">{t}</label>;

  switch (section.section_type) {
    case "hero":
      return (
        <>
          <div>{label("Eyebrow")}<input className={inp} value={c.eyebrow ?? ""} onChange={(e) => setField("eyebrow", e.target.value)} /></div>
          <div>{label("Tagline")}<input className={inp} value={c.tagline ?? ""} onChange={(e) => setField("tagline", e.target.value)} /></div>
        </>
      );
    case "story":
    case "travel":
    case "registry":
    case "rsvp":
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <div>{label("Body")}<textarea rows={6} className={inp} value={c.body ?? ""} onChange={(e) => setField("body", e.target.value)} /></div>
        </>
      );
    case "events":
      return (
        <>
          <div>{label("Title")}<input className={inp} value={c.title ?? ""} onChange={(e) => setField("title", e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Events are pulled live from your Events page.</p>
        </>
      );
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
                <button onClick={() => setField("members", members.filter((_, x) => x !== i))} className="text-xs text-muted-foreground hover:text-wine">×</button>
              </div>
            ))}
            <button onClick={() => setField("members", [...members, { name: "", role: "" }])} className="text-xs text-wine hover:underline">+ Add member</button>
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
                <button onClick={() => setField("items", items.filter((_, x) => x !== i))} className="text-xs text-muted-foreground hover:text-wine">Remove</button>
              </div>
            ))}
            <button onClick={() => setField("items", [...items, { q: "", a: "" }])} className="text-xs text-wine hover:underline">+ Add question</button>
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

function SitePreview({ wedding, sections, palette, template }: {
  wedding: any; sections: Section[]; palette: any; template: any;
}) {
  const visible = sections.filter((s) => s.visible);
  return (
    <div style={{ background: palette.bg, color: palette.ink, fontFamily: `"${template.fonts.body}", sans-serif` }}>
      {visible.map((s) => (
        <RenderSection key={s.id} section={s} palette={palette} template={template} wedding={wedding} />
      ))}
      {visible.length === 0 && <div className="p-10 text-center text-sm">All sections hidden.</div>}
    </div>
  );
}

export function RenderSection({ section, palette, template, wedding }: {
  section: Section; palette: any; template: any; wedding: any;
}) {
  const c = section.content ?? {};
  const displayFont = { fontFamily: `"${template.fonts.display}", serif` };
  switch (section.section_type) {
    case "hero":
      return (
        <section className="px-6 py-24 text-center" style={{ background: section.image_url ? undefined : palette.bg }}>
          {section.image_url && (
            <div className="mx-auto max-w-3xl aspect-[16/10] rounded-3xl overflow-hidden mb-8">
              <img src={section.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accent }}>{c.eyebrow || "Together with their families"}</p>
          <h1 className="mt-6" style={{ ...displayFont, fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1 }}>
            {wedding.partner_a}<br /><span style={{ color: palette.accent }}>&</span><br />{wedding.partner_b}
          </h1>
          {c.tagline && <p className="mt-6 text-sm opacity-70">{c.tagline}</p>}
        </section>
      );
    case "story":
    case "travel":
    case "registry":
    case "rsvp":
      return (
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 style={displayFont} className="text-3xl md:text-4xl mb-4">{c.title}</h2>
          {section.image_url && <img src={section.image_url} alt="" className="rounded-2xl mb-4 w-full max-h-96 object-cover" />}
          <p className="whitespace-pre-line opacity-80 leading-relaxed">{c.body}</p>
        </section>
      );
    case "events":
      return (
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 style={displayFont} className="text-3xl md:text-4xl mb-6 text-center">{c.title || "Celebrations"}</h2>
          <p className="text-center text-xs opacity-60">Events sync from your event list on the live site.</p>
        </section>
      );
    case "gallery": {
      const images: string[] = c.images ?? [];
      const all = section.image_url ? [section.image_url, ...images] : images;
      return (
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 style={displayFont} className="text-3xl md:text-4xl mb-6 text-center">{c.title || "Moments"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {all.map((src, i) => <img key={i} src={src} alt="" className="aspect-square object-cover rounded-2xl" />)}
            {all.length === 0 && <p className="col-span-full text-center text-xs opacity-60">Add photo URLs or upload one for this section.</p>}
          </div>
        </section>
      );
    }
    case "party": {
      const members: { name: string; role: string }[] = c.members ?? [];
      return (
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 style={displayFont} className="text-3xl md:text-4xl mb-6 text-center">{c.title || "Wedding party"}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map((m, i) => (
              <div key={i} className="text-center rounded-2xl p-4" style={{ background: palette.soft }}>
                <p style={displayFont} className="text-xl">{m.name}</p>
                <p className="text-xs opacity-70 mt-1">{m.role}</p>
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
          <h2 style={displayFont} className="text-3xl md:text-4xl mb-6 text-center">{c.title || "FAQ"}</h2>
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
          <p style={displayFont} className="text-2xl md:text-3xl max-w-2xl mx-auto leading-snug">"{c.text}"</p>
          {c.author && <p className="mt-4 text-xs opacity-60 uppercase tracking-widest">— {c.author}</p>}
        </section>
      );
    default:
      return null;
  }
}
