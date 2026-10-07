-- Freeform "About" sections (each its own header + body, e.g. a venue can
-- add "Getting there" with directions alongside or instead of the plain
-- business description) and an FAQ list (question + answer pairs) for the
-- restructured venue detail page (Overview / Gallery / About / Testimonials
-- / FAQ). Both are jsonb arrays rather than new tables — small, always
-- read/written as a whole list with the rest of venue_details, no need for
-- their own RLS/foreign keys.
ALTER TABLE public.venue_details
  ADD COLUMN IF NOT EXISTS about_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
