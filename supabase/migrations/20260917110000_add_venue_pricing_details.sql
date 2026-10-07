-- Real-currency pricing detail for the venue detail page's own "Pricing"
-- section (separate from the $-to-$$$$$ tier used for marketplace cards and
-- filtering, which stays as-is) — a venue can quote a real "From £X" and/or
-- a minimum spend, each with its own currency, plus free-form notes on what
-- that covers.
ALTER TABLE public.venue_details
  ADD COLUMN IF NOT EXISTS price_start_from NUMERIC,
  ADD COLUMN IF NOT EXISTS price_start_from_currency TEXT,
  ADD COLUMN IF NOT EXISTS minimum_spend NUMERIC,
  ADD COLUMN IF NOT EXISTS minimum_spend_currency TEXT,
  ADD COLUMN IF NOT EXISTS price_details TEXT;

NOTIFY pgrst, 'reload schema';
