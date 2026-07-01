# Vowzy — Multicultural Wedding Planning Platform

Rename locked to **Vowzy** (placeholder). Phase 1 is now **planning-complete**: every couple-side tool ships fully working, not skeletal. Discovery pages (venues/vendors) are read-only browse with seeded data so entry points aren't dead. Phase 2 flips vendors from seed data to real self-signup and turns the app into a two-sided marketplace.

## Decisions I've made for you

- **Design direction:** *Artisan Journal* — paper `#FDFCFB`, ink `#27272A`, clay `#A34E36` accent, Cormorant Garamond display + Public Sans body. Warm, editorial, culturally plural. Not basic: real illustration/typography commitment across every screen, not stock shadcn cards.
- **Backend:** Lovable Cloud (Postgres + Auth + Storage + RLS). Email/password + Google sign-in.
- **WhatsApp provider:** **Twilio WhatsApp Business API** via a Lovable secret (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`). Twilio is the fastest path — sandbox works in minutes for testing, production requires a WhatsApp sender number Twilio approves. If you'd rather use Meta's WhatsApp Cloud API directly, say so before I build and I'll swap the adapter.
- **Wedding site URLs:** `/w/{slug}` in Phase 1. Subdomain rendering is a later DNS switch, not a rewrite.
- **Admin:** first user with email `admin@vowzy.app` gets `admin` role via database trigger (env-configurable). Used in Phase 2 to approve vendors.

## Phase 1 — Planning Complete (full-depth)

Every item below is built end-to-end, not stubbed.

### Auth & onboarding
- `/auth`: email/password + Google
- `/onboarding`: partner names (required), wedding date(s), guest estimate, destination
- Managed `_authenticated/` layout gates the app

### Dashboard `/dashboard` (Artisan Journal reference layout)
Greeting with both partner names + destination, multi-event timeline strip, four progress tiles (Events, Guests, Seating, Website), Discover row for venues/vendors, WhatsApp notifications panel.

### Events `/events`
User-defined events (mehendi, sangeet, nikah, church ceremony, registry, reception — never a fixed dropdown). Each event: name, date, time, venue name + address, city, country, description, sort order. Full CRUD.

### Guests `/guests`
- Add guest manually + **CSV import** (name, email, phone, household)
- Per-event invite toggles (one guest can be invited to some events, not others)
- Per-event RSVP status (pending / attending / declined / maybe) + plus-ones count
- **Dietary restrictions** and **food allergies** (multi-select tags: vegetarian, vegan, halal, kosher, jain, gluten-free, nut allergy, dairy allergy, shellfish allergy, other) with free-text notes
- Accessibility notes
- Household grouping
- Bulk actions: send RSVP invites via WhatsApp, export CSV, filter by event/status/dietary

### Seating chart `/seating`
- Pick an event → manage tables (label, seat count) → assign guests
- **Drag-and-drop** guest chips onto tables (dnd-kit); table-based fallback for mobile
- Live capacity indicators, unseated-guests panel
- Auto-warnings: unseated attending guests, over-capacity tables, dietary clusters per table

### RSVP
- Each published wedding site has an RSVP form (public) that writes to `guest_event_invites`
- Guests can also RSVP via a personal link sent over WhatsApp (unique token per guest)
- Couple sees a real-time RSVP dashboard per event

### WhatsApp automated messaging `/messages`
- Twilio adapter behind a server function (`sendWhatsApp`) called from a TanStack server route
- **Templates**: Save-the-date, RSVP request with unique link, event reminders (T-7, T-1, day-of), thank-you
- **Scheduling**: pick a template + audience (all guests / attending / declined / by event / by dietary tag) + send now or schedule for a date/time
- Per-guest send log with delivery status (queued/sent/delivered/failed) polled from Twilio webhooks (`/api/public/webhooks/twilio`)
- Bulk send respects Twilio rate limits (chunked with backoff)
- If Twilio credentials aren't configured, the UI shows a "Connect WhatsApp" card that walks through getting the credentials — no silent failures

### Wedding website builder `/website`
- **10 distinct templates**, not variants: Editorial Serif, Modern Minimal, Photo-First, Timeline, Split Hero, Postcard, Magazine, Terracotta Warm, Monochrome Ink, Villa Garden
- Section editor: story, photo gallery (Cloud Storage upload), schedule (auto-pulled from events), registry links, RSVP form (writes to guest table), travel/accommodations info for destination guests, FAQ, show/hide toggles per section
- Live preview + publish → public `/w/{slug}` with proper `head()` metadata (title, description, og:title, og:description, og:image from hero)

### Venue & Vendor discovery (read-only, seeded)
- `/venues` + `/venues/{id}`: browse/filter by destination city, country, capacity, price
- `/vendors` + `/vendors/{id}`: browse/filter by category, destination, price range, rating
- Categories seeded (planner, photographer, catering, florist, decor, mehendi artist, DJ, etc.) but the schema is open — Phase 2 lets vendors add categories/tags
- "Request quote" from a vendor writes a `booking_requests` row and (if guest opted in) fires a WhatsApp notification to the couple

## Phase 2 — Vendor Marketplace (built after Phase 1 is signed off)

- `/vendor/signup`: dedicated flow — signup as vendor (not customer), creates `vendors` row with `status = pending`
- Vendor onboarding: business profile, category (pick or create), specialty tags, home city, destinations serviced (multi-select, core to platform), gallery upload, pricing packages
- `/vendor/dashboard`: manage profile, inbox for `booking_requests`, respond with quotes
- `/admin`: pending-vendors queue, approve/reject, user role management
- Reviews: couples who've interacted with a vendor/venue can leave star + written review; visible on public profile
- Resale marketplace `/marketplace`: individual sellers list pre-owned items (title, photos, price, condition, category), buyers browse/filter/inquire
- Payment placeholders (vendor signup fee, per-booking platform fee) wired to UI but not to Stripe yet

## Data model (created in Phase 1, all tables — so Phase 2 needs no destructive migration)

```text
profiles(user_id PK→auth.users, display_name, avatar_url)
user_roles(user_id, role: 'couple'|'vendor'|'admin')   -- separate table, has_role() SECURITY DEFINER

weddings(id, owner_id, partner_a, partner_b, destination_city, destination_country,
         est_guest_count, slug UNIQUE, site_published bool, site_template_id, site_config jsonb)
wedding_collaborators(wedding_id, user_id)

events(id, wedding_id, name, event_date, event_time, venue_name, address,
       city, country, description, sort_order)

guests(id, wedding_id, full_name, email, phone, household_group,
       dietary_tags text[], food_allergies text[], dietary_notes,
       accessibility_notes, rsvp_token UNIQUE)
guest_event_invites(guest_id, event_id, rsvp_status, rsvp_at, plus_ones)

tables_(id, event_id, label, seats)
seat_assignments(table_id, guest_id)

message_templates(id, wedding_id, kind, subject, body)
message_sends(id, wedding_id, template_id, guest_id, channel: 'whatsapp',
              status, provider_message_id, sent_at, delivered_at, error)
message_schedules(id, wedding_id, template_id, audience_filter jsonb, run_at, status)

vendor_categories(id, name, is_default bool)
vendors(id, owner_id, business_name, category_id, tags text[], home_city, home_country,
        destinations_serviced text[], description, hero_image, gallery_urls text[],
        price_min, price_max, status: 'pending'|'approved'|'rejected')
venues(id, name, city, country, capacity, description, hero_image, gallery_urls, price_range)

booking_requests(id, wedding_id, vendor_id, event_id, message, status, quoted_price)
reviews(id, target_type: 'vendor'|'venue', target_id, author_id, rating 1-5, body)
marketplace_listings(id, seller_id, title, description, price, condition, category, photos, status)
marketplace_inquiries(id, listing_id, buyer_id, message)
```

RLS: couples read/write only their own weddings/events/guests/seat/message rows. Approved vendors + venues have narrow `TO anon` SELECT for browse. Published wedding sites (`site_published = true`) have `TO anon` SELECT on the specific row plus its events. Public RSVP submits are gated by the unique `rsvp_token`.

## Design system (Artisan Journal — locked, not basic)

Committed in `src/styles.css` as `@theme` tokens, fonts loaded via `<link>` in `__root.tsx`:

- Cormorant Garamond (500/600, italic) + Public Sans (400/500/600)
- Paper `#FDFCFB`, ink `#27272A`, clay `#A34E36`, warm stone neutrals
- Rounded-[24px]/[32px] cards, ring-1 black/5 hairlines, restrained shadow-sm, generous whitespace
- Editorial photography with real generated hero imagery per template + venue seed
- No default shadcn button styling on hero CTAs, no purple gradients, no floral clipart, no single-culture motifs

## What you'll need to provide after I start building

1. **Twilio credentials** for WhatsApp sending (I'll prompt via secure secret entry when I reach the messaging module — you don't paste them in chat)
2. Optional: change `VITE_ADMIN_EMAIL` from `admin@vowzy.app` if you prefer a different admin

## Explicitly out of scope even in Phase 2

Native iOS/Android app, live Stripe payments, real-time chat, SMS (WhatsApp only for Phase 1).
