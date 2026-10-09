-- Payment reminders can also go to the wedding's collaborators (the people invited to help plan it).
--
-- reminder_include_collaborators  true = the reminder email goes to the owner and every collaborator who has
--                                  accepted their invitation; false (default) = the owner only, as before.
--
-- Run this in the Supabase SQL editor before ticking "Include collaborators" on a reminder.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS reminder_include_collaborators boolean NOT NULL DEFAULT false;
