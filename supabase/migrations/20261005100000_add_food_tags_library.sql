-- Wedding-scoped library of dietary / allergen tags (replaces the hard-coded lists):
-- each has a name, kind ('diet' or 'allergy'), a short menu code (abbr, e.g. "vg"),
-- a color and an optional emoji. menu_items.dietary_tags and guests.dietary_tags /
-- food_allergies keep storing tag NAMES; this table gives those names their identity.
-- The app seeds the usual defaults (Vegan, Nuts, ...) the first time a wedding opens it.
CREATE TABLE IF NOT EXISTS public.food_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'diet' CHECK (kind IN ('diet', 'allergy')),
  abbr text,
  color text NOT NULL DEFAULT '#6E9B72',
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_tags TO authenticated;
GRANT ALL ON public.food_tags TO service_role;
ALTER TABLE public.food_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_tags owner all" ON public.food_tags;
CREATE POLICY "food_tags owner all" ON public.food_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = food_tags.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = food_tags.wedding_id AND w.owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
