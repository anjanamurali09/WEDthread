# Plan: Canvas Seating + Event Planning Hubs

Two structural changes. I'll ship them in one pass, but they're independent — each can be reviewed on its own.

---

## 1. Seating → visual floor plan canvas

Replace the current card grid with a two-pane layout:

```text
┌──────────────┬────────────────────────────────────┐
│ Manage       │                                    │
│ guests       │        Floor canvas                │
│ (sidebar)    │        (drag tables + fixtures)    │
│              │                                    │
│ • Akila M.   │        ○ Table 1     ▭ Bar        │
│ • Priya R.   │                                    │
│ …            │        [+ Add table]               │
└──────────────┴────────────────────────────────────┘
```

**Canvas behavior**
- Full-bleed canvas per event, customizable floor color (color picker in toolbar).
- Toolbar actions: Add round table, Add rectangular table, Add dance floor, Add bar, Add stage, Add entrance.
- Every element is freely draggable within the canvas (pointer-based, snapping optional to a 10px grid).
- Tables and rectangular fixtures are resizable via a corner handle.
- Selecting a table opens an inline popover: shape (round/rect/square), seat count, tablecloth color, label.
- Selecting a fixture opens: label, fill color, size.

**Guest sidebar**
- "Manage guests" heading, event picker beneath.
- Lists only unseated attending guests (same filter as today).
- Drag a guest chip onto a table → seat assignment; over-capacity rejected with toast.
- Seated guest chips render inside the table shape at reduced font size (see "chip fix" below).

**Chip fix**
- Guest chips inside tables: `text-[10px]`, tighter padding (`px-2 py-0.5`), truncate to first name + last initial when the table is small.

**Persistence**
- New table columns for position (`x`, `y`), size (`width`, `height`), shape, tablecloth color, rotation.
- New `floor_fixtures` table: id, event_id, kind (dance_floor/bar/stage/entrance/custom), label, x, y, width, height, color, sort_order.
- New per-event `seating_layouts` column already exists — reuse it to persist `floor_color` and grid preferences.
- Debounced autosave on drag end / resize end.

**Tech**
- Keep `@dnd-kit/core` for guest → table drops.
- Use pointer events + `useRef` for element positioning (no heavy canvas lib needed; DOM absolute-positioned divs perform fine for typical wedding sizes).
- New component: `src/components/seating/floor-canvas.tsx`, `floor-table.tsx`, `floor-fixture.tsx`, `guest-sidebar.tsx`.

---

## 2. Events page → planning hubs

Each event card becomes a mini dashboard.

**Card structure**
```text
┌─────────────────────────────────────────┐
│ Mehendi                    ●● 62%       │
│ Fri 12 Sep · Jag Mandir, Udaipur        │
├─────────────────────────────────────────┤
│ 👥 Guests    45 invited            ›   │
│ 🪑 Seating   6 of 8 tables set     ›   │
│ 🏛 Venue     Jag Mandir            ›   │
│ 🎁 Registry  Add your first item   ›   │
│ 🌐 Website   Draft                 ›   │
│ 🤝 Vendors   2 booked              ›   │
├─────────────────────────────────────────┤
│                              Edit  ⋯   │
└─────────────────────────────────────────┘
```

- Progress ring: percentage of enabled categories that have data.
- Each row is a `<Link>` to the relevant section with `?event={id}` so target pages can scope filters.
- Empty state per row: "Add your first guests" style CTA instead of "0".

**Enabled categories per event**
- New `events.enabled_categories text[]` column (default: all six).
- In the Edit modal, after location fields, add a "What does this event need?" toggle group. Only enabled categories render on the card.

**Data wiring**
- Reuse existing hooks: `useGuests`, `useInvites`, `useEvents`. Add lightweight queries for per-event registry item count, vendor count, website section count, seating table count.
- Compute per-event stats on the client from already-loaded data where possible.

**Target-page scoping**
- Guests page: read `?event=` to filter by invite.
- Seating page: preselect the event.
- Registry / Website / Vendors: filter to items tagged with the event (or just show the wedding-wide list with a subtle "scoped to Mehendi" banner for v1 — no schema change).

---

## Technical details

- Migration adds columns to `wedding_tables` (`pos_x`, `pos_y`, `width`, `height`, `shape`, `tablecloth_color`, `rotation`) and `events` (`enabled_categories text[]`), plus a new `floor_fixtures` table with the standard GRANT + RLS block scoped through `wedding_id` ownership.
- `seating_layouts.settings jsonb` (or add if missing) stores `floor_color` and grid prefs per event.
- No breaking changes to existing seating data: existing tables get default positions on first load and are auto-arranged in a grid.
- Chip typography tweak is a one-line CSS change inside the new floor-table component.

## Out of scope
- Multi-select / group move / undo history on the canvas (can follow later).
- Per-event registry/website/vendor tagging schema (v1 uses wedding-wide with URL scoping).

Ready to build once you approve.
