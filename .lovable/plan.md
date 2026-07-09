## Goal

Change only the auth flow (technical process). Keep all current copy, formatting, colors, and visuals as-is. Users should sign up with email/Google first, then pick a role, and be able to switch roles later — Notion-style workspace switching.

## Flow changes

**New signup path**
1. `/auth` — email + password OR Google. No role selection.
2. After account is created, if the user has no role yet → redirect to `/auth/role` (new page) to pick one of: Couple, Planner, Venue, Vendor, Seller. Uses the same visual role-picker we already have on `/auth`, just moved to after signup.
3. On pick → insert into `user_roles`, then route to the correct first page (couple → `/onboarding` or `/dashboard`, vendor → vendor dashboard, etc.).

**Login path** (existing users)
- `/auth` login → look up roles. If ≥1 role, go straight to that role's home. If somehow none, go to `/auth/role`.

**Switch role later (Notion-style)**
- Add a workspace switcher in the sidebar header showing the current role with a dropdown of the user's other roles + "Add another role…".
- "Add another role" opens the same `/auth/role` picker; adds a row to `user_roles` (multi-role allowed — table already has `unique(user_id, role)` so it's safe).
- Switching just changes the active role in local state + navigates to that role's home. No re-auth.

## Technical details

- Remove role branching from `src/routes/auth.$role.tsx` signup submit — signup becomes role-agnostic. Keep the role-picker landing but treat clicks as "hint" only; the actual role is captured post-signup.
- Simpler: collapse `/auth/$role` down to a single `/auth` page (email/google), and add `/auth/role` for post-signup role selection. Keep old routes as redirects so existing links don't break.
- `handle_new_user` DB trigger currently reads `raw_user_meta_data->>'signup_role'` and defaults to `couple`. Change default behavior: if no `signup_role` in metadata, DO NOT insert into `user_roles` — the app will insert after the user picks. Profile row is still created.
- Add a small `useActiveRole()` hook that reads all rows from `user_roles` for the current user, stores the active one in `localStorage` (`vowzy.activeRole`), and exposes `setActiveRole`.
- Route guards: `_authenticated` layout — if user has zero roles, redirect to `/auth/role`. Existing role-specific pages check `useActiveRole()` instead of the URL segment.
- Sidebar workspace switcher component: shows active role, dropdown with other roles + "Add another role".
- Google OAuth: `redirect_uri` stays on a public callback that then routes to `/auth/role` (if new) or the role home (if existing).

## Files touched

- `src/routes/auth.tsx` (new consolidated email/google page) + keep `src/routes/auth.$role.tsx` as a redirect
- `src/routes/auth.role.tsx` (new — post-signup role picker)
- `src/routes/_authenticated/route.tsx` — no-role redirect (only if project-owned; skip if integration-managed)
- `src/hooks/use-active-role.ts` (new)
- `src/components/app-shell.tsx` — add workspace switcher in sidebar header
- Migration: update `handle_new_user` to skip default role insert when metadata has no `signup_role`

## Out of scope

No copy changes, no visual changes, no palette changes, no new pages beyond the two auth routes above.
