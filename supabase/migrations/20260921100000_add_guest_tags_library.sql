-- A reusable, wedding-scoped tag library: each tag has a name, a color, and
-- an optional emoji, created once (from the Guests page's tag picker) and
-- then reused across guests — guests.tags (added separately) stays an array
-- of tag names; this table is what gives those names a shared color/emoji
-- identity instead of every tag rendering as an identical plain chip.
CREATE TABLE IF NOT EXISTS public.guest_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7FA8D6',
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_tags TO authenticated;
GRANT ALL ON public.guest_tags TO service_role;
ALTER TABLE public.guest_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guest_tags owner all" ON public.guest_tags;
CREATE POLICY "guest_tags owner all" ON public.guest_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = guest_tags.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = guest_tags.wedding_id AND w.owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
