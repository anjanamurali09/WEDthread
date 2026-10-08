import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/v")({
  head: () => ({
    meta: [
      { title: "Find a vendor · WEDthread" },
      { name: "description", content: "Browse wedding vendors and their services." },
    ],
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

  const handleToggleSaved = (service: VendorServiceCardData) => {
    if (!signedIn) { setAuthOpen(true); return; }
    toggle({ businessId: service.business_id, listingId: service.id });
  };

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("vendor_categories").select("id,name");
      const { data: rows } = await supabase.from("vendor_services").select("id,business_id,category_ids,price_range_min,price_range_max").eq("status", "active");
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
      const q = search.trim().toLowerCase();
      if (q && !s.businessName.toLowerCase().includes(q) && !s.categoryNames.some((n) => n.toLowerCase().includes(q))
        && !(s.city ?? "").toLowerCase().includes(q) && !(s.country ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, categoryIds, categories, priceTiers, country, search]);

  return (
    <div className={embedded ? undefined : "px-6 md:px-12 py-12"}>
      {!embedded && (
        <>
          <p className="text-sm uppercase tracking-[0.2em] text-cherry">Vendors</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Find a vendor for your wedding.</h1>
        </>
      )}

      <div className={embedded ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start" : "mt-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start"}>
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
