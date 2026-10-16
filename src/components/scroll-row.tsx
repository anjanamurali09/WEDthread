import { Children, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Three cards across on a desktop row, about one and a bit on a phone.
export const THREE_ACROSS = "w-[78%] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]";

// One line of cards that scrolls sideways, with arrows. Used for venues, vendors and reviews so every
// section spans the same full width as the call-to-action bars. Each child is one card; `cardClass`
// sets its width (about four across on a wide screen, fewer on smaller ones).
export function ScrollRow({ title, heading, action, cardClass, contained = false, children }: {
  title?: string;
  // A larger heading (can include controls, like an editable location) with an optional button on the right.
  heading?: React.ReactNode;
  action?: React.ReactNode;
  cardClass: string;
  contained?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const t = setTimeout(update, 600); // cards and photos finish loading after first paint
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); clearTimeout(t); };
  }, [children]);

  // The row fades in as it scrolls into view. It does this itself, so it also appears on pages that have no
  // page-wide reveal (the venue and vendor pages), where it would otherwise stay invisible and leave a blank gap.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const show = () => { el.dataset.visible = "true"; };
    if (typeof IntersectionObserver === "undefined") { show(); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { show(); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px 200px 0px" });
    io.observe(el);
    const fallback = setTimeout(show, 1500);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  // One card at a time (card width plus the 16px gap).
  const scrollBy = (dir: 1 | -1) => { const el = ref.current; const card = el?.firstElementChild as HTMLElement | null; if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" }); };
  const arrow = "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper/95 text-[#243746] shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[#FFE08A] motion-reduce:transition-none";
  const hidden = "pointer-events-none scale-90 opacity-0";
  const canScroll = !(edge.start && edge.end);

  return (
    // The row breaks out of the page margins so cards run edge to edge; its own padding lines the first
    // card up with the rest of the page. The arrows sit on the left and right of the cards.
    <div ref={wrapRef} data-reveal className={contained ? "mx-auto max-w-6xl" : "-mx-6 md:-mx-12"}>
      {title && (
        <p className={cn("mb-3 text-sm uppercase tracking-widest text-[#7FA8D6]", !contained && "px-6 md:px-12")}>{title}</p>
      )}
      {heading && (
        <div className={cn("mb-4 flex items-center justify-between gap-4", !contained && "px-6 md:px-12")}>
          <h2 className="font-serif text-2xl md:text-3xl text-[#243746]">{heading}</h2>
          {action}
        </div>
      )}
      <div className="relative">
        {canScroll && (
          <>
            <button type="button" aria-label="Scroll left" tabIndex={edge.start ? -1 : 0} onClick={() => scrollBy(-1)} data-static
              className={cn(arrow, "-left-3 md:-left-5", contained && "xl:-left-[3.25rem] xl:border-transparent xl:bg-transparent xl:shadow-none xl:hover:bg-transparent xl:hover:text-[#7FA8D6]", edge.start && hidden)}><ChevronLeft className={cn("h-4 w-4", contained && "xl:h-7 xl:w-7")} strokeWidth={contained ? 1.5 : 2} /></button>
            <button type="button" aria-label="Scroll right" tabIndex={edge.end ? -1 : 0} onClick={() => scrollBy(1)} data-static
              className={cn(arrow, "-right-3 md:-right-5", contained && "xl:-right-[3.25rem] xl:border-transparent xl:bg-transparent xl:shadow-none xl:hover:bg-transparent xl:hover:text-[#7FA8D6]", edge.end && hidden)}><ChevronRight className={cn("h-4 w-4", contained && "xl:h-7 xl:w-7")} strokeWidth={contained ? 1.5 : 2} /></button>
          </>
        )}
        <div ref={ref} className={cn("no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2", !contained && "px-6 md:px-12 scroll-px-6 md:scroll-px-12")}>
          {Children.toArray(children).map((c, i) => <div key={i} className={cn("scroll-row-card shrink-0 snap-start [&>*]:h-full", cardClass)}>{c}</div>)}
        </div>
      </div>
    </div>
  );
}
