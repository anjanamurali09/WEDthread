
-- VENDORS: extend
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS price_tier smallint CHECK (price_tier BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS years_in_business int,
  ADD COLUMN IF NOT EXISTS countries_served text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VENUES: extend + moderation + ownership
DO $$ BEGIN
  CREATE TYPE public.venue_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.venue_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS capacity_seated int,
  ADD COLUMN IF NOT EXISTS capacity_standing int,
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restrictions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_tier smallint CHECK (price_tier BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill any pre-existing venues as approved so directory doesn't go blank
UPDATE public.venues SET status='approved' WHERE status='pending' AND created_at < now() - interval '1 second';

DROP TRIGGER IF EXISTS venues_updated_at ON public.venues;
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Venue admin-only status escalation (mirror vendor pattern)
CREATE OR REPLACE FUNCTION public.venues_prevent_status_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change venue status';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.venues_prevent_status_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS venues_status_guard ON public.venues;
CREATE TRIGGER venues_status_guard BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.venues_prevent_status_escalation();

-- Replace venues public policies with owner+approved model
DROP POLICY IF EXISTS "venues public read" ON public.venues;
DROP POLICY IF EXISTS "venues public read authed" ON public.venues;
DROP POLICY IF EXISTS "venues public read approved" ON public.venues;
DROP POLICY IF EXISTS "venues owner read" ON public.venues;
DROP POLICY IF EXISTS "venues owner insert" ON public.venues;
DROP POLICY IF EXISTS "venues owner update" ON public.venues;
DROP POLICY IF EXISTS "venues admin all" ON public.venues;

CREATE POLICY "venues public read approved" ON public.venues
  FOR SELECT USING (status='approved');
CREATE POLICY "venues owner read" ON public.venues
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "venues owner insert" ON public.venues
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "venues owner update" ON public.venues
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "venues admin update" ON public.venues
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

GRANT SELECT ON public.venues TO anon;
GRANT SELECT, INSERT, UPDATE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

-- BOOKING LEADS
CREATE TABLE IF NOT EXISTS public.booking_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wedding_id uuid REFERENCES public.weddings(id) ON DELETE SET NULL,
  target_vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  target_venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  message text,
  contact_name text,
  contact_email text,
  contact_phone text,
  event_date date,
  guest_count int,
  city text,
  country text,
  budget_min int,
  budget_max int,
  currency text,
  utm_source text NOT NULL DEFAULT 'vowzy',
  utm_medium text NOT NULL DEFAULT 'referral',
  utm_campaign text,
  utm_content text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_leads_target_ck CHECK (
    (target_vendor_id IS NOT NULL AND target_venue_id IS NULL)
    OR (target_vendor_id IS NULL AND target_venue_id IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE ON public.booking_leads TO authenticated;
GRANT ALL ON public.booking_leads TO service_role;

ALTER TABLE public.booking_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads sender read own" ON public.booking_leads
  FOR SELECT TO authenticated USING (sender_user_id = auth.uid());
CREATE POLICY "leads sender insert" ON public.booking_leads
  FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "leads target vendor read" ON public.booking_leads
  FOR SELECT TO authenticated USING (
    target_vendor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = target_vendor_id AND v.owner_id = auth.uid()
    )
  );
CREATE POLICY "leads target venue read" ON public.booking_leads
  FOR SELECT TO authenticated USING (
    target_venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venues v WHERE v.id = target_venue_id AND v.owner_id = auth.uid()
    )
  );
CREATE POLICY "leads target vendor update" ON public.booking_leads
  FOR UPDATE TO authenticated USING (
    target_vendor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = target_vendor_id AND v.owner_id = auth.uid()
    )
  );
CREATE POLICY "leads target venue update" ON public.booking_leads
  FOR UPDATE TO authenticated USING (
    target_venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venues v WHERE v.id = target_venue_id AND v.owner_id = auth.uid()
    )
  );
CREATE POLICY "leads admin all" ON public.booking_leads
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS booking_leads_updated_at ON public.booking_leads;
CREATE TRIGGER booking_leads_updated_at BEFORE UPDATE ON public.booking_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
