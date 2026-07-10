## Problem

Clicking **Start planning** on the landing page passes `initialMode="signup"` to `LoginDialog`, but the dialog opens in "Welcome back / Sign in" mode.

Root cause: `src/components/login-dialog.tsx` initializes `mode` with `useState<Mode>(initialMode)`. React only reads that initializer on first mount. Since the dialog is always mounted (only `open` toggles), later prop changes to `initialMode` are ignored — whichever mode was used first sticks.

## Fix

In `src/components/login-dialog.tsx`, sync `mode` with `initialMode` whenever the dialog opens:

- Add a `useEffect` that resets `mode` to `initialMode` when `open` transitions to `true` (or when `initialMode` changes while open).
- Keep the existing toggle link so users can still switch between sign in and sign up inside the dialog.

No other files need to change — `src/routes/index.tsx` already passes the correct `initialMode` for each button ("signin" for the header link, "signup" for both "Start planning" CTAs).