-- Read-only security audit of the live database. Changes nothing.
-- Each row is something worth a look; "info" rows are context, not problems.

-- 1. Tables with row-level security switched OFF (anyone with a grant could read them)
select 'PROBLEM: RLS off' as finding, c.relname::text as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

union all
-- 2. What anonymous (signed-out) visitors can do to each table
select 'anon table access', table_name || ': ' || string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
group by table_name

union all
-- 3. Policies that apply to signed-out visitors, or that allow everything (USING true)
select 'policy open to anon/all', tablename || ' / ' || policyname || ' (' || cmd || ') ' || coalesce('USING ' || qual, '')
from pg_policies
where schemaname = 'public'
  and (roles && array['anon','public']::name[] or qual = 'true' or with_check = 'true')

union all
-- 4. Functions that signed-out visitors can call
select 'function callable by anon', p.proname || case when p.prosecdef then ' (security definer)' else '' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
  and p.prokind = 'f' and p.proname not like 'pg\_%'

union all
-- 5. Storage buckets and whether anyone can read them without signing in
select 'storage bucket', id || ' - ' || case when public then 'PUBLIC' else 'private' end
from storage.buckets

union all
-- 6. Who is an admin
select 'info: admin user', u.email
from public.user_roles r join auth.users u on u.id = r.user_id
where r.role = 'admin'

order by 1, 2;
