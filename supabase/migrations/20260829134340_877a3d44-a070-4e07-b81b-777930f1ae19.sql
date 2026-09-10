-- "Due by" date for a pending expense, separate from paid_date (which only makes
-- sense once something's actually been paid).
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS due_date DATE;
