-- Registry gets its own currency, independent of the country used for retailer suggestions.
ALTER TABLE public.registries ADD COLUMN IF NOT EXISTS currency_code text;
