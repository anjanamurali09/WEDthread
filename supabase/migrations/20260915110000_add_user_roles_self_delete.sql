-- No DELETE policy existed on user_roles at all, so a signed-in user could
-- not remove their own role row through the client. Needed for "leave the
-- admin workspace" (admin has no underlying business/wedding row to delete
-- — the role itself IS the workspace). Self-only; nothing lets a user touch
-- another user's roles.
CREATE POLICY "roles self delete"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
