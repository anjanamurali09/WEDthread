-- Venues: richer listing profile (venue type, setting, event spaces, packages,
-- rentals, transportation, menu options, starting/peak pricing), an admin-only
-- "featured" flag (drives the "award winners" filter), and a business-license
-- upload field that gates submission on the client.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS venue_type text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS setting text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rentals_available text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS transportation text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS menu_options text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric,
  ADD COLUMN IF NOT EXISTS packages jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS event_spaces jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_license_url text;

-- Extend the existing status-escalation guard to also cover is_featured: an
-- owner can edit everything about their own listing except these two
-- admin-controlled fields.
CREATE OR REPLACE FUNCTION public.venues_prevent_status_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.is_featured IS DISTINCT FROM OLD.is_featured)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change venue status or featured flag';
  END IF;
  RETURN NEW;
END; $$;

-- Storage: private bucket for business-license documents.
-- Path convention: {user_id}/license-{timestamp}-{filename}
-- NOTE: the bucket itself ("venue-documents", private) must be created once in
-- the Supabase dashboard — like "wedding-assets", bucket creation isn't tracked
-- in migrations, only the RLS policies below are.
DROP POLICY IF EXISTS "venue-documents owner read" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents owner insert" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents owner update" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents owner delete" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents admin read" ON storage.objects;

CREATE POLICY "venue-documents owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venue-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "venue-documents owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venue-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "venue-documents owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'venue-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "venue-documents owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'venue-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "venue-documents admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venue-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
