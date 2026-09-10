import type { ReactNode } from "react";

import decorMarigold from "@/assets/decor-marigold.jpg.asset.json";
import gardenParty from "@/assets/garden-party.jpg.asset.json";
import bridalParty from "@/assets/bridal-party.jpg.asset.json";
import caneChair from "@/assets/cane-chair.jpg.asset.json";

/* Curated photo library — carries the homepage oval-crop motif inside the app. */
export const EMPTY_PHOTOS = {
  marigold: { url: decorMarigold.url, alt: "Marigold garlands and greenery hanging from a wedding mandap ceiling", pos: "50% 60%" },
  garden:   { url: gardenParty.url,   alt: "Guests in pastel outfits gathered on a garden lawn at a wedding cocktail hour", pos: "50% 45%" },
  bridal:   { url: bridalParty.url,   alt: "Bride and groom laughing with the wedding party in embellished outfits", pos: "50% 35%" },
  cane:     { url: caneChair.url,     alt: "Rattan wedding chair with a hand fan and a green ribbon place setting", pos: "50% 80%" },
} as const;

export type PhotoKey = keyof typeof EMPTY_PHOTOS;

type Props = {
  photo: PhotoKey;
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode; // CTA buttons / tag row
  /** portrait = tall left photo + text right (default). landscape = wide top photo + text below. */
  variant?: "portrait" | "landscape" | "inline";
};

export function PhotoEmptyState({ photo, eyebrow, title, body, children, variant = "portrait" }: Props) {
  const p = EMPTY_PHOTOS[photo];

  if (variant === "landscape") {
    return (
      <section className="warm-wash rounded-[40px] border border-line/60 overflow-hidden">
        <div className="relative h-56 md:h-72 overflow-hidden">
          <div className="absolute inset-x-6 inset-y-4 oval-frame-tall shadow-xl">
            <img src={p.url} alt={p.alt} loading="lazy" className="w-full h-full object-cover" style={{ objectPosition: p.pos }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent" />
          </div>
        </div>
        <div className="px-6 md:px-12 pt-6 pb-10 text-center max-w-2xl mx-auto">
          {eyebrow && <p className="text-sm uppercase tracking-[0.3em] text-cherry">{eyebrow}</p>}
          <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">{title}</h3>
          {body && <p className="mt-3 text-sm text-ink leading-relaxed">{body}</p>}
          {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
        </div>
      </section>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-4 rounded-full warm-wash border border-line/60 p-2 pr-6">
        <div className="h-14 w-14 oval-frame-pill shrink-0">
          <img src={p.url} alt={p.alt} loading="lazy" className="w-full h-full object-cover" style={{ objectPosition: p.pos }} />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-lg leading-tight truncate">{title}</p>
          {body && <p className="text-sm text-ink truncate">{body}</p>}
        </div>
        {children && <div className="ml-auto flex gap-2 shrink-0">{children}</div>}
      </div>
    );
  }

  return (
    <section className="warm-wash rounded-[40px] border border-line/60 overflow-hidden grid md:grid-cols-5 items-stretch">
      <div className="md:col-span-2 relative p-6 md:p-8">
        <div className="oval-frame-tall h-64 md:h-80 shadow-xl">
          <img src={p.url} alt={p.alt} loading="lazy" className="w-full h-full object-cover" style={{ objectPosition: p.pos }} />
        </div>
        <span aria-hidden className="pointer-events-none absolute -bottom-4 -right-2 h-14 w-20 blob bg-sage-soft/70" />
        <span aria-hidden className="pointer-events-none absolute -top-3 left-2 h-10 w-14 blob-2 bg-blush-soft" />
      </div>
      <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-center">
        {eyebrow && <p className="text-sm uppercase tracking-[0.3em] text-cherry">{eyebrow}</p>}
        <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">{title}</h3>
        {body && <p className="mt-3 text-sm text-ink leading-relaxed max-w-md">{body}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

/** Small decorative oval photo used as a header ornament to break the stat-card-then-table monotony. */
export function OvalPhotoOrnament({ photo, className = "" }: { photo: PhotoKey; className?: string }) {
  const p = EMPTY_PHOTOS[photo];
  return (
    <div className={`oval-frame shadow-lg ring-1 ring-black/5 ${className}`}>
      <img src={p.url} alt={p.alt} loading="lazy" className="w-full h-full object-cover" style={{ objectPosition: p.pos }} />
    </div>
  );
}
