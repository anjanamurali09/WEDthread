import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

// Drag-to-pan + slider-to-zoom photo cropper, shown in a dialog. Renders the
// photo at a fixed preview size with object-fit:cover as the base crop, then
// layers a live translate+scale transform on top (translate outermost, so a
// screen-pixel drag tracks 1:1 regardless of zoom level). zoom/panX/panY are
// stored as-is (zoom a plain multiplier, pan as % of the image's own
// rendered box) so the exact same transform reproduces the crop at any
// actual display size — but object-cover's own base crop still depends on
// the FRAME's aspect ratio, so the preview only matches the real display
// 1:1 when the caller passes that real element's actual aspect ratio (see
// aspectRatio below); a guessed/fixed preview shape will crop differently
// than what actually shows. Shared by every couple-photo spot in the app
// (dashboard mindmap's circular avatar, the Events page's rectangular
// panel, …) — only the preview frame's shape differs, via frameClassName.
export function PhotoCropDialog({ src, zoom: initialZoom, panX: initialPanX, panY: initialPanY, onSave, onClose, frameClassName = "mx-auto h-64 w-64 rounded-full", aspectRatio }: {
  src: string; zoom: number; panX: number; panY: number;
  onSave: (zoom: number, panX: number, panY: number) => void; onClose: () => void;
  frameClassName?: string;
  // width/height of the real element this crop will actually be shown in —
  // when set, this drives the preview frame's shape instead of
  // frameClassName's own height, so what's dragged into view here is
  // exactly what appears live.
  aspectRatio?: number;
}) {
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(initialPanX);
  const [panY, setPanY] = useState(initialPanY);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  // At zoom 1 the cover-fit photo already exactly fills the frame on its
  // tighter axis with no spare margin, so any pan there would reveal empty
  // space — clamp grows only as zoom adds real overflow to pan into.
  const maxPan = (zoom - 1) * 50;
  const clamp = (v: number) => Math.min(maxPan, Math.max(-maxPan, v));

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal tracking-normal leading-none">Adjust photo</DialogTitle>
        </DialogHeader>
        <div ref={frameRef}
          className={cn("relative overflow-hidden border border-line cursor-grab active:cursor-grabbing touch-none select-none", frameClassName)}
          style={aspectRatio ? { aspectRatio } : undefined}
          onPointerDown={(e) => { draggingRef.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!draggingRef.current || !frameRef.current) return;
            const rect = frameRef.current.getBoundingClientRect();
            const dx = ((e.clientX - draggingRef.current.x) / rect.width) * 100;
            const dy = ((e.clientY - draggingRef.current.y) / rect.height) * 100;
            draggingRef.current = { x: e.clientX, y: e.clientY };
            setPanX((p) => clamp(p + dx));
            setPanY((p) => clamp(p + dy));
          }}
          onPointerUp={() => { draggingRef.current = null; }}>
          <img src={src} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ transform: `translate(${panX}%, ${panY}%) scale(${zoom})` }} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
          <input type="range" min={1} max={3} step={0.02} value={zoom}
            onChange={(e) => { const z = Number(e.target.value); setZoom(z); const m = (z - 1) * 50; setPanX((p) => Math.min(m, Math.max(-m, p))); setPanY((p) => Math.min(m, Math.max(-m, p))); }}
            className="flex-1 accent-wine" />
          <button type="button" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
            className="text-xs text-muted-foreground hover:text-ink underline cursor-pointer shrink-0">
            Reset
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Drag the photo to reposition it, or use the slider to zoom in.</p>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="text-sm text-muted-foreground hover:text-ink px-4 py-2 cursor-pointer">Cancel</button>
          </DialogClose>
          <button type="button" onClick={() => onSave(zoom, panX, panY)}
            className="rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine cursor-pointer">
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
