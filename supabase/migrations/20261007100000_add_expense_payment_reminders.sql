-- Payment reminders on budget expenses: when a pending expense has a "due by" date, the couple
-- can ask WEDthread to email them a reminder at a chosen date and time.
--
-- reminder_at       when to send it (absolute moment, stored in UTC)
-- reminder_sent_at  set by the send-payment-reminders Edge Function once the email has gone out,
--                   so each reminder is sent once; cleared whenever the reminder is rescheduled

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_expenses_reminder_due
  ON public.expenses (reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL;
