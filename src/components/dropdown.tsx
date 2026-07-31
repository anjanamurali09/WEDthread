import { useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

/* Generic overlay dropdown, matching the site's hand-rolled trigger + absolute
   panel + outside-click-catcher pattern (used elsewhere e.g. DependsOnPicker
   in rsvp-questions.tsx), so this never falls back to native <select>. */
export function Dropdown({ value, onChange, options, placeholder, className, footer }: {
  value: string; onChange: (v: string) => void; options: DropdownOption[]; placeholder: string; className?: string; footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-pearl pl-4 pr-3 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-clay cursor-pointer">
        <span className={cn("truncate", !active && "text-muted-foreground")}>{active ? active.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {options.map((o) => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2", value === o.value && "font-medium")}>
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check className="h-3.5 w-3.5 text-sage-deep shrink-0" />}
              </button>
            ))}
            {footer && <div className="pt-1 mt-1 border-t border-line/60">{footer}</div>}
          </div>
        </>
      )}
    </div>
  );
}
