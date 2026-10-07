-- Adds a country field to businesses, captured at onboarding (Business
-- Basics step) — needed so the vendor directory's new country filter has
-- something real to filter on. Nullable: existing businesses (like the
-- earlier test listing) simply won't match a country filter until edited.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS country TEXT;
