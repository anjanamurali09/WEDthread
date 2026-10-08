import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Sits inside a card that's itself a <Link> — arrow clicks must never bubble
// into that link's navigation, only change the active photo.
export function PhotoCarousel({ photos, className }: { photos: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  // Only the first photo loads with the page (and only once the card is near the screen). The rest download as
  // soon as someone hovers, touches or tabs onto the card, so flipping through is instant without every card
  // pulling all its photos up front.
  const [warm, setWarm] = useState(false);
  const warmUp = () => setWarm(true);

  const go = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + photos.length) % photos.length);
  };

  return (
    <div className={className ?? "relative aspect-[4/3] bg-stone overflow-hidden"}
      onPointerEnter={warmUp} onTouchStart={warmUp} onFocus={warmUp}>
      {photos.map((src, i) => (i === 0 || warm || i === index) && (
        <img key={src} src={src} alt="" decoding="async" loading={i === 0 ? "lazy" : "eager"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === index ? "opacity-100" : "opacity-0"}`} />
      ))}
      {photos.length > 1 && (
        <>
          <button type="button" onClick={(e) => go(e, -1)} aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-ink/50 text-paper opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={(e) => go(e, 1)} aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-ink/50 text-paper opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1">
            {photos.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-paper" : "bg-paper/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
