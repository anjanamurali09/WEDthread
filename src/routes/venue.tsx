import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { Dropdown } from "@/components/dropdown";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { PRICE_TIERS } from "@/lib/price-tiers";
import { VenueCard } from "@/components/venue-card";
import { useSavedListings } from "@/hooks/use-saved-listings";
import { LoginDialog } from "@/components/login-dialog";
import { Search } from "lucide-react";

// Path is "/venue" (singular) — "/venues" is already the older, separate
// marketplace system (src/routes/_authenticated/venues.tsx, the pre-Phase-1
// vendors/venues tables). This is the new businesses/venue_details system's
// own directory, deliberately at a non-colliding path, same as the vendor
// marketplace living at "/v" rather than "/vendors".
export const Route = createFileRoute("/venue")({
  head: () => ({
    meta: [
      { title: "Find a venue · WEDthread" },
      { name: "description", content: "Browse wedding venues by space, capacity, and price." },
    ],
  }),
  component: VenueDirectory,
});

const TYPE_OF_SPACE_OPTIONS = ["Indoor", "Outdoor", "Poolside", "Banquet hall", "Rooftop", "Farmhouse", "Beach"];

type VenueRow = {
  id: string;
  legal_business_name: string;
  verified: boolean;
  city: string | null;
  country: string | null;
  capacity_min: number | null;
  capacity_max: number | null;
  type_of_space: string[];
  price_range_min: number | null;
  price_range_max: number | null;
  photos: string[];
};

