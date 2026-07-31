-- Move completion tracking from a single value per event to one value per
-- sub-category (Guests, Seating, Venue, Registry, Website, Vendors), each
-- with its own tracking style. The event card's overall ring is now a
-- computed average of these, rather than a couple-set single value — so the
-- old completion_mode/completion_percent/completion_fraction_*/completion_done
-- columns (added in the previous migration) are superseded and left in place
-- unused rather than dropped, matching this project's additive-only migration style.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category_completion jsonb NOT NULL DEFAULT '{}'::jsonb;
