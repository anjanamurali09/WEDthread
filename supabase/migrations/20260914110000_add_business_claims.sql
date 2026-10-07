-- Lets an admin pre-seed a vendor/venue listing with no owner yet
-- ("unclaimed"), and lets a real owner request to claim it — reviewed by an
-- admin, same approve/reject-only pattern as new-business review, not an
-- instant handoff (a website is hackable — anyone signed in could otherwise
-- grab any unclaimed listing by clicking a button).

-- ── businesses: ownership becomes optional ────────────────────────────────
ALTER TABLE public.businesses ALTER COLUMN user_id DROP NOT NULL;

-- Distinct from "businesses owner insert" (which requires user_id =
-- auth.uid()) — this covers an admin creating a row with user_id NULL.
CREATE POLICY "businesses admin insert unclaimed" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id IS NULL);

-- An admin-added business has no owner to satisfy the existing
-- owner-scoped INSERT policies on business_documents/business_media/
-- vendor_services/venue_details — add the equivalent admin-scoped ones so
-- the admin "Add vendor/venue" form can attach documents, media, an
-- initial service, or venue details to it.
CREATE POLICY "business_documents admin insert" ON public.business_documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "business_media admin insert" ON public.business_media
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendor_services admin insert" ON public.vendor_services
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "venue_details admin insert" ON public.venue_details
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Approving a claim grants the claimant the vendor/venue role, same as
-- self-signup's addRoleForCurrentUser — only an admin can grant a role to
-- someone else this way.
CREATE POLICY "user_roles admin insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── business_claims ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimant_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- One pending claim per (business, claimant) at a time — doesn't block
-- resubmitting after a rejection, just spamming duplicates of the same
-- open request.
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_claims_one_pending
  ON public.business_claims (business_id, claimant_user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_business_claims_business ON public.business_claims(business_id);

GRANT SELECT, INSERT ON public.business_claims TO authenticated;
GRANT UPDATE ON public.business_claims TO authenticated;
GRANT ALL ON public.business_claims TO service_role;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_claims self read" ON public.business_claims
  FOR SELECT TO authenticated USING (claimant_user_id = auth.uid());

CREATE POLICY "business_claims admin read" ON public.business_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- A claim can only be opened on a currently-unclaimed business — prevents
-- someone "claiming" a listing that already has a real owner.
CREATE POLICY "business_claims self insert" ON public.business_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_claims.business_id AND b.user_id IS NULL)
  );

CREATE POLICY "business_claims admin update" ON public.business_claims
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