// Exported for reuse (not fused into the route) so an authenticated wrapper
// (business.browse-venues.tsx) can render this exact same filter/grid
// inside the app shell — same data, same component, just embedded without
// the public page's own header/hero. Same pattern as v.tsx's
// VendorDirectoryContent.
export function VenueDirectoryContent({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [guestMin, setGuestMin] = useState("");
  const [guestMax, setGuestMax] = useState("");
  const [priceTiers, setPriceTiers] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const { signedIn, saved, toggle } = useSavedListings();
  const [authOpen, setAuthOpen] = useState(false);

  const handleToggleSaved = (businessId: string) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId });
  };

  useEffect(() => {
    (async () => {
      const { data: businesses } = await supabase
        .from("businesses").select("id,legal_business_name,verification_status,city,country")
        .eq("business_type", "venue").eq("verification_status", "verified");
      const biz = businesses ?? [];
      if (biz.length === 0) { setVenues([]); setLoading(false); return; }

      const [{ data: details }, { data: media }] = await Promise.all([
        supabase.from("venue_details").select("*").in("business_id", biz.map((b) => b.id)),
        supabase.from("business_media").select("business_id,url,sort_order").in("business_id", biz.map((b) => b.id)).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
      ]);
      const detailsById = new Map((details ?? []).map((d) => [d.business_id, d]));
      const photosByBusiness = new Map<string, string[]>();
      for (const m of media ?? []) {
        const list = photosByBusiness.get(m.business_id) ?? [];
        list.push(m.url);
        photosByBusiness.set(m.business_id, list);
      }

      setVenues(biz.map((b) => {
        const d = detailsById.get(b.id);
        return {
          id: b.id, legal_business_name: b.legal_business_name, verified: b.verification_status === "verified",
          city: b.city, country: b.country,
          capacity_min: d?.capacity_min ?? null, capacity_max: d?.capacity_max ?? null,
          type_of_space: d?.type_of_space ?? [], price_range_min: d?.price_range_min ?? null,
          price_range_max: d?.price_range_max ?? null,
          photos: photosByBusiness.get(b.id) ?? [],
        };
      }));
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(venues.map((v) => v.city).filter((c): c is string => !!c))).sort(),
    [venues],
  );
  const countries = useMemo(
    () => Array.from(new Set(venues.map((v) => v.country).filter((c): c is string => !!c))).sort(),
    [venues],
  );

  const filtered = useMemo(() => {
    const gMin = guestMin.trim() ? Number(guestMin) : null;
    const gMax = guestMax.trim() ? Number(guestMax) : null;
    return venues.filter((v) => {
      if (typeFilter.length > 0 && !typeFilter.some((t) => v.type_of_space.includes(t))) return false;
      if (gMin != null || gMax != null) {
        if (v.capacity_min == null && v.capacity_max == null) return false;
        const vMin = v.capacity_min ?? 0;
        const vMax = v.capacity_max ?? Infinity;
        // Matches if the venue's own capacity range overlaps the
        // user-entered range at all, not just if it fully contains it.
        if (gMax != null && vMin > gMax) return false;
        if (gMin != null && vMax < gMin) return false;
      }
      if (priceTiers.length > 0) {
        if (v.price_range_min == null) return false;
        const tierIdx = PRICE_TIERS.findIndex((t) => v.price_range_min! >= t.min && v.price_range_min! < t.max);
        if (tierIdx === -1 || !priceTiers.includes(String(tierIdx))) return false;
      }
      if (city && v.city !== city) return false;
      if (country && v.country !== country) return false;
      const q = search.trim().toLowerCase();
      if (q && !v.legal_business_name.toLowerCase().includes(q) && !v.type_of_space.some((t) => t.toLowerCase().includes(q))
        && !(v.city ?? "").toLowerCase().includes(q) && !(v.country ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [venues, typeFilter, guestMin, guestMax, priceTiers, city, country, search]);

  return (
    <div className={embedded ? undefined : "px-6 md:px-12 py-12"}>
      {!embedded && (
        <>
          <p className="text-sm uppercase tracking-[0.2em] text-cherry">Venues</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Find a venue for your wedding.</h1>
        </>
      )}

      <div className={embedded ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start" : "mt-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start"}>
        {/* Filters live in a persistent left sidebar on wider screens
            (stacked above the grid on narrower ones) — a single horizontal
            row left the rest of the page looking sparse, and a sidebar is
            the standard marketplace-filter layout couples already expect. */}
        <aside className="grid gap-3 lg:sticky lg:top-24">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="w-full rounded-2xl border border-line bg-paper pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          <MultiSelectDropdown selected={typeFilter} onChange={setTypeFilter} placeholder="Type" className="w-full"
            options={TYPE_OF_SPACE_OPTIONS.map((t) => ({ value: t, label: t }))} />
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-pearl pl-4 pr-3 py-2.5 text-sm">
            <span className="text-muted-foreground shrink-0">Guests</span>
            <input type="number" min={0} inputMode="numeric" placeholder="Min" value={guestMin} onChange={(e) => setGuestMin(e.target.value)}
              className="w-full min-w-0 bg-transparent focus:outline-none" />
            <span className="text-muted-foreground shrink-0">–</span>
            <input type="number" min={0} inputMode="numeric" placeholder="Max" value={guestMax} onChange={(e) => setGuestMax(e.target.value)}
              className="w-full min-w-0 bg-transparent focus:outline-none" />
          </div>
          <MultiSelectDropdown selected={priceTiers} onChange={setPriceTiers} placeholder="Price range" className="w-full"
            options={PRICE_TIERS.map((t, i) => ({ value: String(i), label: t.symbol }))} />
          <Dropdown value={city} onChange={setCity} placeholder="City" className="w-full" searchable
            options={[{ value: "", label: "City" }, ...cities.map((c) => ({ value: c, label: c }))]} />
          <Dropdown value={country} onChange={setCountry} placeholder="Country" className="w-full" searchable
            options={[{ value: "", label: "Country" }, ...countries.map((c) => ({ value: c, label: c }))]} />
        </aside>

        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No venues match yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((v) => (
                <VenueCard key={v.id} venue={v} saved={saved.has(v.id)} onToggleSaved={handleToggleSaved} />
              ))}
            </div>
          )}
        </div>
      </div>

      <LoginDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
    </div>
  );
}

function VenueDirectory() {
  return (
    <div className="min-h-screen bg-pearl text-ink">
      <PublicMarketingHeader />
      <VenueDirectoryContent />
      <SiteFooter />
    </div>
  );
}
