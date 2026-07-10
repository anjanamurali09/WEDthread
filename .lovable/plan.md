## Fixes

**1. Role picker only appears on sign-up — never on sign-in**
- `LoginDialog` + `/auth` page: split routing.
  - **Sign up** flow → after `signUp()` succeeds, send user to `/auth/role`. This is the only path that shows the picker.
  - **Sign in** flow (email/password, Google) → never touch `/auth/role`. Look up existing roles; go straight to that role's landing (couple → `/dashboard` or `/onboarding` if no wedding yet). If somehow no role exists on a sign-in, default silently to `couple` and continue — no picker.
- "Start planning" CTA on landing and "Sign in" both open the LoginDialog in sign-in mode (they already do). Sign-up mode is only reachable via the "Create an account" toggle inside the dialog or the `/auth` full page.
- Everything else (profile row, wedding auto-save) already happens on first sign-in via the `handle_new_user` trigger — no changes needed there.

**2. In-app "Add another role" (no re-login)**
- New `src/components/add-role-dialog.tsx` — modal listing the 5 roles (same copy/icons as `/auth/role`). On pick: `addRoleForCurrentUser(role)`, switch active, close, navigate to that role's landing. Runs inside the authenticated shell — no session check, no redirect.
- Update `src/components/app-shell.tsx`: replace the `<Link to="/auth/role" search={{ add: "1" }}>` item with a button that opens the dialog.
- `/auth/role` route stays for the true post-signup step.

**3. Reset the leftover 'couple' role on your account**
- Delete the `user_roles` row for `anjana9596@gmail.com` (via insert tool).
- Since sign-in no longer forces the picker, on your next sign-in you'll be defaulted to `couple` silently and land on `/dashboard` (or `/onboarding` if no wedding). To pick a different starting role, sign out and use "Create an account" — or use the new "Add another role" dialog once signed in.

No other changes.