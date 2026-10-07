-- Three additions:
--  1. Reject-after-approve needs no new policy — "businesses admin update"
--     already allows any status transition, this is a frontend-only change.
--  2. Editing an UNCLAIMED business needs UPDATE/DELETE admin policies that
--     were missing — the earlier admin migration only added INSERT (enough
--     to create a listing, not to edit one afterward: upserting
--     venue_details a second time, editing a vendor_service, or removing a
--     photo all need UPDATE/DELETE).
--  3. Public "suggest a change" requests, reviewed the same approve/reject
--     way as claims — a business_suggestions table.

CREATE POLICY "venue_details admin update" ON public.venue_details
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendor_services admin update" ON public.vendor_services
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_media admin update" ON public.business_media
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_media admin delete" ON public.business_media
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_documents admin update" ON public.business_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_documents admin delete" ON public.business_documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── business_suggestions ─────────────────────────────────────────────────
-- Deliberately freeform (a message, not structured per-field before/after
-- values) — same reasoning as business_claims: a human reviews it and, if
-- they agree, makes the actual edit themselves (via the admin edit form for
-- an unclaimed business, or by contacting the owner for a claimed one).
-- Approving/rejecting here only marks the suggestion reviewed; it never
-- auto-mutates the business.
CREATE TABLE IF NOT EXISTS public.business_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  suggested_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_by_email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_suggestions_business ON public.business_suggestions(business_id);

GRANT SELECT, INSERT ON public.business_suggestions TO authenticated;
GRANT UPDATE ON public.business_suggestions TO authenticated;
GRANT ALL ON public.business_suggestions TO service_role;
ALTER TABLE public.business_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_suggestions self read" ON public.business_suggestions
  FOR SELECT TO authenticated USING (suggested_by_user_id = auth.uid());

CREATE POLICY "business_suggestions admin read" ON public.business_suggestions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_suggestions self insert" ON public.business_suggestions
  FOR INSERT TO authenticated WITH CHECK (suggested_by_user_id = auth.uid());

CREATE POLICY "business_suggestions admin update" ON public.business_suggestions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
