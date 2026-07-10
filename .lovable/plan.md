## Problem
Selecting a role (e.g. "Getting married") inserts into `user_roles`, but that table only has a SELECT policy. INSERT is blocked by RLS → 403 "new row violates row-level security policy".

## Fix
Add an INSERT policy on `public.user_roles` allowing authenticated users to insert their own non-admin roles:

```sql
CREATE POLICY "self insert non-admin role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin');
```

Admin role assignments remain restricted (only service_role/admin flows via SECURITY DEFINER can grant admin), so no privilege escalation.

No client code changes needed — the existing insert in `auth.role.tsx` and `login-dialog.tsx` will succeed once the policy exists.