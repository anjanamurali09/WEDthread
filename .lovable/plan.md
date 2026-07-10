## Changes

### 1. Sign out → homepage
- Update the sign-out handler (in `src/components/app-shell.tsx` and/or `WorkspaceSwitcher`) so after `supabase.auth.signOut()` it navigates to `/` instead of `/auth`.

### 2. Cursor pointer on clickables
- Add a global rule in `src/styles.css`:
  ```css
  button, [role="button"], a, [data-clickable], summary, label[for], select, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"] { cursor: pointer; }
  button:disabled, [role="button"][aria-disabled="true"] { cursor: not-allowed; }
  ```

### 3. Remove Vowzy highlight
- In `src/routes/index.tsx` nav logo, drop the cherry-filled sparkle badge hover treatment and use a plain, subtle wordmark (no colored circle background, no hover rotate). Keep it as a simple serif "Vowzy" link, matching the rest of the site's quiet tone.

### 4. Home page copy
Update `src/routes/index.tsx` hero:
- Eyebrow: `FOR EVERY WEDDING, ANYWHERE`
- Headline: `One place for every event your wedding needs.` with italic cherry emphasis on `Big, small, traditional, or entirely your own.`
- Sub-eyebrow row (replacing the current "Destination-native · WhatsApp built in · Every culture" strip): `MULTI-EVENT PLANNING · FIND VENUES & VENDORS · SELL & BUY WITH US`
- Remove the old "Many ceremonies. Many cultures. One plan." headline and its paragraph.

No backend, routing, or other page changes.
