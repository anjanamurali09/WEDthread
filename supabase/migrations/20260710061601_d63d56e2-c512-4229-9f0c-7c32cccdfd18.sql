CREATE POLICY "self insert non-admin role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);