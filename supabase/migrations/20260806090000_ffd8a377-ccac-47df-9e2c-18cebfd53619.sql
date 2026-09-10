-- Customizable dashboard widgets: an ordered array of widget type keys, e.g.
-- ["events","guests","rsvps","website","budget"]. Null means "no saved layout yet" —
-- the app falls back to a hardcoded default order (see DEFAULT_DASHBOARD_LAYOUT in
-- src/components/dashboard-widgets.tsx) in that case, so no default value is set here.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS dashboard_layout jsonb;
