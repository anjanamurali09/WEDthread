-- Business privacy, stage 2. Run this ONLY after the app version that reads and writes the VAT number
-- through business_private is live (see 20261007140000_businesses_privacy.sql).
--
-- Copies anything saved to the old column in the meantime, then removes the column so the number is no
-- longer readable from the public businesses table at all.

INSERT INTO public.business_private (business_id, vat_tax_number)
SELECT id, vat_tax_number FROM public.businesses WHERE vat_tax_number IS NOT NULL
ON CONFLICT (business_id) DO UPDATE SET vat_tax_number = EXCLUDED.vat_tax_number;

ALTER TABLE public.businesses DROP COLUMN IF EXISTS vat_tax_number;

NOTIFY pgrst, 'reload schema';
