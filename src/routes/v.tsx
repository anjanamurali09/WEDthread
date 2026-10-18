import { createFileRoute, useSearch } from "@tanstack/react-router";
import { canonicalLink } from "@/lib/seo";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { Dropdown } from "@/components/dropdown";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { PRICE_TIERS } from "@/lib/price-tiers";
import { VendorServiceCard, type VendorServiceCardData } from "@/components/vendor-service-card";
import { useSavedListings } from "@/hooks/use-saved-listings";
import { useVendorCategories } from "@/hooks/use-vendor-categories";
import { LoginDialog } from "@/components/login-dialog";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";
import { Search } from "lucide-react";
import { ScrollRow, THREE_ACROSS } from "@/components/scroll-row";
import { VendorCategoryStrip } from "@/components/market-category-strip";
import { MarketHero, MarketTile } from "@/components/market-hero";
import { VendorQuiz, type VendorAnswers } from "@/components/market-quiz";
import { PlacePicker, inPlace, useMarketPlace } from "@/lib/market-place";
import { VENDOR_GROUPS, categoryIdsForGroup, inGroup } from "@/lib/vendor-groups";
import { pickDistinctPhotos } from "@/lib/distinct-photos";
import { groupLabel, stanceTiers, type Stance } from "@/lib/market-quiz-logic";

export const Route = createFileRoute("/v")({
  head: () => ({
    meta: [
      { title: "Find a vendor · WEDthread" },
      { name: "description", content: "Browse wedding vendors and their services." },
    ],
    links: canonicalLink("/v"),
  }),
  // ?group=photographers (from the icon row at the top) opens the page already filtered to that kind of vendor.
  validateSearch: (s: Record<string, unknown>): { group?: string } => ({
    ...(typeof s.group === "string" && VENDOR_GROUPS.some((g) => g.key === s.group) ? { group: s.group } : {}),
  }),
  component: VendorDirectory,
});

type ServiceRow = VendorServiceCardData & { price_range_min: number | null; price_range_max: number | null };

