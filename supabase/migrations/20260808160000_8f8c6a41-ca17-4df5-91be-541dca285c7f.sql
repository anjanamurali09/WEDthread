-- Seat arrangement style per table: 'facing' (seats evenly distributed along all sides,
-- the existing/original layout math) or 'head' (one seat at each end/head — top-center
-- and bottom-center — remaining seats split evenly along the two long sides). Only
-- meaningful for rect/square tables; round tables always stay 'facing' (enforced app-side
-- when switching a table's shape to round). Nullable with a DEFAULT so existing rows
-- backfill to 'facing' (today's only behavior) without a data migration step.
ALTER TABLE public.wedding_tables ADD COLUMN IF NOT EXISTS seat_arrangement text DEFAULT 'facing';
