import { useState } from "react";
import { X, Plus } from "lucide-react";

// Free-add tag list — for open-ended lists like a venue's included/excluded
// facilities, where a fixed preset would be too restrictive.
export function TagListInput({ tags, onChange, placeholder }: {
  tags: string[]; onChange: (next: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
          className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
        />
        <button type="button" onClick={add} className="rounded-full border border-line px-4 py-2.5 text-sm hover:bg-stone cursor-pointer shrink-0">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3 py-1.5 text-sm">
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-cherry cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
