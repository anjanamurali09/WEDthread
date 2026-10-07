-- Phase 3: per-service (and later per-business/venue) lead forms, plus the
-- raw submission storage the couple-facing "Enquire" flow writes to.
-- Nothing here creates an actual enquiry/conversation/charge yet — that's
-- Phase 4; this just makes sure no submission is ever lost in the meantime.

DO $$ BEGIN
  CREATE TYPE public.lead_form_field_type AS ENUM ('text', 'number', 'textarea', 'date', 'select');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── lead_forms ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- NULL = applies at the business/venue level rather than one specific
  -- service (Phase 5, once venues have their own lead forms too).
  vendor_service_id UUID REFERENCES public.vendor_services(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Enquiry form',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_forms TO authenticated;
GRANT SELECT ON public.lead_forms TO anon;
GRANT ALL ON public.lead_forms TO service_role;
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lead_forms_business ON public.lead_forms(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_service ON public.lead_forms(vendor_service_id);

-- Couples need to read the form to fill it in, so this is public — no
-- verification/active-status gate here; a form only ever gets fetched from a
-- page the couple already reached (a public, active service's own detail
-- page), so there's no path that surfaces a form the couple shouldn't see.
CREATE POLICY "lead_forms public read" ON public.lead_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "lead_forms owner insert" ON public.lead_forms
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = lead_forms.business_id AND b.user_id = auth.uid()));

CREATE POLICY "lead_forms owner update" ON public.lead_forms
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = lead_forms.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = lead_forms.business_id AND b.user_id = auth.uid()));

CREATE POLICY "lead_forms owner delete" ON public.lead_forms
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = lead_forms.business_id AND b.user_id = auth.uid()));

-- ── lead_form_fields ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_form_id UUID NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type public.lead_form_field_type NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_form_fields TO authenticated;
GRANT SELECT ON public.lead_form_fields TO anon;
GRANT ALL ON public.lead_form_fields TO service_role;
ALTER TABLE public.lead_form_fields ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lead_form_fields_form ON public.lead_form_fields(lead_form_id);

CREATE POLICY "lead_form_fields public read" ON public.lead_form_fields
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "lead_form_fields owner all" ON public.lead_form_fields
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lead_forms f JOIN public.businesses b ON b.id = f.business_id
    WHERE f.id = lead_form_fields.lead_form_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lead_forms f JOIN public.businesses b ON b.id = f.business_id
    WHERE f.id = lead_form_fields.lead_form_id AND b.user_id = auth.uid()
  ));

-- ── lead_form_submissions ──────────────────────────────────────────────
-- lead_form_id is nullable: a couple can submit through the generic
-- fallback form (event date + message) when the vendor hasn't built a
-- custom one — there's no real lead_forms row for that case.
-- vendor_service_id is NOT NULL (unlike lead_forms.vendor_service_id) since
-- the only entry point right now is the "Enquire" button on a specific
-- service's public page — it's also what owner-read RLS keys off, so it
-- stays reliable even when lead_form_id is null.
CREATE TABLE IF NOT EXISTS public.lead_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_form_id UUID REFERENCES public.lead_forms(id) ON DELETE SET NULL,
  vendor_service_id UUID NOT NULL REFERENCES public.vendor_services(id) ON DELETE CASCADE,
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lead_form_submissions TO authenticated;
GRANT ALL ON public.lead_form_submissions TO service_role;
ALTER TABLE public.lead_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_service ON public.lead_form_submissions(vendor_service_id);
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_wedding ON public.lead_form_submissions(wedding_id);

-- A couple can only submit under a wedding they actually have access to
-- (reuses the same has_wedding_access() helper every other wedding-scoped
-- table's RLS already uses — see 20260822090000).
CREATE POLICY "lead_form_submissions couple insert" ON public.lead_form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_wedding_access(wedding_id));

-- The couple can see their own past submissions...
CREATE POLICY "lead_form_submissions couple read own" ON public.lead_form_submissions
  FOR SELECT TO authenticated
  USING (public.has_wedding_access(wedding_id));

-- ...and the vendor can see submissions sent to their own services (this is
-- their future leads inbox — not built yet, but nothing should have to
-- change here when it is).
CREATE POLICY "lead_form_submissions vendor read own" ON public.lead_form_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendor_services s JOIN public.businesses b ON b.id = s.business_id
    WHERE s.id = lead_form_submissions.vendor_service_id AND b.user_id = auth.uid()
  ));

-- ── Seed suggested_lead_fields for the categories that need them ─────────
-- Each entry mirrors lead_form_fields' own shape (label/field_type/options/
-- required) so "pre-fill from the category" is a straight copy when a
-- vendor opens the Lead Form tab for the first time. Every other category
-- from Phase 1's seed list keeps its Phase-1 default of '[]' — genuinely
-- empty, not an oversight (see the migration summary).
UPDATE public.vendor_categories SET suggested_lead_fields = '[
  {"label": "Event date", "field_type": "date", "required": true},
  {"label": "Expected number of pax (hands)", "field_type": "number", "required": true},
  {"label": "Expected number of hours", "field_type": "number", "required": false},
  {"label": "Bridal or guest mehendi?", "field_type": "select", "required": false, "options": ["Bridal only", "Bridal + guests", "Guests only"]}
]'::jsonb WHERE name = 'Mehendi Artist';

UPDATE public.vendor_categories SET suggested_lead_fields = '[
  {"label": "Event date", "field_type": "date", "required": true},
  {"label": "Number of guests", "field_type": "number", "required": true},
  {"label": "Cuisine preference", "field_type": "select", "required": false, "options": ["Indian", "Continental", "Fusion", "Multi-cuisine", "Other"]},
  {"label": "Dietary requirements", "field_type": "textarea", "required": false}
]'::jsonb WHERE name = 'Catering';

UPDATE public.vendor_categories SET suggested_lead_fields = '[
  {"label": "Event date", "field_type": "date", "required": true},
  {"label": "Hours of coverage needed", "field_type": "number", "required": false},
  {"label": "Number of events to cover", "field_type": "number", "required": false},
  {"label": "Style preference", "field_type": "select", "required": false, "options": ["Candid", "Traditional", "Cinematic", "Documentary"]}
]'::jsonb WHERE name = 'Photography';

UPDATE public.vendor_categories SET suggested_lead_fields = '[
  {"label": "Wedding date", "field_type": "date", "required": true},
  {"label": "Estimated guest count", "field_type": "number", "required": true},
  {"label": "Number of events/ceremonies", "field_type": "number", "required": false},
  {"label": "Estimated budget range", "field_type": "select", "required": false, "options": ["Under $10k", "$10k–$25k", "$25k–$50k", "$50k+"]}
]'::jsonb WHERE name = 'Full Wedding Planning';

UPDATE public.vendor_categories SET suggested_lead_fields = '[
  {"label": "Event date", "field_type": "date", "required": true},
  {"label": "Venue name or type", "field_type": "text", "required": false},
  {"label": "Theme or colour palette", "field_type": "text", "required": false},
  {"label": "Budget range", "field_type": "select", "required": false, "options": ["Under $2k", "$2k–$5k", "$5k–$10k", "$10k+"]}
]'::jsonb WHERE name = 'Decor & Florals';
