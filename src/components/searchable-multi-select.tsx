import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

// Same trigger + panel shape as MultiSelectDropdown, plus a search box and an
// optional "Add "X"" row for when the option a user wants isn't in the list
// yet — used for vendor categories, where the list is open-ended and a
// vendor should never be blocked from picking what they actually do.
export function SearchableMultiSelect({
  selected, onChange, options, placeholder, className, onCreate, createLabel = "Add", inline = false,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  options: SelectOption[];
  placeholder: string;
  className?: string;
  // Called when the user picks "Add "X"" for a query that matches nothing —
  // should create the option (e.g. insert a new category row) and return it,
  // or null on failure. Omit to disable the "add new" affordance entirely.
  onCreate?: (name: string) => Promise<SelectOption | null>;
  createLabel?: string;
  // When true, the open panel sits in normal document flow below the
  // trigger and pushes whatever comes after it down, instead of floating
  // on top and covering it. For a field stacked in a vertical form (its
  // tall option list would otherwise cover the next few fields); leave
  // false for a filter-bar dropdown, where floating over the results below
  // is the expected, standard behavior.
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline mode has no full-screen click-catcher (it would block the rest
  // of the form while open), so it needs its own outside-click handling.
  useEffect(() => {
    if (!inline || !open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [inline, open]);

  // Flip the panel above the trigger when there isn't enough room below —
  // this dropdown's panel (search box + option list) can run tall, and
  // without this it silently overflows past the bottom of the viewport
  // instead of staying reachable. Not relevant in inline mode, where the
  // panel always sits below the trigger in normal flow.
  const handleToggle = () => {
    if (!inline && !open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 320 && rect.top > 320);
    }
    setOpen((v) => !v);
  };

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const exactMatch = options.some((o) => o.label.toLowerCase() === q);
  const canCreate = !!onCreate && q.length > 0 && !exactMatch;

  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? placeholder
    : `${selected.length} selected`;

  const handleCreate = async () => {
    if (!onCreate) return;
    const name = query.trim();
    setCreating(true);
    const created = await onCreate(name);
    setCreating(false);
    if (created) {
      onChange([...selected, created.value]);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button ref={triggerRef} type="button" onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-pearl text-left pl-4 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay cursor-pointer">
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          {!inline && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
          <div className={cn(
            "z-20 rounded-2xl border border-line bg-pearl shadow-lg p-1.5",
            inline ? "mt-2" : cn("absolute left-0 right-0", openUpward ? "bottom-full mb-2" : "top-full mt-2"),
          )}>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-clay" />
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((o) => {
                const checked = selected.includes(o.value);
                return (
                  <button type="button" key={o.value} onClick={() => toggle(o.value)}
                    className="w-full text-left rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="truncate">{o.label}</span>
                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded border", checked ? "bg-ink border-ink" : "border-line")}>
                      {checked && <Check className="h-3 w-3 text-paper" />}
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && !canCreate && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matches.</p>
              )}
            </div>
            {canCreate && (
              <button type="button" onClick={handleCreate} disabled={creating}
                className="w-full text-left rounded-xl hover:bg-blush-soft cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-cherry border-t border-line/60 mt-1 pt-2 disabled:opacity-60">
                <Plus className="h-3.5 w-3.5 shrink-0" /> {creating ? "Adding…" : `${createLabel} "${query.trim()}"`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
