-- Budget feature expansion: per-wedding currency, a first-run setup flag,
-- richer per-expense fields (description, payment method, paid date, who
-- paid), couple-managed categories, and couple-defined custom columns.
-- All additive per this project's migration convention.

ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS budget_currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS budget_setup_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_date date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_by text CHECK (paid_by IN ('bride', 'groom', 'both'));
-- Values for budget_custom_columns, keyed by column id. Mirrors the
-- events.category_completion jsonb pattern rather than a separate EAV table.
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_categories TO authenticated;
GRANT ALL ON public.budget_categories TO service_role;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget categories owner all" ON public.budget_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

CREATE TABLE public.budget_custom_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_custom_columns TO authenticated;
GRANT ALL ON public.budget_custom_columns TO service_role;
ALTER TABLE public.budget_custom_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget custom columns owner all" ON public.budget_custom_columns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
