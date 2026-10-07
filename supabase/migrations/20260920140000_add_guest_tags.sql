-- Lets couples create their own free-form tags per guest (e.g. "Groom's
-- side", "College friends", "VIP") — separate from the fixed dietary_tags
-- list, filterable the same way.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[];

NOTIFY pgrst, 'reload schema';
