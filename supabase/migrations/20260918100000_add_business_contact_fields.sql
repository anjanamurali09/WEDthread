-- Contact email/phone for the Key Info section — sits alongside the
-- existing website_url/social links, all shown together to the right of
-- the address block on the venue detail page.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

NOTIFY pgrst, 'reload schema';
