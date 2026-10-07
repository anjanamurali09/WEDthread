-- Reviews no longer require an existing enquiry — a couple may have reached
-- out or experienced a venue/vendor outside WedThread entirely. Any wedding
-- collaborator can now write/update their wedding's review for a business;
-- the enquiries EXISTS check is dropped from both policies.
DROP POLICY IF EXISTS "reviews collaborator write own" ON public.reviews;
DROP POLICY IF EXISTS "reviews collaborator update own" ON public.reviews;

CREATE POLICY "reviews collaborator write own" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.has_wedding_access(wedding_id));

CREATE POLICY "reviews collaborator update own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.has_wedding_access(wedding_id))
  WITH CHECK (public.has_wedding_access(wedding_id));

NOTIFY pgrst, 'reload schema';
