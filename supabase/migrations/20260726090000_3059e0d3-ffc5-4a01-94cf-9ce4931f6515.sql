-- Replace the Events page's auto-calculated completion percentage (derived
-- from which category checklist items had data) with couple-controlled
-- tracking. The couple now picks a tracking style per event and sets the
-- value themselves from the Edit event dialog.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completion_mode text NOT NULL DEFAULT 'percentage'
  CHECK (completion_mode IN ('percentage', 'fraction', 'boolean'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completion_percent int NOT NULL DEFAULT 0
  CHECK (completion_percent BETWEEN 0 AND 100);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completion_fraction_current int NOT NULL DEFAULT 0
  CHECK (completion_fraction_current >= 0);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completion_fraction_total int NOT NULL DEFAULT 1
  CHECK (completion_fraction_total >= 1);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completion_done boolean NOT NULL DEFAULT false;
