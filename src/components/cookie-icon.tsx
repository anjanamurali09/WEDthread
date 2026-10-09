import { useId } from "react";

// A small, friendly cookie in the brand yellow with navy chips. On a loop it gets eaten bite by bite, crumbs
// fall away, and a fresh cookie pops back in. The bites are drawn in the banner's own background colour (the
// banner is a plain surface), which keeps the animation reliable in every browser. With reduced motion it
// stays a still cookie with one bite out of it.
const BITES = [
  { cx: 40, cy: 9, r: 8 },
  { cx: 45, cy: 25, r: 6.5 },
  { cx: 9, cy: 9, r: 7.5 },
  { cx: 8, cy: 37, r: 7.5 },
];
const CRUMBS = [
  [{ x: 36, y: 14, dx: 3 }, { x: 40, y: 17, dx: 7 }, { x: 33, y: 12, dx: -1 }],
  [{ x: 41, y: 25, dx: 6 }, { x: 38, y: 30, dx: 2 }, { x: 43, y: 21, dx: 9 }],
  [{ x: 13, y: 13, dx: -3 }, { x: 10, y: 16, dx: -7 }, { x: 16, y: 11, dx: 1 }],
  [{ x: 12, y: 35, dx: -4 }, { x: 15, y: 40, dx: -1 }, { x: 10, y: 33, dx: -8 }],
];

export function CookieIcon({ className = "h-12 w-12" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={`${className} overflow-visible`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`round-${id}`}><circle cx="24" cy="25" r="20" /></clipPath>
      </defs>
      <g className="cookie-eat-body">
        <circle cx="24" cy="25" r="20" fill="#F2C94C" />
        <circle cx="23" cy="24" r="19" fill="#FFE08A" />
        <path d="M9 17.5C11 11.5 16.5 8 22 7.5" fill="none" stroke="#FFF3C4" strokeWidth="2.2" strokeLinecap="round" />
        <g fill="#243746">
          <ellipse cx="17" cy="20" rx="2.6" ry="2.2" transform="rotate(-20 17 20)" />
          <ellipse cx="30" cy="25" rx="2.7" ry="2.3" transform="rotate(25 30 25)" />
          <ellipse cx="20" cy="33" rx="2.5" ry="2.1" transform="rotate(10 20 33)" />
          <ellipse cx="33" cy="35.5" rx="2.2" ry="1.9" transform="rotate(-15 33 35.5)" />
          <ellipse cx="11.5" cy="28.5" rx="1.9" ry="1.6" transform="rotate(30 11.5 28.5)" />
        </g>
        {BITES.map((b, i) => (
          <circle key={i} className={`cookie-bite cookie-bite-${i + 1}`} cx={b.cx} cy={b.cy} r={b.r} fill="var(--paper, #FFFEFB)" />
        ))}
      </g>
      {CRUMBS.map((group, i) => group.map((c, j) => (
        <circle key={`${i}-${j}`} className={`cookie-crumb cookie-crumb-${i + 1}`} cx={c.x} cy={c.y} r="1.5" fill="#E8B93C"
          style={{ ["--dx" as string]: `${c.dx}px` }} />
      )))}
    </svg>
  );
}
