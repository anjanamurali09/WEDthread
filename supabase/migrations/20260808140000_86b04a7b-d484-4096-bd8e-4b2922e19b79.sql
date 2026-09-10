-- Lets a couple drag an already-seated guest to a specific position around their table
-- (e.g. "move AM to sit next to OD"), instead of chair placement being purely derived
-- from array/fetch order. Nullable, no default: existing rows stay NULL and keep
-- rendering in their current (stable) fetch order until someone actually drags a chip,
-- at which point real index values get written for the table they touched.
ALTER TABLE public.seat_assignments ADD COLUMN IF NOT EXISTS seat_index integer;
