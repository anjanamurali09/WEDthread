# Looker Studio dashboard

One report with two kinds of data: the app's own numbers from Supabase (weddings, sign-ups,
marketplace, feedback) and website traffic from Google Analytics 4. Looker Studio cannot be
created from code, so this folder holds the data side and the steps for the rest.

## 1. Give Looker read-only access to Supabase (run once)

1. Open `looker_setup.sql`, replace `CHANGE_ME_PASSWORD` with a long random password from a
   password manager, and keep that password for step 2. Do not commit the edited file.
2. Paste the file into the Supabase SQL editor and run it. It adds a `looker` schema of
   views and a `looker_reader` login that can only read those views. Nothing existing changes.
3. To undo it: `drop schema looker cascade; drop role looker_reader;`

| View | One row per | Use it for |
|---|---|---|
| `looker.couples` | wedding | Who signed up, where, owner email (private) |
| `looker.accounts` | account | Sign-ups over time, by role |
| `looker.wedding_activity` | wedding | Guests, events, expenses, enquiries per wedding |
| `looker.businesses` | venue or vendor | Listings by type, city, approval status |
| `looker.enquiries` | enquiry | Enquiries over time and by type |
| `looker.feedback` | message | Ratings and comments |
| `looker.waitlist` | request | Which upcoming features people want |

## 2. Connect Looker Studio to Supabase

Use the **session pooler**, not the direct host: the direct host is IPv6 only and Looker
Studio cannot reach it.

1. Supabase dashboard → **Connect** → **Session pooler**: note the host and port (5432).
2. Supabase → Project Settings → Database → SSL: download the certificate.
3. lookerstudio.google.com → **Create → Report → Add data → PostgreSQL**.
4. Fill in: host and port from step 1, database `postgres`, username
   `looker_reader.pthcamxqautjjsppbfaj`, the password from step 1 of part 1, tick **Enable
   SSL** and upload the certificate. Authenticate.
5. Pick a table under schema `looker`, then **Add**. Repeat **Add data** for each view you want.

## 3. Add Google Analytics

**Add data → Google Analytics**, choose the account and the property for measurement ID
`G-NFYMMPD7DC`. Visits only appear for people who accepted analytics cookies (see
`ANALYTICS.md`), so traffic is lower than reality.

## 4. Suggested pages

- **Overview**: scorecards for total weddings, new this week, total accounts, listed
  businesses; line chart of `wedding_created_date`; geo chart by `destination_country`;
  table of the newest couples.
- **Usage**: average guests per wedding, share with a published site, guests who replied,
  weddings with at least one expense or event.
- **Marketplace**: businesses by `business_type` and `verification_status`, enquiries per day,
  enquiries by business type and city, most saved listings.
- **Traffic** (Google Analytics): users, sessions, source / medium, top pages, country,
  events.
- **Feedback**: ratings over time, latest comments, waitlist by feature.

## 5. Things to know

- `couples` has names and emails. Share the report only with people who should see them.
- Looker Studio refreshes its data on a timer (default about 12 hours; set it lower under
  the data source's **Data freshness**).
- Supabase and Analytics numbers sit side by side but cannot be joined per person; they
  share only dates.
- Never put the `looker_reader` password in the repo or in chat.
