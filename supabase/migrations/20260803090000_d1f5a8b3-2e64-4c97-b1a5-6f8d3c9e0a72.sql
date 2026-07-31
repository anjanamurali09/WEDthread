-- Approved retailer partners shown as "Popular retailers" on the registry page,
-- scoped per country. Reuses the existing vendor_status enum (pending/approved/rejected)
-- since it's the same admin-review shape already used for vendors/venues.
CREATE TABLE public.affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  country TEXT NOT NULL,
  status vendor_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_partners TO anon, authenticated;
GRANT ALL ON public.affiliate_partners TO service_role;
ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate partners public read approved" ON public.affiliate_partners FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "affiliate partners public read approved authed" ON public.affiliate_partners FOR SELECT TO authenticated USING (status = 'approved');
