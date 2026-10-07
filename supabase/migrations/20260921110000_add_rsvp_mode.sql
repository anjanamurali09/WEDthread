-- Lets a couple choose between asking guests to RSVP separately for each
-- event they're invited to ("per_event", today's only behavior) or giving
-- one overall RSVP that applies to every event at once ("single"). The
-- actual per-event write path (submit_rsvp) is unchanged — the public RSVP
-- page just calls it once per event under the hood when in "single" mode,
-- so only the read side (these two context functions) needs to expose the
-- new setting.
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS rsvp_mode text NOT NULL DEFAULT 'per_event';
ALTER TABLE public.weddings DROP CONSTRAINT IF EXISTS weddings_rsvp_mode_check;
ALTER TABLE public.weddings ADD CONSTRAINT weddings_rsvp_mode_check CHECK (rsvp_mode IN ('per_event', 'single'));

DROP FUNCTION IF EXISTS public.get_rsvp_context(text);
CREATE OR REPLACE FUNCTION public.get_rsvp_context(_token TEXT)
RETURNS TABLE (
  guest_id UUID, guest_name TEXT, wedding_id UUID, partner_a TEXT, partner_b TEXT,
  attendance_question_text TEXT, attendance_allow_maybe BOOLEAN,
  attendance_accept_label TEXT, attendance_decline_label TEXT, attendance_maybe_label TEXT,
  rsvp_mode TEXT,
  rsvp_submitted_at TIMESTAMPTZ,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT,
  current_status rsvp_status, current_plus_ones INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, w.id, w.partner_a, w.partner_b,
         w.attendance_question_text, w.attendance_allow_maybe,
         w.attendance_accept_label, w.attendance_decline_label, w.attendance_maybe_label,
         w.rsvp_mode,
         g.rsvp_submitted_at,
         e.id, e.name, e.event_date, e.event_time, e.venue_name, e.city,
         COALESCE(i.rsvp_status, 'pending'::rsvp_status), COALESCE(i.plus_ones, 0)
  FROM public.guests g
  JOIN public.weddings w ON w.id = g.wedding_id
  LEFT JOIN public.guest_event_invites i ON i.guest_id = g.id
  LEFT JOIN public.events e ON e.id = i.event_id
  WHERE g.rsvp_token = _token
  ORDER BY e.sort_order, e.event_date;
$$;
REVOKE ALL ON FUNCTION public.get_rsvp_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp_context(TEXT) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_wedding_rsvp_context(text);
CREATE OR REPLACE FUNCTION public.get_wedding_rsvp_context(_slug text)
RETURNS TABLE (
  wedding_id UUID, partner_a TEXT, partner_b TEXT,
  attendance_question_text TEXT, attendance_allow_maybe BOOLEAN,
  attendance_accept_label TEXT, attendance_decline_label TEXT, attendance_maybe_label TEXT,
  rsvp_mode TEXT,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.partner_a, w.partner_b,
         w.attendance_question_text, w.attendance_allow_maybe,
         w.attendance_accept_label, w.attendance_decline_label, w.attendance_maybe_label,
         w.rsvp_mode,
         e.id, e.name, e.event_date, e.event_time, e.venue_name, e.city
  FROM public.weddings w
  LEFT JOIN public.events e ON e.wedding_id = w.id
  WHERE w.slug = _slug
  ORDER BY e.sort_order, e.event_date;
$$;
REVOKE ALL ON FUNCTION public.get_wedding_rsvp_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wedding_rsvp_context(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
