-- Lets a couple map an RSVP question's answers onto a dedicated, named column in the
-- Guests table (e.g. "Which starter would you prefer?" -> a "Starter" column showing
-- each guest's pick). NULL (the default) means the question stays answer-log-only and
-- doesn't show up as a Guests column.
ALTER TABLE public.rsvp_questions ADD COLUMN IF NOT EXISTS guest_column_label TEXT;
COMMENT ON COLUMN public.rsvp_questions.guest_column_label IS
  'When set, this question''s answers are shown as a column (with this label) in the Guests table.';
