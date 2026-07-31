-- Fix a regression from the previous get_rsvp_context scoping fix: it
-- switched to an INNER JOIN through guest_event_invites to stop leaking
-- every wedding event to every guest (correct), but that also made the
-- guest's own row disappear entirely whenever they have zero event tags —
-- a guest with a perfectly valid rsvp_token but no invites yet (e.g. added
-- to the Guest List before being assigned to a ceremony) got zero rows back,
-- which the RSVP page treats identically to "token doesn't exist" and shows
-- "Invitation not found."
--
-- Fix: the guest must always resolve by token regardless of event tags —
-- LEFT JOIN through guest_event_invites/events instead of INNER JOIN, so a
-- guest with no tags gets one row with null event fields (page renders their
-- name/greeting + any global questions, just no per-event RSVP cards) rather
-- than vanishing. Event scoping itself is unchanged: an event can still only
-- appear via an actual guest_event_invites row, never leaked wholesale.
CREATE OR REPLACE FUNCTION public.get_rsvp_context(_token TEXT)
RETURNS TABLE (
  guest_id UUID, guest_name TEXT, wedding_id UUID, partner_a TEXT, partner_b TEXT,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT,
  current_status rsvp_status, current_plus_ones INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, w.id, w.partner_a, w.partner_b,
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
