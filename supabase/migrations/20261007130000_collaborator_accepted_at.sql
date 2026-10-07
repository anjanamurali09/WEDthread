-- A collaborator shows as "Active" only once they have actually signed in and accepted — not merely
-- because an account exists for their email (Supabase creates the account the moment the invitation
-- is sent).
--
-- accepted_at   set the first time the invited person is signed in and the app loads the wedding for them
-- accept_collaborator_invites()  called by the app for a signed-in collaborator; stamps their own rows only

ALTER TABLE public.wedding_collaborators ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- People who have already signed in before this change keep showing as Active.
UPDATE public.wedding_collaborators wc
SET accepted_at = u.last_sign_in_at
FROM auth.users u
WHERE u.id = wc.user_id AND u.last_sign_in_at IS NOT NULL AND wc.accepted_at IS NULL;

CREATE OR REPLACE FUNCTION public.accept_collaborator_invites()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.wedding_collaborators
  SET accepted_at = now()
  WHERE accepted_at IS NULL
    AND (user_id = auth.uid() OR email = lower(coalesce(auth.jwt()->>'email', '')));
$$;
REVOKE ALL ON FUNCTION public.accept_collaborator_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_collaborator_invites() TO authenticated;

NOTIFY pgrst, 'reload schema';
