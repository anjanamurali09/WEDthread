-- Integrations: a couple connects a Google account once, then links WEDthread data
-- (guest list, budget) to a Google Sheet that WEDthread keeps in two-way sync.
--
-- integrations         one connected account per wedding+provider (safe to read in the app)
-- integration_secrets  the OAuth refresh token — RLS on with NO policies, so only the
--                      Edge Functions (service role) can ever read it
-- integration_links    one linked spreadsheet per wedding+data kind
-- integration_row_state snapshot of what each row looked like at the last sync, used to
--                      tell "changed in the sheet" from "changed in WEDthread"

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google',
  account_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, provider)
);

CREATE TABLE IF NOT EXISTS public.integration_secrets (
  integration_id uuid PRIMARY KEY REFERENCES public.integrations(id) ON DELETE CASCADE,
  refresh_token text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('guests', 'budget')),
  spreadsheet_id text NOT NULL,
  spreadsheet_url text NOT NULL,
  sheet_title text NOT NULL,
  auto_sync boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, kind)
);

CREATE TABLE IF NOT EXISTS public.integration_row_state (
  link_id uuid NOT NULL REFERENCES public.integration_links(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  hash text NOT NULL,
  PRIMARY KEY (link_id, record_id)
);

GRANT SELECT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.integration_links TO authenticated;
GRANT ALL ON public.integrations, public.integration_secrets, public.integration_links, public.integration_row_state TO service_role;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_row_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations owner all" ON public.integrations;
CREATE POLICY "integrations owner all" ON public.integrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = integrations.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = integrations.wedding_id AND w.owner_id = auth.uid()));

DROP POLICY IF EXISTS "integration_links owner all" ON public.integration_links;
CREATE POLICY "integration_links owner all" ON public.integration_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = integration_links.wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = integration_links.wedding_id AND w.owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
