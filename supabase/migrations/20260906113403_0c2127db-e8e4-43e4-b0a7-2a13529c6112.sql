-- The 'wedding-assets' storage bucket itself was never created — earlier migrations
-- (20260703084749 etc.) only set up RLS policies on storage.objects assuming it existed,
-- causing every upload to fail with "Bucket not found". Public because the app reads these
-- URLs via getPublicUrl() everywhere, including the public unauthenticated /w/$slug site —
-- write access (insert/update/delete) still goes through the existing owner-only RLS
-- policies on storage.objects regardless of the bucket's public read setting.
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-assets', 'wedding-assets', true)
ON CONFLICT (id) DO NOTHING;
