import { useEffect, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const isHexColor = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
const withHash = (v: string) => (v.trim().startsWith("#") ? v.trim() : `#${v.trim()}`);
// <input type="color"> only accepts 6-digit hex, so expand #abc to #aabbcc for it.
const sixDigit = (v: string) => (/^#[0-9a-f]{3}$/i.test(v) ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);

// The one "Custom" option every colour choice in the app ends with: a swatch that opens a
// small picker with a native colour wheel plus a hex/HTML code field. Shows a rainbow
// until a custom colour is actually in use, then fills with that colour.
export function CustomColorButton({ value, active, onChange, className, title = "Custom colour" }: {
  value: string; active?: boolean; onChange: (hex: string) => void; className?: string; title?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const shown = active && isHexColor(value);
  const apply = (raw: string) => {
    const v = withHash(raw);
    if (isHexColor(v)) onChange(v);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title={title} aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={cn("h-5 w-5 rounded-full border cursor-pointer shrink-0 hover:scale-110 transition-transform", shown ? "border-ink border-2" : "border-line", className)}
          style={{ background: shown ? value : "conic-gradient(#f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)" }} />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 z-[70]" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Custom colour</p>
        <div className="mt-2 flex items-center gap-2">
          <input type="color" value={isHexColor(value) ? sixDigit(value) : "#7fa8d6"}
            onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0" />
          <input value={text} placeholder="#FADADD" spellCheck={false}
            onChange={(e) => { setText(e.target.value); apply(e.target.value); }}
            onBlur={() => setText(isHexColor(withHash(text)) ? withHash(text) : value)}
            className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Hex code, e.g. #FADADD</p>
      </PopoverContent>
    </Popover>
  );
}
