import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dropdown } from "@/components/dropdown";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type FieldType = "text" | "number" | "textarea" | "date" | "select";
type LeadField = { id: string; label: string; field_type: FieldType; options: string[]; required: boolean; sort_order: number };

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long text" },
  { value: "date", label: "Date" },
  { value: "select", label: "Multiple choice" },
];

type SuggestedField = { label: string; field_type: FieldType; required?: boolean; options?: string[] };

// One lead form per vendor_service — or, when vendorServiceId is null (a
// venue, which has no sub-services), one lead form per business. The first
// time this is opened for one with no form yet, it's auto-created —
// pre-filled with the category's suggested_lead_fields if there are any,
// otherwise empty — so the vendor/venue is always editing something real,
// not a draft that might vanish.
export function VendorLeadFormBuilder({ businessId, vendorServiceId, categoryId }: {
  businessId: string; vendorServiceId: string | null; categoryId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [leadFormId, setLeadFormId] = useState<string | null>(null);
  const [fields, setFields] = useState<LeadField[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    (async () => {
      const existingQuery = vendorServiceId
        ? supabase.from("lead_forms").select("id").eq("vendor_service_id", vendorServiceId).maybeSingle()
        : supabase.from("lead_forms").select("id").eq("business_id", businessId).is("vendor_service_id", null).maybeSingle();
      const { data: existing } = await existingQuery;
      if (existing) {
        setLeadFormId(existing.id);
        const { data: rows } = await supabase.from("lead_form_fields").select("id,label,field_type,options,required,sort_order").eq("lead_form_id", existing.id).order("sort_order");
        setFields((rows ?? []).map((r) => ({ ...r, options: (r.options as string[]) ?? [] })) as LeadField[]);
        setLoading(false);
        return;
      }

      // First time — create the form, pre-filled from the category's
      // suggested fields when there are any.
      const { data: form, error: formError } = await supabase.from("lead_forms").insert({ business_id: businessId, vendor_service_id: vendorServiceId }).select("id").single();
      if (formError?.code === "23505") {
        // Lost a race against another near-simultaneous first-open (e.g. a
        // double-invoked effect) — someone else's insert already won under
        // the one-lead-form-per-service/business unique index. Load theirs
        // instead of erroring.
        const { data: winner } = await existingQuery;
        if (winner) {
          setLeadFormId(winner.id);
          const { data: rows } = await supabase.from("lead_form_fields").select("id,label,field_type,options,required,sort_order").eq("lead_form_id", winner.id).order("sort_order");
          setFields((rows ?? []).map((r) => ({ ...r, options: (r.options as string[]) ?? [] })) as LeadField[]);
        }
        setLoading(false);
        return;
      }
      if (formError || !form) { toast.error(formError?.message ?? "Could not create lead form"); setLoading(false); return; }
      setLeadFormId(form.id);

      let suggested: SuggestedField[] = [];
      if (categoryId) {
        const { data: cat } = await supabase.from("vendor_categories").select("suggested_lead_fields").eq("id", categoryId).maybeSingle();
        suggested = ((cat?.suggested_lead_fields as SuggestedField[] | null) ?? []);
      }
      if (suggested.length > 0) {
        const { data: inserted, error: fieldsError } = await supabase.from("lead_form_fields")
          .insert(suggested.map((s, i) => ({
            lead_form_id: form.id, label: s.label, field_type: s.field_type,
            options: s.options ?? [], required: s.required ?? false, sort_order: i,
          })))
          .select("id,label,field_type,options,required,sort_order");
        if (fieldsError) toast.error(fieldsError.message);
        setFields((inserted ?? []).map((r) => ({ ...r, options: (r.options as string[]) ?? [] })) as LeadField[]);
      }
      setLoading(false);
    })();
  }, [vendorServiceId, businessId, categoryId]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(fields, oldIdx, newIdx).map((f, i) => ({ ...f, sort_order: i }));
    setFields(reordered);
    for (const f of reordered) {
      await supabase.from("lead_form_fields").update({ sort_order: f.sort_order }).eq("id", f.id);
    }
  };

  const addField = async (draft: { label: string; field_type: FieldType; options: string[]; required: boolean }) => {
    if (!leadFormId) return;
    const { data, error } = await supabase.from("lead_form_fields")
      .insert({ lead_form_id: leadFormId, label: draft.label, field_type: draft.field_type, options: draft.options, required: draft.required, sort_order: fields.length })
      .select("id,label,field_type,options,required,sort_order").single();
    if (error) return toast.error(error.message);
    setFields((prev) => [...prev, { ...data, options: (data.options as string[]) ?? [] } as LeadField]);
  };

  const updateField = async (id: string, patch: Partial<Pick<LeadField, "label" | "field_type" | "options" | "required">>) => {
    const { error } = await supabase.from("lead_form_fields").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = async (id: string) => {
    const { error } = await supabase.from("lead_form_fields").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">
        This is what a couple fills in when they enquire about this service. Drag to reorder.
      </p>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">No fields yet — add your first one below.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2 mb-4">
              {fields.map((f) => (
                <FieldRow key={f.id} field={f} onSave={(patch) => updateField(f.id, patch)} onRemove={() => removeField(f.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <AddFieldForm onAdd={addField} />
    </div>
  );
}

function FieldRow({ field, onSave, onRemove }: {
  field: LeadField; onSave: (patch: { label: string; field_type: FieldType; options: string[]; required: boolean }) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-2xl border border-line bg-paper p-4">
        <AddFieldForm
          initial={field}
          submitLabel="Save"
          onAdd={(draft) => { onSave(draft); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
      <button type="button" {...attributes} {...listeners} className="text-muted-foreground hover:text-ink cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{field.label}{field.required && <span className="text-cherry ml-1">*</span>}</p>
        <p className="text-xs text-muted-foreground capitalize">{FIELD_TYPE_OPTIONS.find((o) => o.value === field.field_type)?.label ?? field.field_type}</p>
      </div>
      <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-clay cursor-pointer shrink-0"><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function AddFieldForm({ initial, submitLabel = "Add field", onAdd, onCancel }: {
  initial?: LeadField;
  submitLabel?: string;
  onAdd: (draft: { label: string; field_type: FieldType; options: string[]; required: boolean }) => void;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(initial?.field_type ?? "text");
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join(", "));
  const [required, setRequired] = useState(initial?.required ?? false);

  const submit = () => {
    if (!label.trim()) return toast.error("Give the field a label.");
    const options = fieldType === "select" ? optionsText.split(",").map((o) => o.trim()).filter(Boolean) : [];
    if (fieldType === "select" && options.length === 0) return toast.error("Add at least one option.");
    onAdd({ label: label.trim(), field_type: fieldType, options, required });
    if (!initial) { setLabel(""); setFieldType("text"); setOptionsText(""); setRequired(false); }
  };

  return (
    <div className={cn(!initial && "rounded-2xl border border-dashed border-line p-4", "grid gap-3")}>
      <div className="grid md:grid-cols-2 gap-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Field label, e.g. Number of guests"
          className="rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        <Dropdown value={fieldType} onChange={(v) => setFieldType(v as FieldType)} placeholder="Field type" options={FIELD_TYPE_OPTIONS} />
      </div>
      {fieldType === "select" && (
        <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Options, comma separated"
          className="rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      )}
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-full border border-line p-0.5">
          {[{ v: false, label: "Optional" }, { v: true, label: "Required" }].map((o) => (
            <button key={String(o.v)} type="button" onClick={() => setRequired(o.v)}
              className={cn("rounded-full px-3 py-1 text-sm cursor-pointer", required === o.v ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={submit} className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-2 text-sm hover:bg-clay cursor-pointer">
          {!initial && <Plus className="h-3.5 w-3.5" />} {submitLabel}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-ink cursor-pointer">Cancel</button>}
      </div>
    </div>
  );
}
