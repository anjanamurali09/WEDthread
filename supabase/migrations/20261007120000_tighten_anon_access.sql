-- Least privilege for signed-out (anon) visitors.
--
-- Supabase gives the anon role every privilege on every table by default; row-level security is what
-- actually stops access. This removes the unneeded privileges as a second lock, and limits what a
-- published wedding site exposes: visitors can read a wedding's public fields only, not its owner,
-- budget, guest count or dashboard settings.
--
-- Run this AFTER the site code that lists explicit wedding columns is live (the public wedding page
-- used to read the whole row, which this would block).

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Read-only access to the tables that have a public-read policy (each policy still decides which rows).
GRANT SELECT ON
  public.affiliate_partners, public.app_settings, public.business_media, public.businesses,
  public.enquiry_rates, public.events, public.lead_form_fields, public.lead_forms,
  public.marketplace_listings, public.registries, public.registry_items, public.reviews,
  public.vendor_categories, public.vendor_services, public.vendors, public.venue_details,
  public.venues, public.website_sections, public.wedding_photos
TO anon;

-- Weddings: public fields only.
GRANT SELECT (
  id, partner_a, partner_b, slug, destination_city, destination_country, site_published,
  site_template_id, site_customization, site_config, hero_image_url, cover_photo_url,
  story_html, welcome_message, accent_color, site_sections
) ON public.weddings TO anon;

-- Tables created from now on are not readable by anon unless a migration grants it.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

NOTIFY pgrst, 'reload schema';
