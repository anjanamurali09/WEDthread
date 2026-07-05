
-- Add site_customization to weddings
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS site_customization jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Website sections table
CREATE TABLE IF NOT EXISTS public.website_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_sections TO authenticated;
GRANT SELECT ON public.website_sections TO anon;
GRANT ALL ON public.website_sections TO service_role;

ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

-- Owners manage their own sections
CREATE POLICY "Owners manage website_sections"
  ON public.website_sections FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

-- Anyone can read sections for published sites (for public /w/$slug rendering)
CREATE POLICY "Public read for published website_sections"
  ON public.website_sections FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.site_published = true));

CREATE INDEX IF NOT EXISTS website_sections_wedding_sort ON public.website_sections(wedding_id, sort_order);

CREATE TRIGGER website_sections_updated_at BEFORE UPDATE ON public.website_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for wedding-assets bucket so authenticated owners can upload
-- Path convention: {wedding_id}/website/{filename}
CREATE POLICY "Owners upload to wedding-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wedding-assets'
    AND EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.owner_id = auth.uid()
        AND w.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Owners update wedding-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'wedding-assets'
    AND EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.owner_id = auth.uid()
        AND w.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Owners delete wedding-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wedding-assets'
    AND EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.owner_id = auth.uid()
        AND w.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Public read wedding-assets for published sites"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'wedding-assets'
    AND EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.site_published = true
        AND w.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "Owners read own wedding-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'wedding-assets'
    AND EXISTS (
      SELECT 1 FROM public.weddings w
      WHERE w.owner_id = auth.uid()
        AND w.id::text = split_part(name, '/', 1)
    )
  );
