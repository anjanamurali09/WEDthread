-- Lets each event carry its own dress code, shown on the Events page's
-- Agenda preview alongside time, location, and description.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS dress_code TEXT;

NOTIFY pgrst, 'reload schema';
