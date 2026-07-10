## Root cause

The generated route tree now treats `src/routes/auth.tsx` as a **layout with children** (`AuthRouteWithChildren`) because two child routes exist alongside it: `auth.role.tsx` and the new `auth.callback.tsx`.

TanStack Router expects any parent/layout route to render `<Outlet />` so children can mount. But `auth.tsx` renders `<AuthPage>` (the "Welcome back" screen) with no `<Outlet />`. So when the browser visits `/auth/callback` or `/auth/role`, the URL matches the child route, but the parent slot never gives it a place to render — the user just sees `AuthPage`. `AuthPage`'s new `useEffect` then detects a session and pushes back to `/auth/callback`, which lands on the same broken parent → infinite ping-pong. Same reason `/auth/role` was flashing earlier.

## Fix

Convert `/auth` into a proper layout + index pair:

1. **Rename `src/routes/auth.tsx` → `src/routes/auth.index.tsx`** and update its `createFileRoute("/auth")` → `createFileRoute("/auth/")`. All the current sign-in UI stays here unchanged (it becomes the `/auth` leaf).
2. **Create a new `src/routes/auth.tsx`** as a minimal pathless layout: `createFileRoute("/auth")({ component: () => <Outlet /> })`. No SSR guard, no auth logic.
3. Leave `auth.role.tsx` and `auth.callback.tsx` untouched — they will now mount correctly inside the new `<Outlet />`.

That removes the loop: `/auth/callback` renders the spinner, resolves the session, and routes to `/auth/role` (new users) or `/dashboard` (returning users).

## Files touched

- `src/routes/auth.tsx` (new, tiny layout with `<Outlet />`)
- `src/routes/auth.index.tsx` (renamed from current `auth.tsx`, path updated to `/auth/`)