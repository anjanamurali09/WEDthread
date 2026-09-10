-- Couple's photo for the Overview page's mindmap center node. Distinct from the
-- existing (unused) cover_photo_url column, which is earmarked for a future
-- website hero image — keeping these separate avoids a naming collision later.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS couple_photo_url text;
