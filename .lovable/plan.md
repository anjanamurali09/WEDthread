## Goal
Tighten the authenticated sidebar spacing so the workspace dropdown reads as distinct sections, and brighten the couple dashboard by giving the stat/discover cards distinct pastel backgrounds from the brand palette.

## Files to change
1. `src/components/app-shell.tsx` — sidebar layout and workspace switcher
2. `src/components/dashboards/couple-dashboard.tsx` — dashboard stat + discover cards

## Plan

### Sidebar polish
- Increase vertical spacing between the logo, the workspace dropdown, and the dropdown rows (use larger `mb` / `gap` values, e.g. `mb-6` after logo, `mt-5` before switcher).
- Add a subtle horizontal divider (`h-px bg-line/60`) inside the workspace dropdown between the "WORKSPACE / Couple" value and the "Switch" rows below, so the label/value reads as its own section.
- Fix the "Add another role" button overflow by removing any negative margins or full-bleed widths and ensuring it sits inside the dropdown's padding with `w-auto` or `mx-3` rounded styling so it never crosses the sidebar padding.
- Keep all existing functionality (switch role, add role dialog, active-state nav).

### Dashboard color variety
- Update the four stat tiles (`Events`, `Guests`, `RSVPs`, `Website`) to each use a distinct pastel background from the existing palette:
  - Events: `bg-sage-soft`
  - Guests: `bg-blush-soft`
  - RSVPs: `bg-cream`
  - Website: `bg-wine-soft`
- Keep dark `text-ink` labels/values and `text-muted-foreground` subtext for readability.
- Update the two Discover cards (`Destination venues`, `Vendors`) with subtle tints:
  - Venues card: `bg-sage-soft/70`
  - Vendors card: `bg-blush-soft/70`
- Preserve the current layout, spacing, hover shadow, and typography.

## Verification
- Run a quick preview check to confirm the sidebar dropdown no longer feels cramped and the "Add another role" button stays within the sidebar padding.
- Confirm the dashboard stat cards show four distinct pastel backgrounds and the Discover cards show green/pink tints with readable dark text.