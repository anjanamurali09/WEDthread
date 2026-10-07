-- Vendor/venue "business" onboarding — a new, more structured account model
-- (legal business info + verification documents + media) that will eventually
-- grow into the full vendor/venue product in Phase 2. Kept entirely separate
-- from the older `vendors`/`venues` marketplace-listing tables (no shared
-- FKs) — those keep working exactly as they do today; this is additive.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.business_type AS ENUM ('vendor', 'venue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_verification_status AS ENUM ('pending', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.business_media_type AS ENUM ('photo', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── businesses ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type public.business_type NOT NULL,
  legal_business_name TEXT NOT NULL,
  vat_tax_number TEXT,
  business_description TEXT NOT NULL,
  verification_status public.business_verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_businesses_user ON public.businesses(user_id);

-- Every business is publicly readable (verification_status doesn't gate
-- visibility) — only business_documents stays private.
CREATE POLICY "businesses public read" ON public.businesses
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "businesses owner insert" ON public.businesses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Same self-approval guard already used on vendors/venues (see
-- "vendors owner update non-status" / venues_prevent_status_escalation): an
-- owner can edit everything about their own business except flip their own
-- verification status.
CREATE POLICY "businesses owner update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND verification_status = (SELECT b.verification_status FROM public.businesses b WHERE b.id = businesses.id)
  );

CREATE POLICY "businesses owner delete" ON public.businesses
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── business_documents (private — verification paperwork) ────────────────
CREATE TABLE IF NOT EXISTS public.business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_documents TO authenticated;
GRANT ALL ON public.business_documents TO service_role;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_business_documents_business ON public.business_documents(business_id);

-- No anon grant at all on this table or its storage bucket below — stays
-- private to the owner. service_role bypasses RLS by default in Supabase, so
-- no explicit service-role policy is needed for it to read everything.
CREATE POLICY "business_documents owner all" ON public.business_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_documents.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_documents.business_id AND b.user_id = auth.uid()));

-- ── business_media (public — photos/video for the eventual listing) ──────
CREATE TABLE IF NOT EXISTS public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  listing_id UUID, -- Phase 2: per-service listing scoping: NULL for now means "belongs to the business generally"
  media_type public.business_media_type NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_media TO authenticated;
GRANT SELECT ON public.business_media TO anon;
GRANT ALL ON public.business_media TO service_role;
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_business_media_business ON public.business_media(business_id);

-- Public read covers every row regardless of owner (media only exists on
-- businesses, which are all public) — write stays owner-scoped.
CREATE POLICY "business_media public read" ON public.business_media
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "business_media owner insert" ON public.business_media
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_media.business_id AND b.user_id = auth.uid()));

CREATE POLICY "business_media owner update" ON public.business_media
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_media.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_media.business_id AND b.user_id = auth.uid()));

CREATE POLICY "business_media owner delete" ON public.business_media
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_media.business_id AND b.user_id = auth.uid()));

-- ── vendor_categories: EXTEND the existing table, don't replace it ────────
-- IMPORTANT: this table already existed (created 2026-07-01) with a
-- hierarchical parent_id/sort_order shape, used by the OLDER `vendors`
-- marketplace-listing flow (vendors.category_id references it). Rather than
-- creating a second, colliding table, this adds the one new column Phase 1
-- needs and seeds the new flat taxonomy as additional rows. A few of these
-- names deliberately differ from what's already seeded there (e.g. this adds
-- "Photography" alongside the pre-existing "Photographer") since the two
-- taxonomies serve two different systems for now — worth reconciling once
-- the old and new vendor systems merge in a later phase.
ALTER TABLE public.vendor_categories ADD COLUMN IF NOT EXISTS suggested_lead_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.vendor_categories (name, suggested_lead_fields)
VALUES
  ('Full Wedding Planning', '[]'),
  ('Partial Planning / Month-Of Coordination', '[]'),
  ('Photography', '[]'),
  ('Videography', '[]'),
  ('Mehendi Artist', '[]'),
  ('Hair & Makeup', '[]'),
  ('Decor & Florals', '[]'),
  ('Catering', '[]'),
  ('Cake & Desserts', '[]'),
  ('DJ & Entertainment', '[]'),
  ('Live Music', '[]'),
  ('Invitations & Stationery', '[]'),
  ('Favours & Gifting', '[]'),
  ('Transport', '[]'),
  ('Bridal Wear', '[]'),
  ('Groom Wear', '[]'),
  ('Jewellery', '[]')
ON CONFLICT (name) DO NOTHING;

-- ── Storage buckets ────────────────────────────────────────────────────────
-- Created directly here (not "create manually in the dashboard", the older
-- convention a couple of earlier migrations used) — see the wedding-assets
-- bucket fix from 2026-09-06 for exactly why that manual step is easy to
-- miss and silently breaks every upload until caught.
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- business-documents: private, path convention {business_id}/{filename}
CREATE POLICY "business-documents owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-documents'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

CREATE POLICY "business-documents owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-documents'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

CREATE POLICY "business-documents owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-documents'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

CREATE POLICY "business-documents owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-documents'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

-- business-media: public read, owner write, path convention {business_id}/{filename}
CREATE POLICY "business-media public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'business-media');

CREATE POLICY "business-media owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

CREATE POLICY "business-media owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );

CREATE POLICY "business-media owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );
