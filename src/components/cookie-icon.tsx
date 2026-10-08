import { useId } from "react";

// A small, friendly cookie in the brand yellow, with a bite taken out and navy chips.
export function CookieIcon({ className = "h-12 w-12" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* The bite: a few overlapping circles cut out of the top-right edge. */}
        <mask id={`bite-${id}`}>
          <rect width="48" height="48" fill="#fff" />
          <circle cx="39.5" cy="9.5" r="7.5" fill="#000" />
          <circle cx="44.5" cy="19" r="5" fill="#000" />
          <circle cx="31" cy="5" r="4.5" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#bite-${id})`}>
        <circle cx="24" cy="25" r="20" fill="#F2C94C" />
        <circle cx="23" cy="24" r="19" fill="#FFE08A" />
        <path d="M9 17.5C11 11.5 16.5 8 22 7.5" fill="none" stroke="#FFF3C4" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g fill="#243746">
        <ellipse cx="17" cy="20" rx="2.6" ry="2.2" transform="rotate(-20 17 20)" />
        <ellipse cx="30" cy="25" rx="2.7" ry="2.3" transform="rotate(25 30 25)" />
        <ellipse cx="20" cy="33" rx="2.5" ry="2.1" transform="rotate(10 20 33)" />
        <ellipse cx="33" cy="35.5" rx="2.2" ry="1.9" transform="rotate(-15 33 35.5)" />
        <ellipse cx="11.5" cy="28.5" rx="1.9" ry="1.6" transform="rotate(30 11.5 28.5)" />
      </g>
    </svg>
  );
}
