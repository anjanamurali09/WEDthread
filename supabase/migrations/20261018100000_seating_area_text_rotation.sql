-- Floor areas can have their name turned on its side, like tables and fixtures (which already had a `rotation`
-- column that now holds the turn of their text: 0, 90, 180 or 270 degrees).
ALTER TABLE public.seating_areas ADD COLUMN IF NOT EXISTS text_rotation smallint NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
