-- Phase 5: venues, as a second business_type under the same `businesses`
-- table Phase 1 built. Everything from Phases 1-4 is reused unchanged —
-- business_documents, business_media (a venue's own photos/video have
-- business_id set and listing_id NULL, same as a vendor's business-level
-- media), lead_forms/lead_form_fields, and the enquiry/payment/messaging
-- pipeline. The one real gap this migration closes: lead_form_submissions
-- previously required vendor_service_id (a vendor's enquire button always
-- has one); a venue enquiry has no service, only a business.

-- ── venue_details ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_details (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  capacity_min INT,
  capacity_max INT,
  type_of_space TEXT[] NOT NULL DEFAULT '{}',
  facilities_included TEXT[] NOT NULL DEFAULT '{}',
  facilities_excluded TEXT[] NOT NULL DEFAULT '{}',
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'AED'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_details TO authenticated;
GRANT SELECT ON public.venue_details TO anon;
GRANT ALL ON public.venue_details TO service_role;
ALTER TABLE public.venue_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_details public read" ON public.venue_details
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "venue_details owner all" ON public.venue_details
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = venue_details.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = venue_details.business_id AND b.user_id = auth.uid()));

-- Same enforcement pattern as vendor_services_require_vendor_business.
CREATE OR REPLACE FUNCTION public.venue_details_require_venue_business()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND b.business_type = 'venue') THEN
    RAISE EXCEPTION 'venue_details.business_id must reference a business with business_type = venue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_venue_details_require_venue ON public.venue_details;
CREATE TRIGGER trg_venue_details_require_venue
  BEFORE INSERT OR UPDATE OF business_id ON public.venue_details
  FOR EACH ROW EXECUTE FUNCTION public.venue_details_require_venue_business();

-- ── lead_form_submissions: support business-level (no-service) enquiries ──
ALTER TABLE public.lead_form_submissions ALTER COLUMN vendor_service_id DROP NOT NULL;
ALTER TABLE public.lead_form_submissions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.lead_form_submissions DROP CONSTRAINT IF EXISTS lead_form_submissions_service_or_business;
ALTER TABLE public.lead_form_submissions ADD CONSTRAINT lead_form_submissions_service_or_business
  CHECK (vendor_service_id IS NOT NULL OR business_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_business ON public.lead_form_submissions(business_id);

-- Additional permissive SELECT policy (combines via OR with the existing
-- "lead_form_submissions vendor read own") for the direct-business-id case a
-- venue enquiry uses instead of the vendor_services join.
CREATE POLICY "lead_form_submissions venue read own" ON public.lead_form_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = lead_form_submissions.business_id AND b.user_id = auth.uid()));
