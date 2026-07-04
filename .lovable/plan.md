# Plan

Big scope — grouping into 6 focused workstreams. I'll ship in 2 passes so each pass builds cleanly.

## Pass 1 — Foundation (this turn)

### 1. Fix `&amp;` HTML entities
Root cause: strings written as `&amp;` in JSX render literally. Grep all routes and replace `&amp;` → `&` in visible copy ("Food & allergies", "Aria & Rohan", etc.).

### 2. New palette — pearl white / cream / cherry
Rewrite `src/styles.css` tokens:
- `--pearl: #FDFCF7` (bg)
- `--cream: #F7F1E3`
- `--beige: #E8DFC9`
- `--wine: #6B0F1A` (deep wine primary accent)
- `--cherry: #C21E38` (cherry red highlight)
- `--ink: #1A1512`
- Muted warm greys
Update `--primary`, `--ring`, `--sidebar-primary`, chart colors, `.dark` overrides. Keep Fraunces + Instrument Sans.

### 3. Registry visibility after sign-in
Diagnose in `src/routes/_authenticated/registry.tsx` (or create route). Ensure queries use `enabled: !!user` and refetch on `SIGNED_IN`. Verify RLS policies via `supabase--read_query`.

### 4. Vendor 2-level taxonomy + tags
- Migration: add `parent_id` to `vendor_categories` (self-FK), seed Tier 1 categories (Beauty, Attire, Decor, Photography/Film, Catering, Music/Entertainment, Planning, Stationery, Florals, Venues) and Tier 2 subcategories (Mehendi/Henna Artist, Bridal Makeup, Invitation Designer, Florist, Caterer, DJ, etc.).
- Vendors table already has `tags text[]`.
- Rewrite `/vendors` page with Tier 1 chip row → Tier 2 chips → tag filter chips + search.

### 5. Role-split auth routes
Create separate routes:
- `/signup/couple`, `/signup/venue`, `/signup/vendor`, `/signup/seller`
- `/login/couple`, `/login/planner`, `/login/venue`, `/login/vendor`
- Keep `/auth` as landing that lists the 8 options.
Each signup sets a role via `user_roles` (extend `app_role` enum with `venue`, `vendor`, `seller`, `planner`). `handle_new_user` reads role from `raw_user_meta_data.signup_role`.

## Pass 2 — Website editor (next turn, ~1 turn)

### 6. 20 templates + full visual editor
- Migration: `website_sections` table (id, wedding_id, template_id, section_type, sort_order, content jsonb, image_url, visible).
- Expand `TEMPLATES` to 20 entries.
- New route `/website/edit` with:
  - Section list (drag-reorder via `@dnd-kit/sortable`)
  - Per-section inline text editors + photo upload to `wedding-assets` bucket
  - Show/hide toggle
  - Color + accent-font overrides stored on `weddings.site_customization jsonb`
- `/w/$slug` renders sections in order using stored content.

---

## Technical notes

- Migration includes: `vendor_categories.parent_id`, seed data, enum expansion, `weddings.site_customization jsonb default '{}'`.
- Registry fix likely a query `enabled` guard, not schema.
- Delete AI-image imports still referenced anywhere; keep Unsplash URLs.
- All new routes get proper `head()` metadata.

Reply "go" to run Pass 1.
