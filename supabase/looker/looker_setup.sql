-- Read-only data for the Looker Studio dashboard.
--
-- NOT a migration: it is not in supabase/migrations on purpose. Run it by hand in the
-- Supabase SQL editor, once. It only adds a new schema called `looker` (views) and one
-- read-only login role. It does not touch or change any existing table.
--
-- BEFORE RUNNING: replace CHANGE_ME_PASSWORD below with a long random password (use a
-- password manager to generate it). Keep it out of chat, email and git.
--
-- Safe to run again: views are replaced, the role is only created if it is missing.

create schema if not exists looker;

-- One row per wedding, with who made it. Contains names and the owner's email: do not
-- share the Looker report with people who should not see them.
create or replace view looker.couples as
select
  w.id                                  as wedding_id,
  w.created_at                          as wedding_created_at,
  w.created_at::date                    as wedding_created_date,
  w.partner_a,
  w.partner_b,
  w.destination_city,
  w.destination_country,
  w.est_guest_count,
  w.site_published,
  w.site_template_id,
  w.budget_currency,
  u.email                               as owner_email,
  u.created_at                          as account_created_at,
  u.last_sign_in_at,
  (u.email_confirmed_at is not null)    as email_confirmed
from public.weddings w
left join auth.users u on u.id = w.owner_id;

-- One row per account (couples, planners, venues, vendors), no email.
create or replace view looker.accounts as
select
  u.id                                  as user_id,
  u.created_at                          as account_created_at,
  u.created_at::date                    as account_created_date,
  u.last_sign_in_at,
  (u.email_confirmed_at is not null)    as email_confirmed,
  coalesce((select string_agg(r.role::text, ', ' order by r.role::text)
            from public.user_roles r where r.user_id = u.id), 'none') as roles
from auth.users u;

-- How much each wedding actually uses the app.
create or replace view looker.wedding_activity as
select
  w.id                                  as wedding_id,
  w.created_at::date                    as wedding_created_date,
  w.destination_country,
  w.site_published,
  (select count(*) from public.guests g where g.wedding_id = w.id)                                   as guests,
  (select count(*) from public.guests g where g.wedding_id = w.id and g.rsvp_submitted_at is not null) as guests_replied,
  (select count(*) from public.events e where e.wedding_id = w.id)                                   as events,
  (select count(*) from public.expenses x where x.wedding_id = w.id)                                 as expenses,
  (select count(*) from public.notes n where n.wedding_id = w.id)                                    as notes,
  (select count(*) from public.wedding_collaborators c where c.wedding_id = w.id)                    as collaborators,
  (select count(*) from public.enquiries q where q.wedding_id = w.id)                                as enquiries_sent
from public.weddings w;

-- Venues and vendors on the marketplace.
create or replace view looker.businesses as
select
  b.id                                  as business_id,
  b.created_at::date                    as created_date,
  b.business_type,
  b.legal_business_name,
  b.city,
  b.country,
  b.verification_status,
  (select count(*) from public.enquiries q where q.business_id = b.id)       as enquiries_received,
  (select count(*) from public.saved_listings s where s.business_id = b.id)  as times_saved
from public.businesses b;

-- Enquiries from couples to venues and vendors.
create or replace view looker.enquiries as
select
  q.id                                  as enquiry_id,
  q.created_at,
  q.created_at::date                    as created_date,
  q.status,
  b.business_type,
  b.city                                as business_city,
  b.country                             as business_country
from public.enquiries q
left join public.businesses b on b.id = q.business_id;

-- Feedback sent from inside the app (free text: shown to admins only).
create or replace view looker.feedback as
select f.created_at, f.created_at::date as created_date, f.rating, f.message
from public.feedback f;

-- Who asked for which upcoming feature.
create or replace view looker.waitlist as
select w.created_at, w.created_at::date as created_date, w.feature
from public.feature_waitlist w;

-- The read-only login Looker Studio uses.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'looker_reader') then
    create role looker_reader login password 'CHANGE_ME_PASSWORD' nosuperuser nocreatedb nocreaterole;
  end if;
end $$;

grant usage on schema looker to looker_reader;
grant select on all tables in schema looker to looker_reader;
alter default privileges in schema looker grant select on tables to looker_reader;
