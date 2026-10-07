-- Collapses the vendor model toward "one listing per business" (matching
-- venues): a vendor picks multiple categories instead of one category + a
-- separate free-text service name, and gets the same real-currency pricing
-- fields venues already have. service_name stays in the table (existing
-- rows keep it) but is no longer required or shown — the business's own
-- name is the listing's title everywhere now.
ALTER TABLE public.vendor_services
  ALTER COLUMN service_name DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS category_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_start_from NUMERIC,
  ADD COLUMN IF NOT EXISTS price_start_from_currency TEXT,
  ADD COLUMN IF NOT EXISTS minimum_spend NUMERIC,
  ADD COLUMN IF NOT EXISTS minimum_spend_currency TEXT;

-- Backfill category_ids from the existing single category_id so nothing
-- already saved loses its category.
UPDATE public.vendor_services
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL AND category_ids = '{}';

-- vendor_categories already GRANTs INSERT to authenticated, but RLS has no
-- matching policy — every insert has always been silently blocked. Needed
-- now that "add a category if it's missing" is a real, reachable action
-- from the category picker, not just the admin-seeded list.
CREATE POLICY "cats authenticated insert" ON public.vendor_categories
  FOR INSERT TO authenticated
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
