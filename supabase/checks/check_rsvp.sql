-- Read-only check for everything the RSVP pages depend on: the database functions guests' RSVP links call, and the
-- columns the RSVP builder uses. Safe to run any time; it changes nothing. An empty result means all is in place.
-- Each row it returns is something missing, with the migration file that creates it.
with expected_functions(name, args, migration) as (values
  ('get_rsvp_context',            '_token text',                                                              '20260921110000_add_rsvp_mode.sql'),
  ('get_rsvp_questions',          '_token text',                                                              '20260722100000_a2b11dbf-c8ba-4768-98da-f5337732ac8c.sql'),
  ('submit_rsvp',                 '_token text, _event_id uuid, _status rsvp_status, _plus_ones integer',     '20260804090000_656d84e1-89b9-4d81-b462-b6d710548e8f.sql'),
  ('submit_rsvp_answer',          '_token text, _question_id uuid, _event_id uuid, _answer_text text',        '20260725090000_0963c435-b58b-4010-a436-d7d36530b348.sql'),
  ('set_rsvp_submitted',          '_token text, _submitted boolean',                                          '20260725090000_0963c435-b58b-4010-a436-d7d36530b348.sql'),
  ('get_wedding_rsvp_context',    '_slug text',                                                               '20260921110000_add_rsvp_mode.sql'),
  ('get_wedding_rsvp_questions',  '_slug text',                                                               '20260808180000_a3d67e12-5f94-4b8c-9e21-7c4b1f6a9d38.sql'),
  ('match_guests_by_name',        '_slug text, _full_name text',                                              '20260808180000_a3d67e12-5f94-4b8c-9e21-7c4b1f6a9d38.sql'),
  ('create_guest_for_rsvp',       '_slug text, _full_name text',                                              '20260808180000_a3d67e12-5f94-4b8c-9e21-7c4b1f6a9d38.sql'),
  ('get_guest_rsvp_token',        '_guest_id uuid, _slug text',                                               '20260808170000_f9a169f7-4096-4321-a503-b88d3542d485.sql')
)
select 'missing function' as problem, e.name || '(' || e.args || ')' as detail, e.migration as run_this_migration
from expected_functions e
where not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = e.name
)
union all
select 'missing column', c.tbl || '.' || c.col, c.migration
from (values
  ('weddings',       'rsvp_mode',          '20260921110000_add_rsvp_mode.sql'),
  ('weddings',       'attendance_question_text', '20260725090000_0963c435-b58b-4010-a436-d7d36530b348.sql'),
  ('rsvp_questions', 'guest_column_label', '20260829090000_e311ca40-bb4f-4145-8724-617f20e73ef0.sql')
) as c(tbl, col, migration)
where not exists (
  select 1 from information_schema.columns i where i.table_schema = 'public' and i.table_name = c.tbl and i.column_name = c.col
);
