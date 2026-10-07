import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

// Same trigger + absolute-panel shape as Dropdown, but for "pick any number
// of these" instead of one value — e.g. price tiers where a couple might
// want $ and $$$ at once, not a contiguous range.
export function MultiSelectDropdown({ selected, onChange, options, placeholder, className }: {
  selected: string[]; onChange: (next: string[]) => void; options: DropdownOption[]; placeholder: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? placeholder
    : `${selected.length} selected`;

  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-pearl text-left pl-4 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay cursor-pointer">
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {options.map((o) => {
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
          </div>
        </>
      )}
    </div>
  );
}
