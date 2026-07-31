-- Menu feature: an event-level toggle for whether food is served, plus
-- couple-defined, freely-named menu sections and items per event (mirrors
-- the Guests/Registry structure — a parent list the couple edits, scoped to
-- one event via a cascading FK, RLS via the same nested-EXISTS
-- events->weddings ownership chain used by wedding_tables/seat_assignments).
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS food_included boolean NOT NULL DEFAULT true;

CREATE TABLE public.menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_sections TO authenticated;
GRANT ALL ON public.menu_sections TO service_role;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu sections owner all" ON public.menu_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = event_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = event_id AND w.owner_id = auth.uid()));

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu items owner all" ON public.menu_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_sections s
                 JOIN public.events e ON e.id = s.event_id
                 JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE s.id = section_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_sections s
                 JOIN public.events e ON e.id = s.event_id
                 JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE s.id = section_id AND w.owner_id = auth.uid()));
