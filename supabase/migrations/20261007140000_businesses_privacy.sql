-- Business privacy, stage 1.
--
-- 1. Only APPROVED businesses are readable by the public. Pending and rejected ones were readable by
--    anyone; now they are visible to their owner and to admins only.
-- 2. The VAT / tax number moves to its own table that only the owner and admins can read. (The old
--    column is dropped in stage 2, after the app has switched over.)
-- Contact email/phone stay on businesses on purpose: the public listing pages show them.

CREATE TABLE IF NOT EXISTS public.business_private (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  vat_tax_number text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_private TO authenticated;
GRANT ALL ON public.business_private TO service_role;
ALTER TABLE public.business_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_private owner or admin" ON public.business_private;
CREATE POLICY "business_private owner or admin" ON public.business_private FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_private.business_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_private.business_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

INSERT INTO public.business_private (business_id, vat_tax_number)
SELECT id, vat_tax_number FROM public.businesses WHERE vat_tax_number IS NOT NULL
ON CONFLICT (business_id) DO UPDATE SET vat_tax_number = EXCLUDED.vat_tax_number;

-- Who can read which business rows.
DROP POLICY IF EXISTS "businesses public read" ON public.businesses;
DROP POLICY IF EXISTS "businesses public read verified" ON public.businesses;
DROP POLICY IF EXISTS "businesses read verified, own or admin" ON public.businesses;

CREATE POLICY "businesses public read verified" ON public.businesses FOR SELECT TO anon
  USING (verification_status = 'verified');

CREATE POLICY "businesses read verified, own or admin" ON public.businesses FOR SELECT TO authenticated
  USING (
    verification_status = 'verified'
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

NOTIFY pgrst, 'reload schema';
