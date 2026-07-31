-- Allow custom free-text "paid by" values (e.g. "Bride's family", a relative,
-- a wedding planner) in addition to the fixed bride/groom/both options.
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_paid_by_check;
