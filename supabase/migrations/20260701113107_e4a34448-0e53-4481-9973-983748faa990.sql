
-- ========= Enums =========
CREATE TYPE public.app_role AS ENUM ('couple', 'vendor', 'admin');
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'attending', 'declined', 'maybe');
CREATE TYPE public.vendor_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.message_kind AS ENUM ('save_the_date', 'rsvp_request', 'reminder', 'thank_you', 'custom');
CREATE TYPE public.message_status AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed');

-- ========= profiles =========
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles self write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========= user_roles =========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + couple role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'couple');
  IF NEW.email = 'admin@vowzy.app' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Shared updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ========= weddings =========
CREATE TABLE public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_a TEXT NOT NULL,
  partner_b TEXT NOT NULL,
  destination_city TEXT,
  destination_country TEXT,
  est_guest_count INT,
  slug TEXT UNIQUE,
  site_published BOOLEAN NOT NULL DEFAULT false,
  site_template_id TEXT NOT NULL DEFAULT 'editorial-serif',
  site_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weddings TO authenticated;
GRANT SELECT ON public.weddings TO anon;
GRANT ALL ON public.weddings TO service_role;
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weddings owner all" ON public.weddings FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "weddings public if published" ON public.weddings FOR SELECT TO anon USING (site_published = true);
CREATE POLICY "weddings public if published authed" ON public.weddings FOR SELECT TO authenticated USING (site_published = true);
CREATE TRIGGER weddings_updated BEFORE UPDATE ON public.weddings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========= events =========
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE,
  event_time TIME,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events owner all" ON public.events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
CREATE POLICY "events public if wedding published" ON public.events FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.site_published = true));
CREATE POLICY "events public if wedding published authed" ON public.events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.site_published = true));

-- ========= guests =========
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  household_group TEXT,
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  food_allergies TEXT[] NOT NULL DEFAULT '{}',
  dietary_notes TEXT,
  accessibility_notes TEXT,
  rsvp_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT SELECT, UPDATE ON public.guests TO anon;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guests owner all" ON public.guests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
-- Public read gated by rsvp_token knowledge: we expose guest by token via a security definer fn (below).

-- ========= guest_event_invites =========
CREATE TABLE public.guest_event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rsvp_status rsvp_status NOT NULL DEFAULT 'pending',
  plus_ones INT NOT NULL DEFAULT 0,
  rsvp_at TIMESTAMPTZ,
  UNIQUE(guest_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_event_invites TO authenticated;
GRANT ALL ON public.guest_event_invites TO service_role;
ALTER TABLE public.guest_event_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites owner all" ON public.guest_event_invites FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guests g JOIN public.weddings w ON w.id = g.wedding_id
    WHERE g.id = guest_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.guests g JOIN public.weddings w ON w.id = g.wedding_id
    WHERE g.id = guest_id AND w.owner_id = auth.uid()));

