
-- Onboarding draft storage + completion tracking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_roles TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_drafts TO authenticated;
GRANT ALL ON public.onboarding_drafts TO service_role;

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding drafts"
  ON public.onboarding_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER onboarding_drafts_set_updated_at
  BEFORE UPDATE ON public.onboarding_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
