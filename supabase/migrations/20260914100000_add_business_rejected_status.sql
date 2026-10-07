-- Adds 'rejected' to business_verification_status so admin review can
-- actually reject a submission, not just approve it. Postgres requires this
-- as its own statement (can't be used in the same transaction it's added
-- in), so this migration does nothing else.
ALTER TYPE public.business_verification_status ADD VALUE IF NOT EXISTS 'rejected';
