-- Read-only inventory of who and what is in the live database. Changes nothing.
-- Use it to decide what is test data before anything is deleted.

select 'account' as section,
       u.email as name,
       'signed up ' || to_char(u.created_at, 'YYYY-MM-DD')
         || ', last in ' || coalesce(to_char(u.last_sign_in_at, 'YYYY-MM-DD'), 'never')
         || ', roles: ' || coalesce((select string_agg(r.role::text, '/') from public.user_roles r where r.user_id = u.id), 'none') as detail
from auth.users u

union all
select 'wedding',
       w.partner_a || ' & ' || w.partner_b || ' (' || coalesce(w.slug, 'no slug') || ')',
       'owner ' || coalesce(o.email, '?')
         || ', ' || case when w.site_published then 'PUBLISHED' else 'draft' end
         || ', ' || (select count(*) from public.guests g where g.wedding_id = w.id) || ' guests, '
         || (select count(*) from public.events e where e.wedding_id = w.id) || ' events, created ' || to_char(w.created_at, 'YYYY-MM-DD')
from public.weddings w left join auth.users o on o.id = w.owner_id

union all
select 'business',
       b.legal_business_name || ' (' || b.business_type || ')',
       b.verification_status::text || ', owner ' || coalesce((select email from auth.users where id = b.user_id), 'none (admin-added)')
         || ', created ' || to_char(b.created_at, 'YYYY-MM-DD')
from public.businesses b

union all
select 'row counts', t.name, t.n::text
from (
  select 'enquiries' as name, count(*) as n from public.enquiries
  union all select 'conversations', count(*) from public.conversations
  union all select 'reviews', count(*) from public.reviews
  union all select 'feedback', count(*) from public.feedback
  union all select 'feature_waitlist', count(*) from public.feature_waitlist
  union all select 'saved_listings', count(*) from public.saved_listings
  union all select 'business_claims', count(*) from public.business_claims
  union all select 'business_suggestions', count(*) from public.business_suggestions
) t

order by 1, 2;
