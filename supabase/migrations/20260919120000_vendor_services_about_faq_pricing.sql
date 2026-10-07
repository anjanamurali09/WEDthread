-- Gives vendor_services the same About-sections / FAQ / pricing-detail
-- columns venue_details already has, so the vendor form and public vendor
-- page can match the venue ones exactly instead of being a stripped-down
-- version.
ALTER TABLE public.vendor_services
  ADD COLUMN IF NOT EXISTS about_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_details TEXT,
  ADD COLUMN IF NOT EXISTS price_includes TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS price_additional_costs TEXT[] NOT NULL DEFAULT '{}'::text[];

NOTIFY pgrst, 'reload schema';
