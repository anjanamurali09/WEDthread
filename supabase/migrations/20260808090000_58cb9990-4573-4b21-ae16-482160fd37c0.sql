-- Notes: a freeform space for jotting anything during planning.
--
-- RLS note: matches the SAME access level as every other wedding-scoped table in this
-- app today (owner-only, via weddings.owner_id) — there is no "collaborator" concept
-- anywhere else in the schema yet (checked every existing migration/policy; zero
-- references). So this mirrors the real current access model rather than inventing a
-- one-off collaborator policy just for Notes. Revisit alongside every other table's RLS
-- together if/when real multi-user collaboration is built.
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes owner all" ON public.notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notes_wedding_updated ON public.notes(wedding_id, updated_at DESC);

CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
