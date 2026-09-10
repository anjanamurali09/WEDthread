-- Lets the couple zoom/pan their dashboard photo within the mindmap's circular
-- frame. zoom is a multiplier on top of the base object-fit:cover crop (1 = no
-- extra zoom); pan_x/pan_y are percentages of the image's own rendered box
-- (matching CSS transform: translate()'s own percentage semantics), not an
-- absolute focal point — this pairs with a live drag-to-pan + zoom-slider
-- editor rather than a "pick one point on the photo" picker.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS couple_photo_zoom numeric NOT NULL DEFAULT 1;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS couple_photo_pan_x numeric NOT NULL DEFAULT 0;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS couple_photo_pan_y numeric NOT NULL DEFAULT 0;
