-- Budget by category: each category can be allocated a slice of the wedding's total
-- budget_limit. Stored as a plain amount (same unit/rounding as expenses.amount) —
-- the couple can type it as a percentage in the UI, which just gets converted to an
-- amount before saving, rather than keeping two numbers that could drift out of sync
-- with each other if budget_limit later changes.
ALTER TABLE public.budget_categories ADD COLUMN IF NOT EXISTS allocated_amount INT;

-- Calendar tab: payment reminders. Deliberately not tied to a specific expense (a
-- reminder is often set before the exact expense line exists, e.g. "caterer deposit
-- due"), but can optionally reference one for context.
CREATE TABLE public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount INT,
  due_date DATE NOT NULL,
  notes TEXT,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_wedding ON public.payment_reminders(wedding_id, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_reminders TO authenticated;
GRANT ALL ON public.payment_reminders TO service_role;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment reminders owner all" ON public.payment_reminders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

CREATE TRIGGER payment_reminders_updated BEFORE UPDATE ON public.payment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
