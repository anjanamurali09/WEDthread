import { Plus, X } from "lucide-react";

export type HeaderBodyItem = { header: string; body: string };

// Shared by "About" sections (header + description — e.g. "Getting there"
// with directions) and FAQ (question + answer) on the venue forms: same
// repeatable-card shape, just different labels/placeholders.
export function HeaderBodyListEditor({ items, onChange, headerLabel, bodyLabel, headerPlaceholder, bodyPlaceholder, addLabel }: {
  items: HeaderBodyItem[];
  onChange: (items: HeaderBodyItem[]) => void;
  headerLabel: string;
  bodyLabel: string;
  headerPlaceholder?: string;
  bodyPlaceholder?: string;
  addLabel: string;
}) {
  const update = (i: number, patch: Partial<HeaderBodyItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { header: "", body: "" }]);

  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="relative rounded-2xl border border-line p-4 grid gap-2">
          <button type="button" onClick={() => remove(i)} title="Remove"
            className="absolute top-3 right-3 text-muted-foreground hover:text-cherry cursor-pointer">
            <X className="h-4 w-4" />
          </button>
          <input value={it.header} onChange={(e) => update(i, { header: e.target.value })} placeholder={headerPlaceholder ?? headerLabel}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-clay" />
          <textarea value={it.body} onChange={(e) => update(i, { body: e.target.value })} rows={3} placeholder={bodyPlaceholder ?? bodyLabel}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted-foreground hover:border-clay hover:text-ink cursor-pointer">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}
