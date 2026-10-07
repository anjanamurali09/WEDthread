-- City/address (alongside the existing country field) and a freeform social
-- media/website field — captured at onboarding (both the self-serve wizard
-- and the admin "Add a vendor/venue" form), all nullable/optional.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS social_media TEXT;
