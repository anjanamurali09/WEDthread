import { createFileRoute } from "@tanstack/react-router";
import { canonicalLink } from "@/lib/seo";
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
import { ScrollRow, THREE_ACROSS } from "@/components/scroll-row";
import { VenueSpaceStrip } from "@/components/market-category-strip";
import { MarketHero, MarketTile } from "@/components/market-hero";
import { VenueQuiz, type VenueAnswers } from "@/components/market-quiz";
import { PlacePicker, inPlace, useMarketPlace } from "@/lib/market-place";
import { pickDistinctPhotos } from "@/lib/distinct-photos";
import { matchVenues, spacesForDates, spacesForSigns } from "@/lib/market-quiz-logic";
import { useCurrentWedding } from "@/lib/wedding-hooks";

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
    links: canonicalLink("/venue"),
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
  currency: string | null;
  photos: string[];
};

// Exported for reuse (not fused into the route) so an authenticated wrapper
// (business.browse-venues.tsx) can render this exact same filter/grid
// inside the app shell — same data, same component, just embedded without
// the public page's own header/hero. Same pattern as v.tsx's
// VendorDirectoryContent.
// `embedded` is the old stripped-down view (filters and grid only). `bare` is the full marketplace, exactly as it
// looks before signing in, but without the page's own side padding, for placing inside the signed-in app.
export function VenueDirectoryContent({ embedded = false, bare = false }: { embedded?: boolean; bare?: boolean }) {
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
  const [quizOpen, setQuizOpen] = useState(false);
  // What the quiz found out: the kinds of space each partner pictures and the sun-sign nudge, plus the size and
  // price level it worked out. Null until the quiz has been taken.
  const [quiz, setQuiz] = useState<null | { p1: string[]; p2: string[]; nudge: string[]; guests: number | null; tiers: string[] }>(null);

  const handleToggleSaved = (businessId: string) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId });
  };

  useEffect(() => {
    (async () => {
      const { data: businesses } = await supabase
        .from("businesses").select("id,legal_business_name,verification_status,city,country")
        .eq("business_type", "venue").eq("verification_status", "verified").order("created_at", { ascending: false });
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
          price_range_max: d?.price_range_max ?? null, currency: d?.currency ?? null,
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

  const { place, setPlace } = useMarketPlace(cities, countries);
  const { data: wedding } = useCurrentWedding();

  // "Popular" puts listings with the full set of details first (capacity, type of space, price), newest first
  // within each group, for the chosen place.
  const popular = useMemo(() => {
    const score = (v: VenueRow) => Number(v.capacity_min != null || v.capacity_max != null) + Number(v.type_of_space.length > 0) + Number(v.price_range_min != null) + Number(v.photos.length > 0);
    return venues.map((v, i) => ({ v, i })).filter(({ v }) => inPlace(place, v.city, v.country))
      .sort((a, b) => score(b.v) - score(a.v) || a.i - b.i).map(({ v }) => v).slice(0, 12);
  }, [venues, place]);

  const styleTiles = useMemo(() => {
    const options = TYPE_OF_SPACE_OPTIONS.map((t) => venues.filter((x) => inPlace(place, x.city, x.country) && x.type_of_space.includes(t) && x.photos.length > 0).map((x) => x.photos));
    const photos = pickDistinctPhotos(options);
    return TYPE_OF_SPACE_OPTIONS.flatMap((t, i) => photos[i] ? [{ type: t, photo: photos[i] as string }] : []);
  }, [venues, place]);

  const heroPhoto = popular.find((v) => v.photos.length > 0)?.photos[0];

  const showResults = (extra?: () => void) => {
    setCity(place?.kind === "city" ? place.name : "");
    setCountry(place?.kind === "country" ? place.name : "");
    extra?.();
    setTimeout(() => document.getElementById("all-venues")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const applyQuiz = (a: VenueAnswers) => {
    setQuiz({ p1: spacesForDates(a.p1), p2: spacesForDates(a.p2), nudge: spacesForSigns(a.signs), guests: a.guests, tiers: a.tiers });
    setCity(place?.kind === "city" ? place.name : "");
    setCountry(place?.kind === "country" ? place.name : "");
    setTypeFilter([]);
    setPriceTiers(a.tiers);
    setGuestMin(a.guests ? String(a.guests) : "");
    setGuestMax(a.guests ? String(a.guests) : "");
    setTimeout(() => document.getElementById("your-matches")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const spacePhotos = useMemo(() => {
    const options = TYPE_OF_SPACE_OPTIONS.map((t) => venues.filter((x) => x.type_of_space.includes(t) && x.photos.length > 0).map((x) => x.photos));
    const photos = pickDistinctPhotos(options);
    const out: Record<string, string> = {};
    TYPE_OF_SPACE_OPTIONS.forEach((t, i) => { if (photos[i]) out[t] = photos[i] as string; });
    return out;
  }, [venues]);

  const matches = useMemo(() => quiz ? matchVenues(venues, { place, ...quiz }) : null, [venues, place, quiz]);

  const placePicker = (
    <PlacePicker place={place} onChange={setPlace} cities={cities} countries={countries} />
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
    <div className={embedded || bare ? undefined : "px-6 md:px-12 py-8"}>
      {!embedded && (
        <>
          <VenueSpaceStrip spaces={TYPE_OF_SPACE_OPTIONS} selected={typeFilter}
            onToggle={(t) => showResults(() => { setTypeFilter(typeFilter.includes(t) ? typeFilter.filter((x) => x !== t) : [...typeFilter, t]); setPriceTiers([]); setGuestMin(""); setGuestMax(""); })} />
          <MarketHero
            title={<>Find the perfect venue in <br />{placePicker}</>}
            photo={heroPhoto}
            primaryLabel="See venues"
            onPrimary={() => showResults()}
            onQuiz={() => setQuizOpen(true)}
          />

          {quiz && matches && (
            <div id="your-matches" className="mt-14 scroll-mt-28">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-[#243746] md:text-3xl">Matched to you in {place ? place.name : "all locations"}</h2>
                <button type="button" data-static onClick={() => { setQuiz(null); setPriceTiers([]); setGuestMin(""); setGuestMax(""); }}
                  className="text-sm font-medium text-[#243746] underline underline-offset-4 hover:text-[#7FA8D6]">Clear my answers</button>
              </div>
              {[
                { key: "both", heading: "You'll both love these", list: matches.both },
                { key: "p1", heading: "Closer to Partner 1's taste", list: matches.only1 },
                { key: "p2", heading: "Closer to Partner 2's taste", list: matches.only2 },
              ].filter((r) => r.list.length > 0).map((r) => (
                <div key={r.key} className="mb-10">
                  <ScrollRow cardClass={THREE_ACROSS} heading={<>{r.heading}</>}>
                    {r.list.map((v) => <VenueCard key={v.id} venue={v} saved={saved.has(v.id)} onToggleSaved={handleToggleSaved} />)}
                  </ScrollRow>
                </div>
              ))}
              {matches.both.length + matches.only1.length + matches.only2.length === 0 && (
                <div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {matches.fits.length > 0
                      ? "No venues here are tagged with those styles yet. These fit your guest count and budget."
                      : "No venues here fit all of that yet. Try clearing your answers, or a different place."}
                  </p>
                  {matches.fits.length > 0 && (
                    <ScrollRow cardClass={THREE_ACROSS} heading={<>Venues that fit</>}>
                      {matches.fits.map((v) => <VenueCard key={v.id} venue={v} saved={saved.has(v.id)} onToggleSaved={handleToggleSaved} />)}
                    </ScrollRow>
                  )}
                </div>
              )}
            </div>
          )}

          {popular.length > 0 && (
            <div className="mt-14">
              <ScrollRow cardClass={THREE_ACROSS}
                heading={<>Most popular venues in {place ? place.name : "all locations"}</>}
                action={<button type="button" onClick={() => showResults()} data-static className="shrink-0 rounded-full bg-[#243746] px-5 py-2 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFE08A] hover:text-[#243746]">View all</button>}>
                {popular.map((v) => (
                  <VenueCard key={v.id} venue={v} saved={saved.has(v.id)} onToggleSaved={handleToggleSaved} />
                ))}
              </ScrollRow>
            </div>
          )}

          {styleTiles.length > 0 && (
            <div className="mt-14">
              <ScrollRow cardClass="w-[44%] sm:w-[calc((100%-32px)/3)] lg:w-[calc((100%-64px)/5)]"
                heading={<>Explore venues by style in {place ? place.name : "all locations"}</>}
                action={<button type="button" onClick={() => showResults()} data-static className="shrink-0 rounded-full bg-[#243746] px-5 py-2 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFE08A] hover:text-[#243746]">View all</button>}>
                {styleTiles.map((t) => (
                  <MarketTile key={t.type} label={t.type} photo={t.photo} onClick={() => showResults(() => { setTypeFilter([t.type]); setPriceTiers([]); setGuestMin(""); setGuestMax(""); })} />
                ))}
              </ScrollRow>
            </div>
          )}

          <h2 id="all-venues" className="mt-16 scroll-mt-28 font-serif text-2xl text-[#243746] md:text-3xl">All venues</h2>

          <VenueQuiz open={quizOpen} onOpenChange={setQuizOpen} photo={heroPhoto} initialGuests={wedding?.est_guest_count ?? null}
            venues={venues} place={place} spacePhotos={spacePhotos} onApply={applyQuiz} />
        </>
      )}

      <div className={embedded ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start" : "mt-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start"}>
        {/* Filters live in a persistent left sidebar on wider screens
            (stacked above the grid on narrower ones) — a single horizontal
            row left the rest of the page looking sparse, and a sidebar is
            the standard marketplace-filter layout couples already expect. */}
        <aside className="grid gap-3 lg:sticky lg:top-24">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="w-full rounded-2xl border border-line bg-pearl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
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
