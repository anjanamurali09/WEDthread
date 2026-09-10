import { useRef } from "react";

// Drag-to-place focal point picker over a photo shown at its natural aspect
// ratio (object-contain) inside a fixed-aspect frame — used anywhere a photo
// gets cropped by object-cover elsewhere (website sections, the couple's
// dashboard photo) and the person uploading it should choose which part
// stays visible once that crop happens.
export function FocalPointPicker({ src, x, y, onChange }: { src: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef({ w: 4, h: 3 });
  const draggingRef = useRef(false);

  const updateFromPoint = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { w: nw, h: nh } = naturalRef.current;
    const containerAspect = rect.width / rect.height;
    const imageAspect = nw / nh;
    let renderedWidth: number, renderedHeight: number, offsetX: number, offsetY: number;
    if (imageAspect > containerAspect) {
      renderedWidth = rect.width;
      renderedHeight = renderedWidth / imageAspect;
      offsetX = 0;
      offsetY = (rect.height - renderedHeight) / 2;
    } else {
      renderedHeight = rect.height;
      renderedWidth = renderedHeight * imageAspect;
      offsetY = 0;
      offsetX = (rect.width - renderedWidth) / 2;
    }
    const localX = clientX - rect.left - offsetX;
    const localY = clientY - rect.top - offsetY;
    onChange(
      Math.round(Math.min(100, Math.max(0, (localX / renderedWidth) * 100))),
      Math.round(Math.min(100, Math.max(0, (localY / renderedHeight) * 100))),
    );
  };

  return (
    <div ref={containerRef}
      className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-line bg-stone/60 cursor-crosshair select-none touch-none"
      onPointerDown={(e) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); updateFromPoint(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (draggingRef.current) updateFromPoint(e.clientX, e.clientY); }}
      onPointerUp={() => { draggingRef.current = false; }}>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        onLoad={(e) => { naturalRef.current = { w: e.currentTarget.naturalWidth || 4, h: e.currentTarget.naturalHeight || 3 }; }} />
      <div className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-wine shadow-md pointer-events-none"
        style={{ left: `${x}%`, top: `${y}%` }} />
    </div>
  );
}

// content.focalX/focalY (0-100, default 50/50 = centered) — this is what lets
// a couple choose which part of a photo stays visible once object-cover
// crops it to whatever frame it's shown in.
export function focalPosition(content: { focalX?: number; focalY?: number } | undefined) {
  return { objectPosition: `${content?.focalX ?? 50}% ${content?.focalY ?? 50}%` };
}
