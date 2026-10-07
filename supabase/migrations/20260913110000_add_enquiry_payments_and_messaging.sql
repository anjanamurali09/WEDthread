-- Phase 4: turns a Phase 3 lead_form_submission into a real enquiry, with an
-- optional (default OFF) per-enquiry charge, an optional card-on-file, and a
-- genuine two-way conversation thread — none of which existed before this
-- migration. The couple/guest messaging system already in the app
-- (message_templates/message_sends) is a one-way broadcast tool for
-- couple→guest campaigns and is NOT reused here; it has no notion of a
-- two-way thread or a vendor-side inbox. conversations/conversation_messages
-- below are new, minimal, and exist only to support this enquiry flow.

-- ── app_settings ─────────────────────────────────────────────────────────
-- No existing settings/config table pattern in this codebase (weddings.
-- site_config is per-wedding jsonb, not global) — a simple global key/value
-- table, per the fallback instruction. Nothing but service_role can write to
-- it; flipping enquiry_charging_enabled on is a manual SQL UPDATE (or a
-- future admin UI), never something a couple/vendor session can touch.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings public read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

-- THE FLAG: flip enquiry charging on later by running, in the SQL editor:
--   UPDATE public.app_settings SET value = 'true'::jsonb, updated_at = now()
--   WHERE key = 'enquiry_charging_enabled';
INSERT INTO public.app_settings (key, value)
VALUES ('enquiry_charging_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── enquiry_rates ────────────────────────────────────────────────────────
-- country_code is nullable; the NULL row is the fallback used whenever no
-- country-specific row matches. Partial unique indexes below allow exactly
-- one fallback row and at most one row per real country_code.
CREATE TABLE IF NOT EXISTS public.enquiry_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiry_rates_fallback ON public.enquiry_rates ((1)) WHERE country_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiry_rates_country ON public.enquiry_rates (country_code) WHERE country_code IS NOT NULL;

GRANT SELECT ON public.enquiry_rates TO anon, authenticated;
GRANT ALL ON public.enquiry_rates TO service_role;
ALTER TABLE public.enquiry_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enquiry_rates public read" ON public.enquiry_rates
  FOR SELECT TO anon, authenticated USING (true);

-- PLACEHOLDER PRICING — not final. Edit rates later with, e.g.:
--   UPDATE public.enquiry_rates SET amount_cents = 150, currency = 'usd', updated_at = now() WHERE country_code = 'IN';
--   INSERT INTO public.enquiry_rates (country_code, amount_cents, currency) VALUES ('AE', 500, 'aed');
INSERT INTO public.enquiry_rates (country_code, amount_cents, currency)
VALUES (NULL, 300, 'usd')
ON CONFLICT DO NOTHING;

-- ── payment_methods ──────────────────────────────────────────────────────
-- Scoped to the account (auth user), not one wedding — a couple with one
-- account should only ever need to add a card once.
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stripe_payment_method_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

CREATE POLICY "payment_methods owner all" ON public.payment_methods
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── conversations / conversation_messages ───────────────────────────────
-- New — there is no existing conversation/message-thread system anywhere in
-- this codebase (messages.tsx is a one-way guest-broadcast tool, see the
-- header comment above). One conversation per (wedding, business) pair,
-- reused across every enquiry/service between that couple and that vendor.
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, business_id)
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_wedding ON public.conversations(wedding_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON public.conversations(business_id);

CREATE POLICY "conversations couple read" ON public.conversations
  FOR SELECT TO authenticated USING (public.has_wedding_access(wedding_id));

CREATE POLICY "conversations vendor read" ON public.conversations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = conversations.business_id AND b.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('couple', 'vendor', 'system')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON public.conversation_messages(conversation_id);

CREATE POLICY "conversation_messages couple read" ON public.conversation_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_messages.conversation_id AND public.has_wedding_access(c.wedding_id))
  );

CREATE POLICY "conversation_messages vendor read" ON public.conversation_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id = conversation_messages.conversation_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "conversation_messages couple send" ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'couple' AND sender_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_messages.conversation_id AND public.has_wedding_access(c.wedding_id))
  );

CREATE POLICY "conversation_messages vendor send" ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'vendor' AND sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c JOIN public.businesses b ON b.id = c.business_id
      WHERE c.id = conversation_messages.conversation_id AND b.user_id = auth.uid()
    )
  );

-- Keeps conversations sortable by recent activity without every reader
-- having to join/aggregate conversation_messages.
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_conversation ON public.conversation_messages;
CREATE TRIGGER trg_touch_conversation
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- ── enquiries ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.enquiry_status AS ENUM ('new', 'replied', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- Nullable: a venue enquiry (Phase 5) has no vendor_service — it's a
  -- direct business-level enquiry.
  vendor_service_id UUID REFERENCES public.vendor_services(id) ON DELETE SET NULL,
  lead_form_submission_id UUID NOT NULL REFERENCES public.lead_form_submissions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  status public.enquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the submit-enquiry edge function (service_role) creates these; no
-- authenticated INSERT policy is needed or granted.
GRANT SELECT, UPDATE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_enquiries_wedding ON public.enquiries(wedding_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_business ON public.enquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_conversation ON public.enquiries(conversation_id);

CREATE POLICY "enquiries couple read" ON public.enquiries
  FOR SELECT TO authenticated USING (public.has_wedding_access(wedding_id));

CREATE POLICY "enquiries vendor read" ON public.enquiries
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = enquiries.business_id AND b.user_id = auth.uid())
  );

CREATE POLICY "enquiries vendor update status" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = enquiries.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = enquiries.business_id AND b.user_id = auth.uid()));

-- ── enquiry_charges ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.enquiry_charge_status AS ENUM ('succeeded', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- enquiry_id is nullable (a deliberate, small deviation from the literal
-- "id, enquiry_id (FK)..." column list given in the spec): the spec's own
-- failure branch says "insert a failed enquiry_charges row and do not create
-- the enquiry" — satisfying that literally requires a charge row that can
-- exist with no enquiry to point to yet.
CREATE TABLE IF NOT EXISTS public.enquiry_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE CASCADE,
  -- NULL when charging was off for this enquiry (the common case today).
  stripe_payment_intent_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL,
  status public.enquiry_charge_status NOT NULL,
  charged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.enquiry_charges TO authenticated;
GRANT ALL ON public.enquiry_charges TO service_role;
ALTER TABLE public.enquiry_charges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_enquiry_charges_enquiry ON public.enquiry_charges(enquiry_id);

CREATE POLICY "enquiry_charges couple read" ON public.enquiry_charges
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.enquiries e WHERE e.id = enquiry_charges.enquiry_id AND public.has_wedding_access(e.wedding_id))
  );

CREATE POLICY "enquiry_charges vendor read" ON public.enquiry_charges
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.enquiries e JOIN public.businesses b ON b.id = e.business_id
      WHERE e.id = enquiry_charges.enquiry_id AND b.user_id = auth.uid()
    )
  );
