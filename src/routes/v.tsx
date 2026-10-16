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
export function VendorDirectoryContent({ embedded = false }: { embedded?: boolean }) {
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

  const groupTiles = useMemo(() => VENDOR_GROUPS.flatMap((g) => {
    const s = services.find((x) => inPlace(place, x.city ?? null, x.country ?? null) && inGroup(x.categoryNames, g.key) && x.photos.length > 0);
    return s ? [{ key: g.key, label: g.label, photo: s.photos[0] }] : [];
  }), [services, place]);

  const heroPhoto = popular.find((s) => s.photos.length > 0)?.photos[0];
  const availableGroups = useMemo(() => VENDOR_GROUPS.filter((g) => services.some((s) => inGroup(s.categoryNames, g.key))).map((g) => g.key), [services]);

  const showResults = (extra?: () => void) => {
    setCity(place?.kind === "city" ? place.name : "");
    setCountry(place?.kind === "country" ? place.name : "");
    extra?.();
    setTimeout(() => document.getElementById("all-vendors")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const applyQuiz = (a: VendorAnswers) => showResults(() => {
    setCategoryIds(Array.from(new Set(a.groups.flatMap((k) => categoryIdsForGroup(categories, k)))));
    setPriceTiers(a.tiers);
  });

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
    <div className={embedded ? undefined : "px-6 md:px-12 py-8"}>
      {!embedded && (
        <>
          <VendorCategoryStrip active={group ?? null} />
          <MarketHero
            title={<>Find the perfect vendor in <br />{placePicker}</>}
            photo={heroPhoto}
            primaryLabel="See vendors"
            onPrimary={() => showResults()}
            onQuiz={() => setQuizOpen(true)}
          />

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
              className="w-full rounded-2xl border border-line bg-paper pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
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