// Public, unauthenticated — anyone can browse. One card per vendor BUSINESS
// (a vendor now has one listing, tagged with however many categories apply —
// not a separate named service per category). A vendor with no active
// listing row simply produces zero rows here (no special-casing needed);
// their profile URL still works if visited directly.
//
// Exported as its own component (not fused into the route) so an
// authenticated wrapper (business.browse-vendors.tsx) can render this exact
// same search/filter/grid inside the app shell — same data, same component,
// just embedded without the public page's own header/hero. Same pattern as
// venue.tsx's VenueDirectoryContent.
// `embedded` is the old stripped-down view (filters and grid only). `bare` is the full marketplace, exactly as it
// looks before signing in, but without the page's own side padding, for placing inside the signed-in app.
export function VendorDirectoryContent({ embedded = false, bare = false }: { embedded?: boolean; bare?: boolean }) {
  const [loading, setLoading] = useState(true);
  const { categories } = useVendorCategories();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [priceTiers, setPriceTiers] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const { signedIn, saved, toggle } = useSavedListings();
  const [authOpen, setAuthOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  // What the quiz found out: what each partner would never compromise on, and where they would splurge or save.
  const [quiz, setQuiz] = useState<null | { p1: string[]; p2: string[]; stance: Record<string, Stance> }>(null);
  const [city, setCity] = useState("");
  const group = (useSearch({ strict: false }) as { group?: string }).group;

  const handleToggleSaved = (service: VendorServiceCardData) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId: service.business_id, listingId: service.id });
  };

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("vendor_categories").select("id,name");
      const { data: rows } = await supabase.from("vendor_services").select("id,business_id,category_ids,price_range_min,price_range_max").eq("status", "active").order("created_at", { ascending: false });
      const svc = rows ?? [];
      if (svc.length === 0) { setServices([]); setLoading(false); return; }

      const businessIds = Array.from(new Set(svc.map((s) => s.business_id)));
      const [{ data: businesses, error: businessesError }, { data: media }, { data: businessMedia }] = await Promise.all([
        supabase.from("businesses").select("id,legal_business_name,verification_status,city,country").in("id", businessIds).eq("verification_status", "verified"),
        supabase.from("business_media").select("listing_id,url,sort_order").in("listing_id", svc.map((s) => s.id)).eq("media_type", "photo").order("sort_order"),
        // Falls back to the business's general photos when a service has
        // none of its own — the admin "Add vendor" tool only ever uploads
        // at the business level, so a service created that way would
        // otherwise never show a photo anywhere.
        supabase.from("business_media").select("business_id,url,sort_order").in("business_id", businessIds).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
      ]);
      if (businessesError) console.error(businessesError);
      const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
      const bizById = new Map((businesses ?? []).map((b) => [b.id, b]));
      const photosByService = new Map<string, string[]>();
      for (const m of media ?? []) {
        if (!m.listing_id) continue;
        const list = photosByService.get(m.listing_id) ?? [];
        list.push(m.url);
        photosByService.set(m.listing_id, list);
      }
      const photosByBusiness = new Map<string, string[]>();
      for (const m of businessMedia ?? []) {
        const list = photosByBusiness.get(m.business_id) ?? [];
        list.push(m.url);
        photosByBusiness.set(m.business_id, list);
      }

      setCountries(Array.from(new Set((businesses ?? []).map((b) => b.country).filter((c): c is string => !!c))).sort());

      // Only services whose business is actually verified — a listing can't
      // outlive its own business's review status (pending, or rejected
      // after having been approved, both drop out of the marketplace here).
      setServices(svc.filter((s) => bizById.has(s.business_id)).map((s) => {
        const biz = bizById.get(s.business_id)!;
        return {
          id: s.id,
          business_id: s.business_id,
          categoryNames: (s.category_ids ?? []).map((id: string) => catName.get(id)).filter((n): n is string => !!n),
          price_range_min: s.price_range_min,
          price_range_max: s.price_range_max,
          photos: photosByService.get(s.id) ?? photosByBusiness.get(s.business_id) ?? [],
          businessName: biz.legal_business_name,
          verified: true,
          city: biz.city ?? null,
          country: biz.country ?? null,
        };
      }));
      setLoading(false);
    })();
  }, []);

  // Opening the page from an icon (or switching icons) filters to that group.
  useEffect(() => {
    if (categories.length === 0) return;
    setCategoryIds(group ? categoryIdsForGroup(categories, group) : []);
  }, [group, categories]);

  const cities = useMemo(() => Array.from(new Set(services.map((s) => s.city).filter((c): c is string => !!c))).sort(), [services]);
  const { place, setPlace } = useMarketPlace(cities, countries);

  const popular = useMemo(() => {
    const score = (s: ServiceRow) => Number(s.categoryNames.length > 0) + Number(s.photos.length > 0) + Number(s.price_range_min != null);
    return services.map((s, i) => ({ s, i })).filter(({ s }) => inPlace(place, s.city ?? null, s.country ?? null))
      .sort((a, b) => score(b.s) - score(a.s) || a.i - b.i).map(({ s }) => s).slice(0, 12);
  }, [services, place]);

  const groupTiles = useMemo(() => {
    const options = VENDOR_GROUPS.map((g) => services.filter((x) => inPlace(place, x.city ?? null, x.country ?? null) && inGroup(x.categoryNames, g.key) && x.photos.length > 0).map((x) => x.photos));
    const photos = pickDistinctPhotos(options);
    return VENDOR_GROUPS.flatMap((g, i) => photos[i] ? [{ key: g.key, label: g.label, photo: photos[i] as string }] : []);
  }, [services, place]);

  const heroPhoto = popular.find((s) => s.photos.length > 0)?.photos[0];
  const availableGroups = useMemo(() => VENDOR_GROUPS.filter((g) => services.some((s) => inGroup(s.categoryNames, g.key))).map((g) => g.key), [services]);

  const showResults = (extra?: () => void) => {
    setCity(place?.kind === "city" ? place.name : "");
    setCountry(place?.kind === "country" ? place.name : "");
    extra?.();
    setTimeout(() => document.getElementById("all-vendors")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const applyQuiz = (a: VendorAnswers) => {
    setQuiz({ p1: a.p1, p2: a.p2, stance: a.stance });
    setCity(place?.kind === "city" ? place.name : "");
    setCountry(place?.kind === "country" ? place.name : "");
    setCategoryIds([]);
    setPriceTiers([]);
    setTimeout(() => document.getElementById("your-matches")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // One row per thing they picked: what both chose first, then what only one of them chose. Each row shows the
  // vendors in the chosen place at the price level they said they would spend on it (unpriced ones stay).
  const matchRows = useMemo(() => {
    if (!quiz) return [];
    const keys = [...quiz.p1.filter((k) => quiz.p2.includes(k)), ...quiz.p1.filter((k) => !quiz.p2.includes(k)), ...quiz.p2.filter((k) => !quiz.p1.includes(k))];
    return keys.map((k) => {
      const tiers = stanceTiers(quiz.stance[k]);
      const list = services.filter((s) => inGroup(s.categoryNames, k) && inPlace(place, s.city ?? null, s.country ?? null)
        && (s.price_range_min == null || tiers.includes(String(PRICE_TIERS.findIndex((t) => s.price_range_min! >= t.min && s.price_range_min! < t.max)))));
      const who = quiz.p1.includes(k) && quiz.p2.includes(k) ? "you both picked this" : quiz.p1.includes(k) ? "Partner 1's pick" : "Partner 2's pick";
      return { key: k, heading: `${groupLabel(k)} (${who})`, list };
    });
  }, [quiz, services, place]);

  const placePicker = <PlacePicker place={place} onChange={setPlace} cities={cities} countries={countries} />;

  const filtered = useMemo(() => {
    const selectedNames = categoryIds.map((id) => categories.find((c) => c.value === id)?.label).filter((n): n is string => !!n);
    return services.filter((s) => {
      if (selectedNames.length > 0 && !selectedNames.some((n) => s.categoryNames.includes(n))) return false;
      if (priceTiers.length > 0) {
        if (s.price_range_min == null) return false;
        const tierIdx = PRICE_TIERS.findIndex((t) => s.price_range_min! >= t.min && s.price_range_min! < t.max);
        if (tierIdx === -1 || !priceTiers.includes(String(tierIdx))) return false;
      }
      if (country && s.country !== country) return false;
      if (city && s.city !== city) return false;
      const q = search.trim().toLowerCase();
      if (q && !s.businessName.toLowerCase().includes(q) && !s.categoryNames.some((n) => n.toLowerCase().includes(q))
        && !(s.city ?? "").toLowerCase().includes(q) && !(s.country ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, categoryIds, categories, priceTiers, country, city, search]);

  return (
    <div className={embedded || bare ? undefined : "px-6 md:px-12 py-8"}>
      {!embedded && (
        <>
          <VendorCategoryStrip active={group ?? null} to={bare ? "/business/browse-vendors" : "/v"} />
          <MarketHero
            title={<>Find the perfect vendor in <br />{placePicker}</>}
            photo={heroPhoto}
            primaryLabel="See vendors"
            onPrimary={() => showResults()}
            onQuiz={() => setQuizOpen(true)}
          />

          {quiz && (
            <div id="your-matches" className="mt-14 scroll-mt-28">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-[#243746] md:text-3xl">Matched to you in {place ? place.name : "all locations"}</h2>
                <button type="button" data-static onClick={() => setQuiz(null)}
                  className="text-sm font-medium text-[#243746] underline underline-offset-4 hover:text-[#7FA8D6]">Clear my answers</button>
              </div>
              {matchRows.filter((r) => r.list.length > 0).map((r) => (
                <div key={r.key} className="mb-10">
                  <ScrollRow cardClass={THREE_ACROSS} heading={<>{r.heading}</>}>
                    {r.list.map((s) => <VendorServiceCard key={s.id} service={s} saved={saved.has(s.id)} onToggleSaved={handleToggleSaved} />)}
                  </ScrollRow>
                </div>
              ))}
              {matchRows.every((r) => r.list.length === 0) && (
                <p className="text-sm text-muted-foreground">No vendors here match those picks yet. Try clearing your answers, or a different place.</p>
              )}
            </div>
          )}

          {popular.length > 0 && (
            <div className="mt-14">
              <ScrollRow cardClass={THREE_ACROSS}
                heading={<>Most popular vendors in {place ? place.name : "all locations"}</>}
                action={<button type="button" onClick={() => showResults()} data-static className="shrink-0 rounded-full bg-[#243746] px-5 py-2 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFE08A] hover:text-[#243746]">View all</button>}>
                {popular.map((s) => (
                  <VendorServiceCard key={s.id} service={s} saved={saved.has(s.id)} onToggleSaved={handleToggleSaved} />
                ))}
              </ScrollRow>
            </div>
          )}

          {groupTiles.length > 0 && (
            <div className="mt-14">
              <ScrollRow cardClass="w-[44%] sm:w-[calc((100%-32px)/3)] lg:w-[calc((100%-64px)/5)]"
                heading={<>Explore vendors by type in {place ? place.name : "all locations"}</>}
                action={<button type="button" onClick={() => showResults()} data-static className="shrink-0 rounded-full bg-[#243746] px-5 py-2 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFE08A] hover:text-[#243746]">View all</button>}>
                {groupTiles.map((t) => (
                  <MarketTile key={t.key} label={t.label} photo={t.photo} onClick={() => showResults(() => { setCategoryIds(categoryIdsForGroup(categories, t.key)); setPriceTiers([]); })} />
                ))}
              </ScrollRow>
            </div>
          )}

          <h2 id="all-vendors" className="mt-16 scroll-mt-28 font-serif text-2xl text-[#243746] md:text-3xl">All vendors</h2>

          <VendorQuiz open={quizOpen} onOpenChange={setQuizOpen} photo={heroPhoto} availableGroups={availableGroups} onApply={applyQuiz} />
        </>
      )}

      <div className={embedded ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start" : "mt-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start"}>
        {/* Filters live in a persistent left sidebar on wider screens
            (stacked above the grid on narrower ones) — same layout as the
            venue marketplace (venue.tsx). */}
        <aside className="grid gap-3 lg:sticky lg:top-24">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="w-full rounded-2xl border border-line bg-pearl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          <SearchableMultiSelect selected={categoryIds} onChange={setCategoryIds} placeholder="Category" className="w-full"
            options={categories} />
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
            <p className="text-sm text-muted-foreground">No services match yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((s) => (
                <VendorServiceCard key={s.id} service={s}
                  saved={saved.has(s.id)} onToggleSaved={handleToggleSaved} />
              ))}
            </div>
          )}
        </div>
      </div>

      <LoginDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
    </div>
  );
}

function VendorDirectory() {
  return (
    <div className="min-h-screen bg-pearl text-ink">
      <PublicMarketingHeader />
      <VendorDirectoryContent />
      <SiteFooter />
    </div>
  );
}
