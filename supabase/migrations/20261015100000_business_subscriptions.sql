-- Monthly subscription for venues and vendors (USD 9.99 venue, USD 4.99 vendor), paid through Stripe Checkout.
--
-- One row per business that has subscribed. Businesses that were added before subscriptions existed simply have
-- no row and stay listed for free. The row is written only by the stripe-webhook function (service role), never
-- by the browser, so nobody can mark themselves as paid. An owner can read their own row to show billing status.
--
-- Whether a business is listed publicly is still decided by businesses.verification_status = 'verified'; the
-- webhook flips it to 'verified' when the subscription starts and back to 'pending' when it ends.

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business subscriptions owner or admin read" ON public.business_subscriptions;
CREATE POLICY "business subscriptions owner or admin read" ON public.business_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_subscriptions.business_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- No insert, update or delete policies on purpose: only the service role (the webhook) writes here.

NOTIFY pgrst, 'reload schema';
