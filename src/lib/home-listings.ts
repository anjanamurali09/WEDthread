import { supabase } from "@/integrations/supabase/client";
import type { VenueCardData } from "@/components/venue-card";
import type { VendorServiceCardData } from "@/components/vendor-service-card";

// The venues and vendors on the homepage.
//
// Reading them takes several round trips to the database, which is slow from a server far away from it, so the
// page must never wait on it. On the server the result is kept in the edge cache and served instantly, refreshed in
// the background when it is more than five minutes old. The very first visit to a location, when nothing is cached
// yet, waits at most a moment: if the database is slower than that, the page goes out without the cards and the
// browser fills them in, while the server keeps working so the next visit has them in the page.
export type HomeListings = { venues: VenueCardData[]; services: VendorServiceCardData[]; pending?: boolean };

async function fetchVenues(): Promise<VenueCardData[]> {
  let venues: VenueCardData[] = [];
  const { data: venueBiz } = await supabase
    .from("businesses").select("id,legal_business_name,verification_status,city,country")
    .eq("business_type", "venue").eq("verification_status", "verified")
    .order("created_at", { ascending: false }).limit(40);
  if (venueBiz && venueBiz.length > 0) {
    const ids = venueBiz.map((b) => b.id);
    const [{ data: details }, { data: media }] = await Promise.all([
      supabase.from("venue_details").select("business_id,capacity_min,capacity_max,type_of_space,price_range_min").in("business_id", ids),
      supabase.from("business_media").select("business_id,url,sort_order").in("business_id", ids).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
    ]);
    const detailsByBiz = new Map((details ?? []).map((d) => [d.business_id, d]));
    const photosByBiz = new Map<string, string[]>();
    for (const m of media ?? []) {
      const list = photosByBiz.get(m.business_id) ?? [];
      list.push(m.url);
      photosByBiz.set(m.business_id, list);
    }
    const cards = venueBiz.map((b) => {
      const d = detailsByBiz.get(b.id);
      return {
        id: b.id, legal_business_name: b.legal_business_name, verified: b.verification_status === "verified",
        city: b.city, country: b.country,
        capacity_min: d?.capacity_min ?? null, capacity_max: d?.capacity_max ?? null,
        type_of_space: d?.type_of_space ?? [], price_range_min: d?.price_range_min ?? null,
        photos: photosByBiz.get(b.id) ?? [],
      };
    });
    // Listings with the full set of details (capacity, type of space, price) come first, newest first within
    // each group; the row shows the first twelve.
    const completeness = (v: (typeof cards)[number]) =>
      Number(v.capacity_min != null || v.capacity_max != null) + Number(v.type_of_space.length > 0) + Number(v.price_range_min != null);
    venues = (cards.map((v, i) => ({ v, i })).sort((a, b) => completeness(b.v) - completeness(a.v) || a.i - b.i).map(({ v }) => v).slice(0, 12));
  }
  return venues;
}

async function fetchServices(): Promise<VendorServiceCardData[]> {
  let services: VendorServiceCardData[] = [];
  const { data: svcRows } = await supabase
    .from("vendor_services").select("id,business_id,category_ids")
    .eq("status", "active").order("created_at", { ascending: false }).limit(24);
  if (svcRows && svcRows.length > 0) {
    const bizIds = Array.from(new Set(svcRows.map((s) => s.business_id)));
    const [{ data: biz }, { data: cats }] = await Promise.all([
      supabase.from("businesses").select("id,legal_business_name,city,country").in("id", bizIds).eq("verification_status", "verified"),
      supabase.from("vendor_categories").select("id,name"),
    ]);
    const bizById = new Map((biz ?? []).map((b) => [b.id, b]));
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const eligible = svcRows.filter((s) => bizById.has(s.business_id)).slice(0, 12);
    const svcIds = eligible.map((s) => s.id);
    const [{ data: media }, { data: bizMedia }] = await Promise.all([
      svcIds.length > 0
        ? supabase.from("business_media").select("listing_id,url,sort_order").in("listing_id", svcIds).eq("media_type", "photo").order("sort_order")
        : Promise.resolve({ data: [] as { listing_id: string | null; url: string; sort_order: number }[] }),
      // Falls back to the business's general photos when a service has
      // none of its own (see v.tsx for why this can happen).
      supabase.from("business_media").select("business_id,url,sort_order").in("business_id", bizIds).is("listing_id", null).eq("media_type", "photo").order("sort_order"),
    ]);
    const photosByService = new Map<string, string[]>();
    for (const m of media ?? []) {
      if (!m.listing_id) continue;
      const list = photosByService.get(m.listing_id) ?? [];
      list.push(m.url);
      photosByService.set(m.listing_id, list);
    }
    const photosByBusiness = new Map<string, string[]>();
    for (const m of bizMedia ?? []) {
      const list = photosByBusiness.get(m.business_id) ?? [];
      list.push(m.url);
      photosByBusiness.set(m.business_id, list);
    }
    services = (eligible.map((s) => {
      const b = bizById.get(s.business_id)!;
      return {
        id: s.id, business_id: s.business_id,
        categoryNames: (s.category_ids ?? []).map((id: string) => catName.get(id)).filter((n): n is string => !!n),
        city: b.city ?? null, country: b.country ?? null,
        photos: photosByService.get(s.id) ?? photosByBusiness.get(s.business_id) ?? [],
        businessName: b.legal_business_name, verified: true,
      };
    }));
  }
  return services;
}

// Both lists are read at the same time.
export async function fetchHomeListings(): Promise<HomeListings> {
  try {
    const [venues, services] = await Promise.all([fetchVenues().catch(() => []), fetchServices().catch(() => [])]);
    return { venues, services };
  } catch {
    return { venues: [], services: [] };
  }
}

const CACHE_KEY = "https://listings.wedthread.internal/home-v1";
const FRESH_MS = 5 * 60 * 1000;
const FIRST_VISIT_WAIT_MS = 1200;

export async function loadHomeListings(): Promise<HomeListings> {
  if (typeof window !== "undefined") return fetchHomeListings();

  const g = globalThis as any;
  const cache: Cache | undefined = g.caches?.default;
  const keepAlive: ((p: Promise<unknown>) => void) | undefined = g.__waitUntil;
  const key = new Request(CACHE_KEY);
  const refresh = async () => {
    const data = await fetchHomeListings();
    if (data.venues.length > 0 || data.services.length > 0) {
      await cache?.put(key, new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": "max-age=86400", "x-cached-at": String(Date.now()) } }));
    }
    return data;
  };

  try {
    const hit = await cache?.match(key);
    if (hit) {
      const age = Date.now() - Number(hit.headers.get("x-cached-at") || 0);
      const data = (await hit.json()) as HomeListings;
      if (age > FRESH_MS) keepAlive?.(refresh().catch(() => undefined));
      return data;
    }
  } catch { /* no cache available: read it directly */ }

  const work = refresh();
  const result = await Promise.race([work, new Promise<null>((resolve) => setTimeout(() => resolve(null), FIRST_VISIT_WAIT_MS))]).catch(() => null);
  if (result && (result.venues.length > 0 || result.services.length > 0)) return result;
  keepAlive?.(work.catch(() => undefined));
  return { venues: [], services: [], pending: true };
}
