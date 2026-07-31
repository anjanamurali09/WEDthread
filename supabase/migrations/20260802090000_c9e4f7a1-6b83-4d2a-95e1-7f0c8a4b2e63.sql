-- Registry items no longer group by category; remove the unused column entirely.
ALTER TABLE public.registry_items DROP COLUMN IF EXISTS category;
