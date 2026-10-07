# Analytics events

WEDthread reports 15 events to Google Analytics 4 (measurement ID `G-NFYMMPD7DC`) through the Google tag (gtag.js).
They are sent only after a visitor accepts analytics cookies in the cookie banner. No event carries a name,
email, phone number, guest detail or any free text.

## How it works

- `src/lib/cookie-consent.ts`: stores the visitor's cookie choice, loads the Google tag (and Tag Manager) only after
  they accept, and exports `gtag()`.
- `src/routes/__root.tsx`: sets Google Consent Mode to "denied" first thing in `<head>`; if the visitor already
  accepted on an earlier visit it loads the Google tag straight away.
- `src/lib/analytics.ts`: the one function used everywhere to report an event:

```ts
import { gtag, readConsent } from "@/lib/cookie-consent";

type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined" || !readConsent()?.analytics) return;
  gtag("event", event, params);
}
```

To report a new event anywhere in the app:

```ts
import { track } from "@/lib/analytics";
track("event_name", { some_detail: "value" });
```

In Google Analytics the same call appears as `gtag('event', 'event_name', { some_detail: 'value' })`.

## The 15 events

| # | Event | Details sent | When it fires | Code |
|---|---|---|---|---|
| 1 | `sign_up` | `method`, `account_type` | Someone creates an account | `src/routes/auth.index.tsx` |
| 2 | `login` | `method` | Someone signs in | `src/routes/auth.index.tsx` |
| 3 | `wedding_created` | `has_destination`, `guest_count_estimate` | A couple completes the setup popup | `src/components/create-wedding-dialog.tsx` |
| 4 | `website_published` | none | A couple publishes their wedding website | `src/routes/_authenticated/website.tsx` |
| 5 | `registry_item_added` | `item_type` (`gift` or `fund`) | A new registry item is added | `src/routes/_authenticated/registry.tsx` |
| 6 | `guest_added` | none | A guest is added | `src/routes/_authenticated/guests.tsx` |
| 7 | `guests_imported` | `guest_count` | A guest list is imported | `src/routes/_authenticated/guests.tsx` |
| 8 | `event_created` | none | A wedding event is added | `src/routes/_authenticated/events.tsx` |
| 9 | `expense_added` | none | A budget expense is added | `src/routes/_authenticated/budget.tsx` |
| 10 | `rsvp_response` | `response` (`attending`, `declined`, `maybe`) | A guest answers on their own RSVP link | `src/routes/rsvp.$token.tsx` |
| 11 | `rsvp_submitted` | none | A guest finishes the open RSVP form | `src/routes/rsvp.w.$slug.tsx` |
| 12 | `enquiry_sent` | none | A couple sends an enquiry to a vendor or venue | `src/components/enquire-form.tsx` |
| 13 | `viewing_requested` | none | A couple requests a venue viewing | `src/components/book-viewing-dialog.tsx` |
| 14 | `collaborator_invited` | none | The owner invites a collaborator | `src/routes/_authenticated/settings.profile.tsx` |
| 15 | `partner_cta_click` | `location` (`footer` or `homepage_vendors_row`) | Someone clicks "Become a partner" | `src/components/site-footer.tsx`, `src/routes/index.tsx` |

## The exact call for each event

```ts
track("sign_up", { method: "email", account_type: role });
track("login", { method: "email" });
track("wedding_created", { has_destination: !!form.destination_city.trim() || !!form.destination_country.trim(), guest_count_estimate: form.est_guest_count.trim() ? Number(form.est_guest_count) : undefined });
track("website_published");
track("registry_item_added", { item_type: fund ? "fund" : "gift" });
track("guest_added");
track("guests_imported", { guest_count: inserts.length });
track("event_created");
track("expense_added");
track("rsvp_response", { response: status });
track("rsvp_submitted");
track("enquiry_sent");
track("viewing_requested");
track("collaborator_invited");
track("partner_cta_click", { location: "footer" });                // footer link
track("partner_cta_click", { location: "homepage_vendors_row" });  // card at the end of the vendors row
```

## Setting up in Google Analytics

- **Key events** (Admin → Key events): `sign_up`, `wedding_created`, `website_published`, `enquiry_sent`,
  `viewing_requested`, `rsvp_submitted`, `partner_cta_click`.
- **Custom dimensions** (Admin → Custom definitions, scope: Event): `account_type`, `item_type`, `location`,
  `response`, `has_destination`.
- **Custom metrics** (scope: Event): `guest_count`, `guest_count_estimate`.
- Page views are collected by the Google tag's enhanced measurement (including moving between pages on the site).

## Rules

- Never pass personal information (names, emails, phone numbers, guest details, free text) to `track()`.
- Events are only sent after consent. Do not call `gtag` directly in app code; use `track()`.
- Keep one Google tag per page. Do not also add a Google Analytics tag with the same ID inside Tag Manager.
