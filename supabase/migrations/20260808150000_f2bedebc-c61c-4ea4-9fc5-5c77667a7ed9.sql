-- Lets a couple rearrange the physical seat layout around a table (e.g. "4 facing 4"
-- instead of evenly spaced around the perimeter), independent of who's assigned where.
-- Array of {x, y} FRACTIONS (0..1+ of the table's own width/height, not raw pixels) so a
-- saved layout scales naturally when the table is resized, same as chair chip sizing
-- already does. Null (or a length that no longer matches the table's slot count, e.g.
-- after a capacity change) means "not customized yet" — the app falls back to the same
-- evenly-spaced chairPositions() default it always has, same pattern as
-- seating_shape_defaults/dashboard_layout elsewhere in this schema.
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS seat_layout jsonb;
