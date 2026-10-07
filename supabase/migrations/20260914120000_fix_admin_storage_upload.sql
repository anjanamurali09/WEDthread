-- Bug found via live testing: the business-documents/business-media storage
-- bucket policies (from the very first business-onboarding migration) only
-- ever check `b.user_id = auth.uid()`. For an unclaimed business (user_id
-- IS NULL, added via the new admin "Add a vendor/venue" form), that
-- condition can never be true for anyone — including an admin — because
-- NULL never equals a UUID. The table-level policies added for admin
-- inserts (business_media admin insert, etc.) don't help here: the actual
-- file upload goes through storage.objects, a separate policy set. This
-- adds the missing admin path, additively (existing owner policies are
-- untouched, multiple permissive policies combine via OR).

CREATE POLICY "business-documents admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business-documents admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business-documents admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business-media admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business-media admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business-media admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-media' AND public.has_role(auth.uid(), 'admin'));
