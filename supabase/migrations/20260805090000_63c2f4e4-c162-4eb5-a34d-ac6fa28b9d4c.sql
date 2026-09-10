-- Messages: support logging an email send (mailto: click-to-send, same pattern as
-- WhatsApp's click-to-chat). to_phone was NOT NULL with no email equivalent, so an
-- email-channel send had nowhere to record its recipient.
ALTER TABLE public.message_sends ALTER COLUMN to_phone DROP NOT NULL;
ALTER TABLE public.message_sends ADD COLUMN IF NOT EXISTS to_email text;
