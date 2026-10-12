import { cn } from "@/lib/utils";
import { MARK, WORDMARK } from "@/components/logo-paths";

// The WEDthread wordmark: "WED" in bold Didot, "thread" in Snell Roundhand script.
//
// It is drawn as fixed outlines (see logo-paths.ts), not typed as text. Didot and Snell Roundhand exist only
// on Apple computers, so as text the logo looked different on Windows, Android and anywhere else; as a drawing
// it is identical for everyone. It scales with the surrounding font size (the `sizeClassName` text classes) and
// takes its colour from the text colour, so it works on light and dark backgrounds exactly as before.
export function Logo({ className, sizeClassName = "text-2xl", style }: { className?: string; sizeClassName?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn("inline-flex items-baseline text-wine select-none", sizeClassName, className)} style={style} role="img" aria-label="WEDthread">
      <svg viewBox={WORDMARK.viewBox} fill="currentColor" aria-hidden="true" focusable="false"
        style={{ width: `${WORDMARK.widthEm}em`, height: `${WORDMARK.heightEm}em`, verticalAlign: `${-WORDMARK.descentEm}em`, overflow: "visible" }}>
        <use href="#wt-wed" />
        <use href="#wt-thread" />
      </svg>
    </span>
  );
}

// The outlines are written into the page once, here, and every Logo points at them with <use>. Repeating the
// full drawing for each logo on a page (header, footer, loading screen) made the page's code several times
// larger than it needed to be. Rendered once at the top of the page by the root layout.
export function LogoSprite() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <path id="wt-wed" d={WORDMARK.wed} />
        <path id="wt-thread" d={WORDMARK.thread} />
      </defs>
    </svg>
  );
}

// Sidebar-collapsed state: just the initial, the same drawn "W" as the wordmark.
export function LogoMark({ className, sizeClassName = "text-2xl" }: { className?: string; sizeClassName?: string }) {
  return (
    <span className={cn("inline-flex items-baseline text-wine select-none", sizeClassName, className)} role="img" aria-label="WEDthread">
      <svg viewBox={MARK.viewBox} fill="currentColor" aria-hidden="true" focusable="false"
        style={{ width: `${MARK.widthEm}em`, height: `${MARK.heightEm}em`, verticalAlign: `${-MARK.descentEm}em`, overflow: "visible" }}>
        <path d={MARK.w} />
      </svg>
    </span>
  );
}
