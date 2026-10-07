import { cn } from "@/lib/utils";

// The WedThread wordmark: "WED" in bold Didot, "thread" in italic Snell Roundhand,
// both the same font-size (the visual size difference between a caps serif and a
// lowercase script at matched font-size is expected — that's how the reference mark
// was drawn). Didot and Snell Roundhand are classic macOS system fonts, not
// freely-licensed web fonts we can legally embed — declaring them first renders
// correctly wherever they're actually installed (Mac/Safari), and falls back to the
// closest freely-licensed Google Fonts equivalents (Bodoni Moda, Mrs Saint Delafield)
// everywhere else, so the mark still reads as intentional rather than falling back
// to a generic system serif/cursive.
const DIDOT_STACK = '"Didot", "Bodoni Moda", "Didot LT STD", Georgia, serif';
const SNELL_STACK = '"Snell Roundhand", "Mrs Saint Delafield", "Segoe Script", cursive';

export function Logo({ className, sizeClassName = "text-2xl", style }: { className?: string; sizeClassName?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn("inline-flex items-baseline text-wine select-none", sizeClassName, className)} style={style}>
      <span style={{ fontFamily: DIDOT_STACK, fontWeight: 700 }}>WED</span>
      <span style={{ fontFamily: SNELL_STACK, fontStyle: "italic", fontWeight: 400 }}>thread</span>
    </span>
  );
}

// Sidebar-collapsed state: just the initial, same weight/face as the "WED" half.
export function LogoMark({ className, sizeClassName = "text-2xl" }: { className?: string; sizeClassName?: string }) {
  return (
    <span className={cn("text-wine select-none", sizeClassName, className)} style={{ fontFamily: DIDOT_STACK, fontWeight: 700 }}>
      W
    </span>
  );
}
