-- Lets a couple express interest in a not-yet-built feature (starting with direct
-- in-platform WhatsApp sending) without building a real signup flow for it yet.
-- One row per wedding + feature; re-joining is a no-op via the unique constraint.
CREATE TABLE public.feature_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, feature)
);
GRANT SELECT, INSERT ON public.feature_waitlist TO authenticated;
GRANT ALL ON public.feature_waitlist TO service_role;
ALTER TABLE public.feature_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature waitlist owner all" ON public.feature_waitlist FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
