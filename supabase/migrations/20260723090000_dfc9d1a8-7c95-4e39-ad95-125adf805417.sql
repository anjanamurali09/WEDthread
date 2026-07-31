-- Fix guest-facing event scoping: get_rsvp_context currently joins every
-- event in the wedding (LEFT JOIN through guest_event_invites only pulled
-- the status, it never filtered), so a guest tagged to just the Reception
-- could see every ceremony in the wedding. Scope it to the guest's actual
-- tagged events, same as get_rsvp_questions already does. Also harden
-- submit_rsvp with the same "guest is tagged to this event" check
-- submit_rsvp_answer already has, since it only verified same-wedding.

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
  JOIN public.guest_event_invites i ON i.guest_id = g.id
  JOIN public.events e ON e.id = i.event_id
  WHERE g.rsvp_token = _token
  ORDER BY e.sort_order, e.event_date;
$$;
REVOKE ALL ON FUNCTION public.get_rsvp_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp_context(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_rsvp(_token text, _event_id uuid, _status public.rsvp_status, _plus_ones integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _wid UUID; _eid_wid UUID;
BEGIN
  SELECT id, wedding_id INTO _gid, _wid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  SELECT wedding_id INTO _eid_wid FROM public.events WHERE id = _event_id;
  IF _eid_wid IS DISTINCT FROM _wid THEN
    RAISE EXCEPTION 'event does not belong to this guest''s wedding';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_event_invites WHERE guest_id = _gid AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'guest is not tagged to this event';
  END IF;
  INSERT INTO public.guest_event_invites (guest_id, event_id, rsvp_status, plus_ones, rsvp_at)
  VALUES (_gid, _event_id, _status, GREATEST(0, LEAST(_plus_ones, 10)), now())
  ON CONFLICT (guest_id, event_id) DO UPDATE
    SET rsvp_status = EXCLUDED.rsvp_status,
        plus_ones = EXCLUDED.plus_ones,
        rsvp_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp(TEXT, UUID, public.rsvp_status, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, UUID, public.rsvp_status, INT) TO anon, authenticated, service_role;
