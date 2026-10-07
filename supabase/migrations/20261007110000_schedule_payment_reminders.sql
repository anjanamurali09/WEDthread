-- Runs the send-payment-reminders Edge Function every 15 minutes, so reminders go out close to the
-- time the couple picked. Run this AFTER 20261007100000_add_expense_payment_reminders.sql and after
-- deploying the function.
--
-- Before running: replace <SUPABASE_ANON_KEY> with the project's anon (public) key — the same
-- VITE_SUPABASE_PUBLISHABLE_KEY the app uses. The function only ever sends reminders that are already
-- due, so calling it is harmless, and it uses its own service role internally.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('send-payment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-payment-reminders');

SELECT cron.schedule(
  'send-payment-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pthcamxqautjjsppbfaj.supabase.co/functions/v1/send-payment-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <SUPABASE_ANON_KEY>'),
    body := '{}'::jsonb
  );
  $$
);
