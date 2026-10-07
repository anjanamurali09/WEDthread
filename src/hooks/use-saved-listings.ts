import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// A venue is one card per business, so it's saved by businessId alone. A
// vendor can have several services, each its own card — saved by listingId
// (the vendor_services row), with businessId carried along for the FK.
// Omitting listingId means "the business itself" (a venue, or a vendor's
// business profile page).
export type SaveTarget = { businessId: string; listingId?: string | null };

function keyOf(t: SaveTarget): string {
  return t.listingId ?? t.businessId;
}

// Backs the heart/favorite icon on listing cards — a signed-in visitor's own
// saved ids, loaded once and kept in sync locally as they toggle.
// Signed-out visitors get signedIn=false; the card itself is responsible for
// opening the sign-in dialog instead of calling toggle in that case.
export function useSavedListings() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setSignedIn(true);
      const { data } = await supabase.from("saved_listings").select("business_id,listing_id").eq("user_id", u.user.id);
      setSaved(new Set((data ?? []).map((r) => r.listing_id ?? r.business_id)));
      setLoading(false);
    })();
  }, []);

  const isSaved = (target: SaveTarget) => saved.has(keyOf(target));

  // Optimistic, but reverted on a failed write — otherwise a heart could show
  // "saved" while nothing was actually persisted.
  const toggle = async (target: SaveTarget) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const key = keyOf(target);
    const wasSaved = saved.has(key);
    setSaved((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(key) : next.add(key);
      return next;
    });

    const { error } = wasSaved
      ? target.listingId
        ? await supabase.from("saved_listings").delete().eq("user_id", u.user.id).eq("listing_id", target.listingId)
        : await supabase.from("saved_listings").delete().eq("user_id", u.user.id).eq("business_id", target.businessId).is("listing_id", null)
      : await supabase.from("saved_listings").insert({ user_id: u.user.id, business_id: target.businessId, listing_id: target.listingId ?? null });

    if (error) {
      setSaved((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(key) : next.delete(key);
        return next;
      });
      toast.error(error.message);
    }
  };

  return { loading, signedIn, saved, isSaved, toggle };
}
