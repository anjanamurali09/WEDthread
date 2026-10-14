import { Link } from "@tanstack/react-router";
import { MapPin, Armchair, Users, Home, Heart } from "lucide-react";
import { priceTierSymbol } from "@/lib/price-tiers";
import { PhotoCarousel } from "@/components/photo-carousel";
import { cn } from "@/lib/utils";

export type VenueCardData = {
  id: string;
  legal_business_name: string;
  verified: boolean;
  city: string | null;
  country: string | null;
  capacity_min: number | null;
  capacity_max: number | null;
  type_of_space: string[];
  price_range_min: number | null;
  photos: string[];
};

export function VenueCard({ venue, saved, onToggleSaved, compact }: {
  venue: VenueCardData;
  saved: boolean;
  // Always provided by the caller — internally decides whether to toggle
  // the save or open the sign-in dialog, so this component doesn't need to
  // know about auth state itself.
  onToggleSaved: (businessId: string) => void;
  // Homepage teaser only: just the name and location, none of the
  // capacity/type/price detail the real marketplace cards show — a lighter
  // touch for a "here's a taste of what's on there" preview.
  compact?: boolean;
}) {
  const v = venue;
  return (
    <Link to={`/venue/${v.id}` as any} className="group paper-card overflow-hidden block hover:-translate-y-0.5 transition-transform">
      <div className="relative">
        <PhotoCarousel photos={v.photos} alt={`${v.legal_business_name}, wedding venue${v.city ? ` in ${v.city}` : ""}`} />
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSaved(v.id); }}
          aria-label={saved ? "Remove from saved" : "Save"} aria-pressed={saved}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-paper/90 shadow cursor-pointer">
          <Heart className={cn("h-4 w-4", saved ? "fill-cherry text-cherry" : "text-ink")} />
        </button>
      </div>
      <div className="p-4">
        <p className="font-serif text-lg leading-snug">{v.legal_business_name}</p>
        {(v.city || v.country) && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-[2px] h-3 w-3 shrink-0" />
            <span className="truncate">{v.city || v.country}</span>
          </p>
        )}
        {!compact && (v.capacity_min != null || v.capacity_max != null) && (
          <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-3">
            {v.capacity_min != null && <span className="inline-flex items-start gap-1"><Armchair className="mt-[3px] h-3.5 w-3.5 shrink-0" /> {v.capacity_min}</span>}
            {v.capacity_max != null && <span className="inline-flex items-start gap-1"><Users className="mt-[3px] h-3.5 w-3.5 shrink-0" /> {v.capacity_max}</span>}
          </p>
        )}
        {!compact && v.type_of_space.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1">
            <Home className="mt-[3px] h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{v.type_of_space.join(" • ")}</span>
          </p>
        )}
        {!compact && priceTierSymbol(v.price_range_min) && (
          <p className="text-sm mt-2 font-medium text-muted-foreground">{priceTierSymbol(v.price_range_min)}</p>
        )}
      </div>
    </Link>
  );
}
