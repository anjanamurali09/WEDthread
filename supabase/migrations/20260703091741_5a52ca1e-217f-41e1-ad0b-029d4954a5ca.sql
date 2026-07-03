-- 1) Guests: first_name + last_name; keep full_name auto-synced
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_name text;

UPDATE public.guests
SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name  = COALESCE(last_name, NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''))
WHERE first_name IS NULL OR last_name IS NULL;

CREATE OR REPLACE FUNCTION public.guests_sync_full_name()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := trim(both ' ' from coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,''));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guests_sync_full_name ON public.guests;
CREATE TRIGGER trg_guests_sync_full_name
BEFORE INSERT OR UPDATE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.guests_sync_full_name();

-- 2) Events: end time
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_end_time time without time zone;

-- 3) Seating canvas
CREATE TABLE IF NOT EXISTS public.seating_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  canvas_width int NOT NULL DEFAULT 1200,
  canvas_height int NOT NULL DEFAULT 800,
  background_color text NOT NULL DEFAULT '#FDFCFB',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_layouts TO authenticated;
GRANT ALL ON public.seating_layouts TO service_role;
ALTER TABLE public.seating_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "layouts owner all" ON public.seating_layouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id=e.wedding_id
                 WHERE e.id = seating_layouts.event_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id=e.wedding_id
                 WHERE e.id = seating_layouts.event_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_seating_layouts_updated BEFORE UPDATE ON public.seating_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'round';
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS pos_x numeric NOT NULL DEFAULT 100;
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS pos_y numeric NOT NULL DEFAULT 100;
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS width numeric NOT NULL DEFAULT 120;
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS height numeric NOT NULL DEFAULT 120;
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS rotation numeric NOT NULL DEFAULT 0;
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS mat_color text;

CREATE TABLE IF NOT EXISTS public.seating_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text,
  pos_x numeric NOT NULL DEFAULT 200,
  pos_y numeric NOT NULL DEFAULT 200,
  width numeric NOT NULL DEFAULT 200,
  height numeric NOT NULL DEFAULT 120,
  rotation numeric NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_fixtures TO authenticated;
GRANT ALL ON public.seating_fixtures TO service_role;
ALTER TABLE public.seating_fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixtures owner all" ON public.seating_fixtures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id=e.wedding_id
                 WHERE e.id = seating_fixtures.event_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id=e.wedding_id
                 WHERE e.id = seating_fixtures.event_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_seating_fixtures_updated BEFORE UPDATE ON public.seating_fixtures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Registry (separate from events)
CREATE TABLE IF NOT EXISTS public.registries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE UNIQUE,
  country_code text,
  message text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registries TO authenticated;
GRANT SELECT ON public.registries TO anon;
GRANT ALL ON public.registries TO service_role;
ALTER TABLE public.registries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry owner all" ON public.registries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = registries.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = registries.wedding_id AND w.owner_id = auth.uid()));
CREATE POLICY "registry public read" ON public.registries FOR SELECT TO anon
  USING (is_public = true AND EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = registries.wedding_id AND w.site_published = true));
CREATE TRIGGER trg_registries_updated BEFORE UPDATE ON public.registries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.registry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id uuid NOT NULL REFERENCES public.registries(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  product_url text,
  retailer text,
  price_cents int,
  currency text DEFAULT 'USD',
  quantity int NOT NULL DEFAULT 1,
  reserved_count int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry_items TO authenticated;
GRANT SELECT ON public.registry_items TO anon;
GRANT ALL ON public.registry_items TO service_role;
ALTER TABLE public.registry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry items owner all" ON public.registry_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registries r JOIN public.weddings w ON w.id=r.wedding_id WHERE r.id = registry_items.registry_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.registries r JOIN public.weddings w ON w.id=r.wedding_id WHERE r.id = registry_items.registry_id AND w.owner_id = auth.uid()));
CREATE POLICY "registry items public read" ON public.registry_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.registries r JOIN public.weddings w ON w.id=r.wedding_id
                 WHERE r.id = registry_items.registry_id AND r.is_public = true AND w.site_published = true));
CREATE TRIGGER trg_registry_items_updated BEFORE UPDATE ON public.registry_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Website editor content
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS story_html text;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS welcome_message text;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS site_sections jsonb NOT NULL DEFAULT '["hero","story","events","gallery","registry","rsvp"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.wedding_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_photos TO authenticated;
GRANT SELECT ON public.wedding_photos TO anon;
GRANT ALL ON public.wedding_photos TO service_role;
ALTER TABLE public.wedding_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos owner all" ON public.wedding_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_photos.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_photos.wedding_id AND w.owner_id = auth.uid()));
CREATE POLICY "photos public read on published sites" ON public.wedding_photos FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_photos.wedding_id AND w.site_published = true));

-- 6) Marketplace: extend for resale listings (existing schema uses seller_id already)
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS listing_kind text NOT NULL DEFAULT 'resale';
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS sold_at timestamptz;