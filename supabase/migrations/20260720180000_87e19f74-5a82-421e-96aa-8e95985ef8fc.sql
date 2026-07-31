-- Registry items: group by category, and let couples flag their most-wanted gifts.
ALTER TABLE public.registry_items ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other';
ALTER TABLE public.registry_items ADD COLUMN IF NOT EXISTS is_most_wanted boolean NOT NULL DEFAULT false;
