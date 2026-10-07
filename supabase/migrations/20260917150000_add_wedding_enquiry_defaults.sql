-- Backs the enquiry form's "Save my answers for next time" checkbox — one
-- row per wedding, holding the couple's own contact/logistics defaults
-- (name/email/phone/guest count/preferred dates) so they don't retype them
-- on every enquiry. The per-enquiry message itself is never saved here —
-- only the parts that genuinely don't change between vendors.
CREATE TABLE IF NOT EXISTS public.wedding_enquiry_defaults (
  wedding_id UUID PRIMARY KEY REFERENCES public.weddings(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  approx_guests INTEGER,
  preferred_dates TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_enquiry_defaults TO authenticated;
GRANT ALL ON public.wedding_enquiry_defaults TO service_role;
ALTER TABLE public.wedding_enquiry_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wedding_enquiry_defaults collaborator all" ON public.wedding_enquiry_defaults
  FOR ALL TO authenticated
  USING (public.has_wedding_access(wedding_id))
  WITH CHECK (public.has_wedding_access(wedding_id));

NOTIFY pgrst, 'reload schema';
