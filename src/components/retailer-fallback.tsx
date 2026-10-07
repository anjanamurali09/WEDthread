import { useState } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

// Best-effort brand identity for a registry item with no real product photo.
// Tries unavatar.io first — a free, key-free lookup that aggregates several
// logo/icon sources per domain and, unlike a plain favicon, sometimes returns
// a proper vector or multi-resolution icon — with `fallback=false` so it 404s
// (rather than returning its own generic placeholder) when it has nothing,
// letting us move to Google's favicon service, then a plain gift icon.
// A raster logo is never drawn larger than its own native pixel size (see `cap`), so a
// small icon shows as a small crisp mark instead of being stretched into a blur. Sources are
// tried best-first: unavatar (often a vector/brand logo), then favicon.im's larger icon
// (up to 512px, picks the site's biggest declared icon), then Google's favicon service.
// (Clearbit's old free logo API, which this used to call, was shut down —
// its domain no longer even resolves.)
export function RetailerFallback({ productUrl, retailer, iconClassName, textClassName, className }: {
  productUrl: string | null; retailer: string | null;
  iconClassName?: string; textClassName?: string; className?: string;
}) {
  const hostname = (() => {
    if (!productUrl) return null;
    try { return new URL(productUrl).hostname.replace(/^www\./, ""); } catch { return null; }
  })();

  const [stage, setStage] = useState<"unavatar" | "icon" | "favicon" | "none">(hostname ? "unavatar" : "none");
  const [cap, setCap] = useState<number | null>(null);

  const name = retailer || (hostname
    ? hostname.split(".")[0].replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null);

  const src =
    stage === "unavatar" && hostname ? `https://unavatar.io/${hostname}?fallback=false` :
    stage === "icon" && hostname ? `https://favicon.im/${hostname}?larger=true` :
    stage === "favicon" && hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=256` :
    null;

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 warm-wash px-4 text-center", className)}>
      {src ? (
        <img key={src} src={src} alt="" loading="lazy" decoding="async" className={cn("object-contain drop-shadow-sm", iconClassName)}
          style={cap ? { maxWidth: cap, maxHeight: cap } : undefined}
          onLoad={(e) => {
            const w = e.currentTarget.naturalWidth;
            // SVGs report an arbitrary intrinsic size and scale cleanly — only cap rasters.
            setCap(stage !== "unavatar" || !/\.svg/i.test(e.currentTarget.currentSrc) ? Math.max(24, Math.round(w / (window.devicePixelRatio || 1))) : null);
          }}
          onError={() => { setCap(null); setStage((s) => (s === "unavatar" ? "icon" : s === "icon" ? "favicon" : "none")); }} />
      ) : (
        <Gift className={cn("text-cherry/50", iconClassName)} />
      )}
      {name && <p className={cn("font-medium text-ink/70 truncate max-w-full", textClassName)}>{name}</p>}
    </div>
  );
}