-- Public RSVP submission via security definer fn
CREATE OR REPLACE FUNCTION public.submit_rsvp(
  _token TEXT,
  _event_id UUID,
  _status rsvp_status,
  _plus_ones INT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID;
BEGIN
  SELECT id INTO _gid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  INSERT INTO public.guest_event_invites (guest_id, event_id, rsvp_status, plus_ones, rsvp_at)
  VALUES (_gid, _event_id, _status, GREATEST(0, LEAST(_plus_ones, 10)), now())
  ON CONFLICT (guest_id, event_id) DO UPDATE
    SET rsvp_status = EXCLUDED.rsvp_status,
        plus_ones = EXCLUDED.plus_ones,
        rsvp_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, UUID, rsvp_status, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_rsvp_context(_token TEXT)
RETURNS TABLE (
  guest_id UUID, guest_name TEXT, wedding_id UUID, partner_a TEXT, partner_b TEXT,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT,
  current_status rsvp_status, current_plus_ones INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, w.id, w.partner_a, w.partner_b,
         e.id, e.name, e.event_date, e.event_time, e.venue_name, e.city,
         COALESCE(i.rsvp_status, 'pending'::rsvp_status), COALESCE(i.plus_ones, 0)
  FROM public.guests g
  JOIN public.weddings w ON w.id = g.wedding_id
  JOIN public.events e ON e.wedding_id = w.id
  LEFT JOIN public.guest_event_invites i ON i.guest_id = g.id AND i.event_id = e.id
  WHERE g.rsvp_token = _token
  ORDER BY e.sort_order, e.event_date;
$$;
GRANT EXECUTE ON FUNCTION public.get_rsvp_context(TEXT) TO anon, authenticated;

-- ========= wedding_tables & seat_assignments =========
CREATE TABLE public.wedding_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  seats INT NOT NULL DEFAULT 8,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_tables TO authenticated;
GRANT ALL ON public.wedding_tables TO service_role;
ALTER TABLE public.wedding_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables owner all" ON public.wedding_tables FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = event_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = event_id AND w.owner_id = auth.uid()));

CREATE TABLE public.seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.wedding_tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  UNIQUE(table_id, guest_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_assignments TO authenticated;
GRANT ALL ON public.seat_assignments TO service_role;
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat owner all" ON public.seat_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wedding_tables t
                 JOIN public.events e ON e.id = t.event_id
                 JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE t.id = table_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wedding_tables t
                 JOIN public.events e ON e.id = t.event_id
                 JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE t.id = table_id AND w.owner_id = auth.uid()));

-- ========= messages =========
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  kind message_kind NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl owner all" ON public.message_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

CREATE TABLE public.message_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_sends TO authenticated;
GRANT ALL ON public.message_sends TO service_role;
ALTER TABLE public.message_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sends owner read" ON public.message_sends FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

-- ========= venues (public catalog) =========
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  capacity INT,
  description TEXT,
  hero_image TEXT,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  price_range TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues public read" ON public.venues FOR SELECT TO anon USING (true);
CREATE POLICY "venues public read authed" ON public.venues FOR SELECT TO authenticated USING (true);

-- ========= vendors =========
CREATE TABLE public.vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT ON public.vendor_categories TO anon, authenticated;
GRANT INSERT ON public.vendor_categories TO authenticated;
GRANT ALL ON public.vendor_categories TO service_role;
ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats public read" ON public.vendor_categories FOR SELECT TO anon USING (true);
CREATE POLICY "cats public read authed" ON public.vendor_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  category_id UUID REFERENCES public.vendor_categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  home_city TEXT,
  home_country TEXT,
  destinations_serviced TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  hero_image TEXT,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  price_min INT,
  price_max INT,
  status vendor_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon, authenticated;
GRANT INSERT, UPDATE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors public read approved" ON public.vendors FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "vendors public read approved authed" ON public.vendors FOR SELECT TO authenticated USING (status = 'approved' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vendors owner write" ON public.vendors FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vendors owner insert" ON public.vendors FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vendors admin update" ON public.vendors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ========= booking_requests =========
CREATE TABLE public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  quoted_price INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking couple all" ON public.booking_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
CREATE POLICY "booking vendor read" ON public.booking_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));

-- ========= reviews =========
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('vendor','venue')),
  target_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon USING (true);
CREATE POLICY "reviews public read authed" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews author write" ON public.reviews FOR ALL TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

-- ========= marketplace (phase 2 tables, created now to avoid migration later) =========
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, price INT, condition TEXT, category TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing public read" ON public.marketplace_listings FOR SELECT TO anon USING (status='active');
CREATE POLICY "listing public read authed" ON public.marketplace_listings FOR SELECT TO authenticated USING (status='active' OR seller_id=auth.uid());
CREATE POLICY "listing seller write" ON public.marketplace_listings FOR ALL TO authenticated
  USING (seller_id=auth.uid()) WITH CHECK (seller_id=auth.uid());

-- ========= Seed vendor categories =========
INSERT INTO public.vendor_categories(name) VALUES
  ('Wedding Planner'),('Photographer'),('Videographer'),('Catering'),
  ('Florist'),('Decor & Mandap'),('Mehendi Artist'),('Makeup Artist'),
  ('DJ & Music'),('Live Band'),('Officiant'),('Transportation'),
  ('Stationery'),('Cake & Desserts')
ON CONFLICT (name) DO NOTHING;
