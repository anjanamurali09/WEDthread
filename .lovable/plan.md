## Goal
Make Vowzy role-aware: vendors and venues get their own onboarding, their own dashboard, and couples/planners see a "contact" flow that captures leads with UTMs.

---

## 1. Role-specific onboarding (right after signup / "Add role")

New route: `/onboarding/$role` (under `_authenticated`). After `/auth/role`, non-couple roles are sent here instead of straight to the landing.

**Vendor onboarding form** → writes a row into `vendors` (status = `pending`):
- Business name * , contact name, email, phone (WhatsApp)
- Country * , city
- Tier‑1 category * , Tier‑2 subcategories (multi)
- Short description, long description
- Price tier: `$ / $$ / $$$ / $$$$ / $$$$$`
- Preferred currency (dropdown, defaults from country: AED, USD, INR, GBP, EUR…)
- Photos (up to 10) + optional video URL
- Website, Instagram
- Years in business, service area radius / countries served

**Venue onboarding form** → writes a row into `venues` (status = `pending`):
- Venue name * , country * , city * , address
- Capacity (seated / standing)
- Facilities checklist (parking, in‑house catering, alcohol licence, accommodation, AV, bridal suite, outdoor space, pool, beachfront…)
- Restrictions (no outside catering, alcohol restrictions, noise curfew, religious restrictions…)
- Price tier `$…$$$$$` + preferred currency
- Photos (up to 15), video URL
- Website, contact email/phone (WhatsApp)

**Seller / Planner** keep their current lightweight flow (name + short bio only, no gate).

Both forms auto-save (debounced) and show a "Submitted for review" state until an admin approves.

---

## 2. Role-specific dashboard

`/dashboard` becomes a router that renders one of:
- **CoupleDashboard** — today's shell (events, RSVPs, registry, website).
- **VendorDashboard** — my listing status, profile completeness %, incoming leads, reviews, "Edit my listing" button.
- **VenueDashboard** — same shape as vendor, tuned to venue fields.
- **PlannerDashboard** — list of couples they're planning for (existing shell), unchanged.
- **SellerDashboard** — my marketplace listings (thin wrapper on existing marketplace table).

Sidebar in `AppShell` also becomes role-aware: vendors/venues see "My Listing", "Leads", "Reviews" instead of "Events / Guests / Seating / Registry".

---

## 3. "I'm interested" lead flow (on public vendor & venue cards)

On `/vendors` and `/venues` cards, add two buttons:
- **WhatsApp** — opens `https://wa.me/<number>?text=<prefilled>` where the message is prefilled with the couple's names, wedding date, city, and a `utm_source=vowzy&utm_medium=referral&utm_campaign=vendor_whatsapp|venue_whatsapp` tag appended as a trailing line for attribution.
- **I'm interested** — opens a modal lead form; fields auto-populate from the signed-in couple's wedding (names, date, city, guest count, budget range). Submitting inserts into a new `booking_leads` table with `utm_source=vowzy`, `utm_medium=referral`, `utm_campaign=vendor_inquiry|venue_inquiry`, and `target_vendor_id` or `target_venue_id`.

Vendors/venues then see these leads on their dashboard under **Leads**.

---

## 4. Database changes (single migration)

- `vendors`: add `price_tier smallint` (1–5), `currency text`, `long_description text`, `photos text[]`, `video_url text`, `website text`, `instagram text`, `years_in_business int`, `countries_served text[]`, `subcategory_ids uuid[]`, `whatsapp text`. (Keep existing `status`, RLS, and admin-gated status change trigger.)
- `venues`: add `capacity_seated int`, `capacity_standing int`, `facilities text[]`, `restrictions text[]`, `price_tier smallint`, `currency text`, `photos text[]`, `video_url text`, `website text`, `whatsapp text`, `owner_id uuid`, `status text default 'pending'`. RLS: owner can insert/update own; public read only when `status='approved'`; admin full.
- `booking_leads` (new): `id`, `wedding_id`, `sender_user_id`, `target_vendor_id`, `target_venue_id`, `message`, `contact_email`, `contact_phone`, `event_date`, `guest_count`, `city`, `budget_min`, `budget_max`, `utm_source`, `utm_medium`, `utm_campaign`, `created_at`, `status` (new/read/replied/archived). RLS: sender can insert + read own; target owner can read + update status.
- GRANT + RLS on every new/altered public table per template rules.

---

## 5. Routing & files

**New**
- `src/routes/_authenticated/onboarding.$role.tsx` — dispatcher.
- `src/components/onboarding/vendor-form.tsx`, `venue-form.tsx`, `seller-form.tsx`, `planner-form.tsx`.
- `src/components/dashboards/{couple,vendor,venue,planner,seller}-dashboard.tsx`.
- `src/components/lead-dialog.tsx` — the "I'm interested" modal.
- `src/lib/lead-utm.ts` — helper that builds the UTM query string / WhatsApp message.
- `src/routes/_authenticated/leads.tsx` — vendor/venue inbox.

**Modified**
- `src/routes/_authenticated/dashboard.tsx` — becomes a role dispatcher using `useActiveRole()`.
- `src/components/app-shell.tsx` — role-aware sidebar items.
- `src/routes/_authenticated/vendors.tsx` and `venues.tsx` — add WhatsApp + "I'm interested" buttons on each card.
- `src/routes/auth.role.tsx` and `src/components/add-role-dialog.tsx` — after picking a non-couple role, route to `/onboarding/$role` instead of the plain landing.
- `src/hooks/use-active-role.ts` — `ROLE_LANDING` becomes a function `roleLandingFor(role, {hasListing})` so vendors/venues without a listing go to onboarding.

**Untouched**
- Homepage, auth pages, registry, website editor, RSVP flow, existing couple UX.

---

## 6. UTM convention (single source of truth in `src/lib/lead-utm.ts`)

```
utm_source   = "vowzy"
utm_medium   = "referral"
utm_campaign = "vendor_inquiry" | "vendor_whatsapp"
              | "venue_inquiry"  | "venue_whatsapp"
utm_content  = <vendor_id | venue_id>
```

Same helper is reused later for outbound registry links so attribution is consistent.

---

## Out of scope for this plan
- Admin approval queue UI (rows land as `pending`; a lightweight approval page can come next).
- Payments / paid promotions for vendors.
- Reviews write path (read-only card badge only).
