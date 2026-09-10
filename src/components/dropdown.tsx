import { useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

/* Generic overlay dropdown, matching the site's hand-rolled trigger + absolute
   panel + outside-click-catcher pattern (used elsewhere e.g. DependsOnPicker
   in rsvp-questions.tsx), so this never falls back to native <select>. */
export function Dropdown({ value, onChange, options, placeholder, className, footer, size = "md" }: {
  value: string; onChange: (v: string) => void; options: DropdownOption[]; placeholder: string; className?: string; footer?: ReactNode;
  /** "sm" is for compact, quick-glance controls (e.g. a settings popover) — every other call site keeps the default. */
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  const compact = size === "sm";
  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-pearl text-left focus:outline-none focus:ring-2 focus:ring-clay cursor-pointer",
          compact ? "pl-3 pr-2.5 py-1.5 text-xs" : "pl-4 pr-3 py-2.5 text-sm",
        )}>
        <span className={cn("truncate", !active && "text-muted-foreground")}>{active ? active.label : placeholder}</span>
        <ChevronDown className={cn("text-muted-foreground shrink-0 transition-transform", compact ? "h-3.5 w-3.5" : "h-4 w-4", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {options.map((o) => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full text-left rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2",
                  compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
                  value === o.value && "font-medium",
                )}>
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check className={cn("text-sage-deep shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />}
              </button>
            ))}
            {footer && <div className="pt-1 mt-1 border-t border-line/60">{footer}</div>}
          </div>
        </>
      )}
    </div>
  );
}
