-- Separate URL fields per platform, replacing the old free-text
-- businesses.social_media field (left in place, just unused going forward —
-- dropping a column is destructive and not needed here).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

NOTIFY pgrst, 'reload schema';
