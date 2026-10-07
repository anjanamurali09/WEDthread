-- Phase 2: per-service listings under a Phase 1 business. One business can
-- offer several services (e.g. "Photography" and "Videography" under the
-- same legal identity) — each gets its own category, price range, and media,
-- but they all share the parent business's name, documents, and
-- verification status.

DO $$ BEGIN
  CREATE TYPE public.vendor_service_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.vendor_categories(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'AED',
  status public.vendor_service_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A service only makes sense under a vendor-type business (a venue's "listing"
-- is the business itself, not a set of services) — enforced with a trigger
-- since CHECK constraints can't reference another table.
CREATE OR REPLACE FUNCTION public.vendor_services_require_vendor_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND b.business_type = 'vendor') THEN
    RAISE EXCEPTION 'vendor_services.business_id must reference a business_type=vendor business';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vendor_services_require_vendor_business
  BEFORE INSERT OR UPDATE OF business_id ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.vendor_services_require_vendor_business();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_services TO authenticated;
GRANT SELECT ON public.vendor_services TO anon;
GRANT ALL ON public.vendor_services TO service_role;
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendor_services_business ON public.vendor_services(business_id);
CREATE INDEX IF NOT EXISTS idx_vendor_services_category ON public.vendor_services(category_id);
CREATE INDEX IF NOT EXISTS idx_vendor_services_status ON public.vendor_services(status);

-- Public can only see active services (this is what the marketplace/browse
-- page and public profile pages query against); the owner can also see and
-- manage their own inactive ones from the dashboard — two separate
-- permissive policies, combined with OR.
CREATE POLICY "vendor_services public read active" ON public.vendor_services
  FOR SELECT TO anon, authenticated USING (status = 'active');

CREATE POLICY "vendor_services owner read all" ON public.vendor_services
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = vendor_services.business_id AND b.user_id = auth.uid()));

CREATE POLICY "vendor_services owner insert" ON public.vendor_services
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = vendor_services.business_id AND b.user_id = auth.uid()));

CREATE POLICY "vendor_services owner update" ON public.vendor_services
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = vendor_services.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = vendor_services.business_id AND b.user_id = auth.uid()));

CREATE POLICY "vendor_services owner delete" ON public.vendor_services
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = vendor_services.business_id AND b.user_id = auth.uid()));

-- ── business_media.listing_id now points at a real table ──────────────────
-- Phase 1 left this as a bare nullable uuid (vendor_services didn't exist
-- yet). NULL still means "business-level media" (e.g. a logo, or general
-- photos not tied to one service); a non-null value scopes it to that
-- service's own gallery. Deleting a service takes its media with it.
ALTER TABLE public.business_media
  ADD CONSTRAINT business_media_listing_id_fkey
  FOREIGN KEY (listing_id) REFERENCES public.vendor_services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_business_media_listing ON public.business_media(listing_id);
