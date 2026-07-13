ALTER TABLE public.seating_fixtures ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'rect';
UPDATE public.seating_fixtures SET shape = 'round' WHERE kind = 'dance_floor' AND shape = 'rect';