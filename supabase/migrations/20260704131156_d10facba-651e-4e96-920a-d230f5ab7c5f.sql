
ALTER TABLE public.vendor_categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.vendor_categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.vendor_categories(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_categories ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
UPDATE public.vendor_categories SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendor_categories_slug ON public.vendor_categories(slug);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_parent ON public.vendor_categories(parent_id);

DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'venue'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'planner'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'signup_role')::public.app_role, 'couple'::public.app_role);
  EXCEPTION WHEN others THEN _role := 'couple'::public.app_role; END;
  IF _role = 'admin' THEN _role := 'couple'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS site_customization jsonb NOT NULL DEFAULT '{}'::jsonb;

WITH tier1(name, slug, sort_order) AS (VALUES
  ('Planning','planning',1),('Photography & Film','photo-film',2),('Beauty','beauty',3),
  ('Attire','attire',4),('Florals & Décor','florals-decor',5),('Catering','catering',6),
  ('Music & Entertainment','music',7),('Stationery','stationery',8),('Cake & Desserts','cake',9),
  ('Transport','transport',10),('Officiants','officiants',11)
)
INSERT INTO public.vendor_categories (name, slug, parent_id, sort_order)
SELECT name, slug, NULL, sort_order FROM tier1
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order, parent_id = NULL;

WITH tier2(name, slug, parent_slug) AS (VALUES
  ('Full-service Planner','planner-full','planning'),
  ('Day-of Coordinator','planner-day-of','planning'),
  ('Destination Planner','planner-destination','planning'),
  ('Photographer','photographer','photo-film'),
  ('Videographer','videographer','photo-film'),
  ('Drone Operator','drone','photo-film'),
  ('Photo Booth','photo-booth','photo-film'),
  ('Bridal Makeup','makeup-bridal','beauty'),
  ('Party Makeup','makeup-party','beauty'),
  ('Hair Stylist','hair','beauty'),
  ('Mehendi / Henna Artist','mehendi','beauty'),
  ('Nail Artist','nails','beauty'),
  ('Bridal Wear','attire-bridal','attire'),
  ('Groom Wear','attire-groom','attire'),
  ('Sherwani / Achkan','attire-sherwani','attire'),
  ('Suits & Tuxedos','attire-suit','attire'),
  ('Bridesmaid & Party','attire-party','attire'),
  ('Jewellery','jewellery','attire'),
  ('Florist','florist','florals-decor'),
  ('Décor Designer','decor','florals-decor'),
  ('Mandap / Chuppah Builder','mandap','florals-decor'),
  ('Lighting','lighting','florals-decor'),
  ('Rentals & Furniture','rentals','florals-decor'),
  ('Caterer','caterer','catering'),
  ('Bar Service','bar','catering'),
  ('Live Food Station','live-station','catering'),
  ('DJ','dj','music'),
  ('Live Band','band','music'),
  ('Baraat / Dhol','dhol','music'),
  ('String Quartet','strings','music'),
  ('MC / Host','mc','music'),
  ('Invitation Designer','invites','stationery'),
  ('Calligrapher','calligraphy','stationery'),
  ('Signage & Menus','signage','stationery'),
  ('Wedding Cake','cake-wedding','cake'),
  ('Dessert Table','dessert-table','cake'),
  ('Mithai / South Asian Sweets','mithai','cake'),
  ('Luxury Car Hire','car-luxury','transport'),
  ('Guest Shuttle','shuttle','transport'),
  ('Horse / Baraat Vehicle','baraat-vehicle','transport'),
  ('Celebrant','celebrant','officiants'),
  ('Pandit / Priest','pandit','officiants'),
  ('Imam / Nikah Officiant','imam','officiants'),
  ('Rabbi','rabbi','officiants'),
  ('Interfaith Officiant','interfaith','officiants')
)
INSERT INTO public.vendor_categories (name, slug, parent_id, sort_order)
SELECT t.name, t.slug, p.id, 0
FROM tier2 t JOIN public.vendor_categories p ON p.slug = t.parent_slug
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;
