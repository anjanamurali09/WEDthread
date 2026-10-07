import { useState } from "react";
import { Plus } from "lucide-react";

// A fixed set of options, multi-select, toggled by clicking a chip — for
// closed vocabularies like a venue's type_of_space, where the marketplace
// directory later filters on the exact same values. With `allowCustom`, a
// value already selected but missing from `options` (a previously-added
// custom one) still renders as its own chip — options isn't the only source
// of truth once custom entries exist.
export function ChipToggleGroup({ options, selected, onChange, allowCustom = false }: {
  options: string[]; selected: string[]; onChange: (next: string[]) => void; allowCustom?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  const addCustom = () => {
    const value = draft.trim();
    if (value && !selected.includes(value)) onChange([...selected, value]);
    setDraft("");
    setAdding(false);
  };

  const allOptions = [...options, ...selected.filter((s) => !options.includes(s))];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allOptions.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`rounded-full px-3.5 py-1.5 text-sm capitalize cursor-pointer border transition-colors ${
              active ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone"
            }`}>
            {opt}
          </button>
        );
      })}
      {allowCustom && (
        adding ? (
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={addCustom}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            placeholder="Type and press Enter"
            className="rounded-full border border-line px-3.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay w-40" />
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm border border-dashed border-line text-muted-foreground hover:border-clay hover:text-ink cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Add custom
          </button>
        )
      )}
    </div>
  );
}
