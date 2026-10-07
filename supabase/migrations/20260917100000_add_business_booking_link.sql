-- Optional external calendar/scheduling link (e.g. Calendly) for "Book a
-- viewing" — when set, that button just links straight out to it instead of
-- opening the in-app time-slot request popup.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS booking_link_url TEXT;

NOTIFY pgrst, 'reload schema';
