import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Shared by the venue and vendor detail pages' Gallery sections — a
// horizontally scrolling photo strip with small prev/next arrows, instead
// of a full grid.
export function ScrollGallery({ items }: { items: { id: string; url: string }[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scrollerRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((m) => (
          <div key={m.id} className="shrink-0 w-64 md:w-80 aspect-square snap-start rounded-2xl overflow-hidden border border-line">
            <img src={m.url} className="w-full h-full object-cover" alt="" />
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-pearl border border-line shadow-md hover:bg-stone cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-pearl border border-line shadow-md hover:bg-stone cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
