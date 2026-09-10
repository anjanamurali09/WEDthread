-- Seating canvas: floor areas/zones (e.g. Dance floor, Bar, Entrance) — a lighter-weight,
-- always-behind-tables cousin of seating_fixtures. Mirrors seating_fixtures' shape (same
-- placement/resize model) minus `kind`/`rotation`, since areas are just a named, colored,
-- freely placed+resized region, managed via the seating page's settings panel. Scoped to
-- one event (not shared across events), since a beach ceremony and an indoor reception
-- typically need different zones.
CREATE TABLE IF NOT EXISTS public.seating_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#E4EDD8',
  pos_x numeric NOT NULL DEFAULT 100,
  pos_y numeric NOT NULL DEFAULT 100,
  width numeric NOT NULL DEFAULT 220,
  height numeric NOT NULL DEFAULT 160,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_areas TO authenticated;
GRANT ALL ON public.seating_areas TO service_role;
ALTER TABLE public.seating_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seating areas owner all" ON public.seating_areas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = seating_areas.event_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.weddings w ON w.id = e.wedding_id
                 WHERE e.id = seating_areas.event_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_seating_areas_updated BEFORE UPDATE ON public.seating_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default seat count per table shape (e.g. {"round":8,"rect":10,"square":4}), so newly
-- added tables auto-populate a sensible capacity instead of requiring manual entry every
-- time. Wedding-scoped (not per-event) since these preferences are usually consistent
-- across a couple's events. Null means "no saved defaults yet" — the app falls back to a
-- hardcoded default in that case, same pattern as weddings.dashboard_layout.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS seating_shape_defaults jsonb;
