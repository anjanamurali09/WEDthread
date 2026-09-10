-- Budget settings gets a toggle between allocating the budget by category (existing
-- behavior) or by event. 'event' mode needs its own per-event allocation slot, mirroring
-- budget_categories.allocated_amount exactly (same % <-> amount split UI reused for both).
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS budget_allocation_mode text NOT NULL DEFAULT 'category';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allocated_amount numeric;
