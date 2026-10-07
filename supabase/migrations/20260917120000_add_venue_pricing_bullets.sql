-- "Starting price includes" / "Additional costs" bullet lists for the
-- Pricing section — sits alongside price_start_from/minimum_spend/
-- price_details added earlier, splitting the freeform notes into two
-- structured lists to match the reference layout.
ALTER TABLE public.venue_details
  ADD COLUMN IF NOT EXISTS price_includes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_additional_costs TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
