-- Bug found via live testing: there was no admin DELETE policy on
-- businesses at all — a DELETE from an admin session was silently filtered
-- to zero rows by RLS (PostgREST still returns 204/success on a 0-row
-- delete, so this failed invisibly rather than with an error). Every child
-- table already cascades on businesses.id, so this one policy is enough to
-- let an admin fully remove a listing (e.g. cleaning up a test entry).
CREATE POLICY "businesses admin delete" ON public.businesses
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
