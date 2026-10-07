-- Lets an admin (has_role(uid,'admin') — same helper already used by the
-- older vendors/venues admin-review policies) actually approve a pending
-- business: read its private verification documents, and flip
-- verification_status. Owners still can't self-approve (see "businesses
-- owner update"'s WITH CHECK) — this is a separate, additive policy.
CREATE POLICY "businesses admin update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_documents admin read" ON public.business_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
