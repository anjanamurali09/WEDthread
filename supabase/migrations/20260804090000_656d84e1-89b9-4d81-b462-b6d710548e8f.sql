-- Let the couple manually set a guest's RSVP status per event (e.g. a verbal/phone
-- confirmation), while the guest's own later form submission still takes precedence.
-- Tracked via rsvp_source so manual entries can be told apart from self-reported ones.
CREATE TYPE public.rsvp_source AS ENUM ('guest_submitted', 'manual');

ALTER TABLE public.guest_event_invites
  ADD COLUMN rsvp_source public.rsvp_source NOT NULL DEFAULT 'guest_submitted';

-- The couple's manual edits go through the existing authenticated "invites owner all"
-- RLS policy directly (UPDATE rsvp_status, rsvp_source='manual', rsvp_at=now()) — no
-- RPC or policy change needed, and it's already unaffected by guests.rsvp_submitted_at,
-- which only gates the guest-facing RPCs below.

-- A genuine guest submission always reclaims 'guest_submitted', overwriting whatever
-- source/status was there before — the guest's own word wins.
CREATE OR REPLACE FUNCTION public.submit_rsvp(_token text, _event_id uuid, _status public.rsvp_status, _plus_ones integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _wid UUID; _eid_wid UUID; _submitted TIMESTAMPTZ;
BEGIN
  SELECT id, wedding_id, rsvp_submitted_at INTO _gid, _wid, _submitted FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF _submitted IS NOT NULL THEN RAISE EXCEPTION 'RSVP already submitted — reopen for editing first'; END IF;
  SELECT wedding_id INTO _eid_wid FROM public.events WHERE id = _event_id;
  IF _eid_wid IS DISTINCT FROM _wid THEN
    RAISE EXCEPTION 'event does not belong to this guest''s wedding';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_event_invites WHERE guest_id = _gid AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'guest is not tagged to this event';
  END IF;
  INSERT INTO public.guest_event_invites (guest_id, event_id, rsvp_status, plus_ones, rsvp_at, rsvp_source)
  VALUES (_gid, _event_id, _status, GREATEST(0, LEAST(_plus_ones, 10)), now(), 'guest_submitted')
  ON CONFLICT (guest_id, event_id) DO UPDATE
    SET rsvp_status = EXCLUDED.rsvp_status,
        plus_ones = EXCLUDED.plus_ones,
        rsvp_at = now(),
        rsvp_source = 'guest_submitted';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp(TEXT, UUID, public.rsvp_status, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, UUID, public.rsvp_status, INT) TO anon, authenticated, service_role;
