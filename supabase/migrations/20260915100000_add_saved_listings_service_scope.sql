-- A vendor can have several services, each browsed and favorited as its own
-- card (unlike a venue, which is always one card per business) — add an
-- optional listing_id so a save can point at a specific vendor_services row
-- instead of just the business. NULL listing_id keeps meaning "the business
-- itself" (venues, and a vendor's business profile page).
ALTER TABLE public.saved_listings
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.vendor_services(id) ON DELETE CASCADE;

-- The old blanket UNIQUE(user_id, business_id) assumed one save per
-- business — replaced with two partial indexes so a business-level save
-- (listing_id NULL) and any number of distinct service-level saves under
-- that same business can all coexist without colliding.
ALTER TABLE public.saved_listings DROP CONSTRAINT IF EXISTS saved_listings_user_id_business_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS saved_listings_business_unique
  ON public.saved_listings (user_id, business_id) WHERE listing_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS saved_listings_listing_unique
  ON public.saved_listings (user_id, listing_id) WHERE listing_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
