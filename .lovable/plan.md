## Why "Welcome back" appears after Google sign-in

Both `LoginDialog` and the `/auth` page tell Google to redirect back to `window.location.origin + "/auth"`. `/auth` is the sign-in page whose header literally reads **"Welcome back"** (its default `mode` is `"signin"`). So the flow is:

1. You click **Start planning** or **Continue with Google**.
2. Google finishes, browser lands on `/auth`.
3. `/auth` renders in `signin` mode → "Welcome back" flashes.
4. Then the post-OAuth code runs `getUser()` + role lookup and navigates you onward (to `/auth/role`, `/onboarding`, or `/dashboard`).

The screen is correct-ish for returning users, but wrong for a brand-new signup and confusing in every case because the "Welcome back" title paints before the redirect fires.

## Fix

1. **Stop landing OAuth on the sign-in page.** Change `redirect_uri` in `src/components/login-dialog.tsx` and `src/routes/auth.tsx` from `"/auth"` to a neutral callback: `${window.location.origin}/auth/callback`.
2. **Add `src/routes/auth.callback.tsx`** — a tiny route that renders a branded "Signing you in…" spinner (no "Welcome back" copy) and, once `supabase.auth.getUser()` resolves, runs the same role-based routing logic already used in `LoginDialog` (`user_roles` lookup → `/auth/role` for brand-new users, `/dashboard` or `/onboarding` for returning users). This keeps the intermediate screen honest regardless of whether the user is new or returning.
3. **Guard `/auth` against already-authenticated visitors.** If `getUser()` returns a session on mount, immediately `navigate` to the same role-based destination instead of rendering the "Welcome back" hero. This covers the edge case of a signed-in user reopening `/auth` directly.
4. **Preserve intent from the dialog.** Persist the dialog's `initialMode` ("signin" vs "signup") in `sessionStorage` before calling `signInWithOAuth`, so the callback can distinguish "new signup" from "returning login" if we ever want different copy on the spinner.

No changes to backend, RLS, or the role picker itself.

## Files touched

- `src/components/login-dialog.tsx` — update `redirect_uri`, stash intent.
- `src/routes/auth.tsx` — update `redirect_uri`, redirect authenticated users away on mount.
- `src/routes/auth.callback.tsx` (new) — spinner + role-aware routing.