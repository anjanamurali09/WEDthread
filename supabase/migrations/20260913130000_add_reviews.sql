-- Reviews for a business (vendor or venue), gated to weddings that actually
-- enquired. venue_details, business_documents, business_media, lead_forms/
-- lead_form_fields, and the submit-enquiry pipeline are all reused as-is
-- from earlier work (see supabase/migrations/20260913120000_add_venues.sql
-- for venue_details specifically) — nothing about them changes here.
--
-- IMPORTANT — schema collision: a `public.reviews` table already exists
-- (20260701113107_..., "target_type IN ('vendor','venue') / target_id /
-- author_id"), built for the OLD vendors/venues marketplace tables. It has
-- zero references anywhere in the current app (grepped: no `.from("reviews")`
-- call exists yet), so it's dormant — same situation as the vendor_categories
-- collision handled in an earlier migration. Rather than leave two
-- incompatible "reviews" concepts around, this migration ALTERs the existing
-- table in place onto the new businesses/weddings-keyed shape this feature
-- actually needs (author_id/target_id/target_type are dropped; nothing reads
-- them today). Flagging this explicitly rather than silently changing it.

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_target_type_check;
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
DROP POLICY IF EXISTS "reviews public read authed" ON public.reviews;
DROP POLICY IF EXISTS "reviews author write" ON public.reviews;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.reviews RENAME COLUMN body TO review_text;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

ALTER TABLE public.reviews DROP COLUMN IF EXISTS author_id;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS target_id;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS target_type;

ALTER TABLE public.reviews ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN rating TYPE SMALLINT;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_business_wedding_unique;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_business_wedding_unique UNIQUE (business_id, wedding_id);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_wedding ON public.reviews(wedding_id);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

CREATE POLICY "reviews public read" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

-- Server-enforced eligibility (not just a client-side check): a wedding can
-- only review a business it actually has an enquiries row against. Applied
-- to both INSERT and UPDATE so "edit their own" can't be used to attach a
-- review to a business the wedding never enquired with, or hop it onto
-- someone else's wedding.
CREATE POLICY "reviews collaborator write own" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_wedding_access(wedding_id) AND
    EXISTS (SELECT 1 FROM public.enquiries e WHERE e.wedding_id = reviews.wedding_id AND e.business_id = reviews.business_id)
  );

CREATE POLICY "reviews collaborator update own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.has_wedding_access(wedding_id))
  WITH CHECK (
    public.has_wedding_access(wedding_id) AND
    EXISTS (SELECT 1 FROM public.enquiries e WHERE e.wedding_id = reviews.wedding_id AND e.business_id = reviews.business_id)
  );
