import { Link } from "@tanstack/react-router";
import { Tag, MapPin, Heart } from "lucide-react";
import { PhotoCarousel } from "@/components/photo-carousel";
import { cn } from "@/lib/utils";

export type VendorServiceCardData = {
  id: string;
  business_id: string;
  categoryNames: string[];
  city: string | null;
  country: string | null;
  photos: string[];
  businessName: string;
  verified?: boolean;
};

// One card per vendor BUSINESS (not per named service — a vendor now has
// one listing, tagged with however many categories apply), same shape as
// VenueCard. Shared by the marketplace directory (/v), the homepage teaser,
// and the authenticated "Browse vendors" page — always links straight to
// the real public listing page, same as VenueCard does for venues.
export function VendorServiceCard({ service, saved, onToggleSaved, compact }: {
  service: VendorServiceCardData;
  saved: boolean;
  onToggleSaved: (service: VendorServiceCardData) => void;
  // Homepage teaser only: just the name and location, no category tags —
  // a lighter touch for a "here's a taste of what's on there" preview.
  compact?: boolean;
}) {
  const s = service;
  // City only; the country is left out to keep the card light (falls back to the country if there is no city).
  const location = s.city || s.country || "";
  const content = (
    <>
      <div className="relative">
        <PhotoCarousel photos={s.photos} />
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSaved(s); }}
          aria-label={saved ? "Remove from saved" : "Save"} aria-pressed={saved}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-paper/90 shadow cursor-pointer">
          <Heart className={cn("h-4 w-4", saved ? "fill-cherry text-cherry" : "text-ink")} />
        </button>
      </div>
      <div className="p-4">
        <p className="font-serif text-lg leading-snug truncate">{s.businessName}</p>
        {!compact && s.categoryNames.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1">
            <Tag className="mt-[4px] h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{s.categoryNames.join(" • ")}</span>
          </p>
        )}
        {location && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-[2px] h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
      </div>
    </>
  );

  return (
    <Link to={`/v/${service.business_id}` as any} className="group paper-card overflow-hidden block hover:-translate-y-0.5 transition-transform">
      {content}
    </Link>
  );
}
