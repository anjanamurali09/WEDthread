import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isHexColor } from "@/components/custom-color";

export type SwatchItem = { key: string; label: string; help: string; value: string };

const withHash = (v: string) => (v.trim().startsWith("#") ? v.trim() : `#${v.trim()}`);
const sixDigit = (v: string) => (/^#[0-9a-f]{3}$/i.test(v) ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);
// Brand blues/yellows and a few neutrals, as quick starting points.
const QUICK = ["#FFFFFF", "#FDFCF7", "#F7F1E3", "#FFF2B2", "#FFE08A", "#7FA8D6", "#4A7CAD", "#243746", "#2E2E2E", "#E63950"];

function SwatchPopover({ value, onChange, children }: { value: string; onChange: (hex: string) => void; children: React.ReactNode }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-52 p-3 z-[70]">
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK.map((c) => (
            <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
              className={cn("h-6 w-6 rounded-full border cursor-pointer hover:scale-110 transition-transform", value.toLowerCase() === c.toLowerCase() ? "border-ink border-2" : "border-line")}
              style={{ background: c }} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input type="color" value={isHexColor(value) ? sixDigit(value) : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0" />
          <input value={text} spellCheck={false}
            onChange={(e) => { setText(e.target.value); const v = withHash(e.target.value); if (isHexColor(v)) onChange(v); }}
            onBlur={() => setText(isHexColor(withHash(text)) ? withHash(text) : value)}
            className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// A vertical stack of colour blocks (one per item) with their names beside them — each block
// opens a small picker. Same layout idea as Joy's "Site Artwork" / "Pages" colour groups.
export function SwatchGroup({ items, onChange }: { items: SwatchItem[]; onChange: (key: string, hex: string) => void }) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-300 flex flex-col">
        {items.map((it) => (
          <SwatchPopover key={it.key} value={it.value} onChange={(hex) => onChange(it.key, hex)}>
            <button type="button" aria-label={it.label} title={it.label} className="h-10 w-full cursor-pointer hover:brightness-95 transition" style={{ background: it.value }} />
          </SwatchPopover>
        ))}
      </div>
      <div className="flex flex-col">
        {items.map((it) => (
          <div key={it.key} className="flex h-10 items-center gap-2 text-sm">
            {it.label}
            <span title={it.help} className="text-muted-foreground"><CircleHelp className="h-3.5 w-3.5" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
