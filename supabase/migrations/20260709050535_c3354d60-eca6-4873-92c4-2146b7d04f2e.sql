
DROP POLICY IF EXISTS "registry public read" ON public.registries;
CREATE POLICY "registry public read" ON public.registries
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "registry items public read" ON public.registry_items;
CREATE POLICY "registry items public read" ON public.registry_items
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.registries r
    WHERE r.id = registry_items.registry_id AND r.is_public = true
  ));

-- Allow public lookup of the wedding's display name/slug for a shared registry page.
-- Weddings already have a "public if published" policy; add a narrow one so a
-- registry share link works even before the site is published.
DROP POLICY IF EXISTS "wedding public read via public registry" ON public.weddings;
CREATE POLICY "wedding public read via public registry" ON public.weddings
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.registries r
    WHERE r.wedding_id = weddings.id AND r.is_public = true
  ));
