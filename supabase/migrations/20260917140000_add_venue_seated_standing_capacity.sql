-- Seated / standing capacity — more specific than the general capacity_min/
-- capacity_max range already used for marketplace filtering, matching how
-- venues actually describe numbers ("seats up to 80 for the wedding
-- breakfast, standing capacity 150 for the evening reception").
ALTER TABLE public.venue_details
  ADD COLUMN IF NOT EXISTS capacity_seated INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_standing INTEGER;

NOTIFY pgrst, 'reload schema';
