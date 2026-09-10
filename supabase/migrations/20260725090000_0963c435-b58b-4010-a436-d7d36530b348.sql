-- 1. Make the built-in per-event attendance question editable per wedding
-- (custom wording with an optional {event} placeholder, plus an opt-in
-- "Maybe" option — guests only see Accept/Decline by default).
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS attendance_question_text text NOT NULL DEFAULT 'Will you be attending {event}?';
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS attendance_allow_maybe boolean NOT NULL DEFAULT false;

-- 2. Explicit RSVP submission gate: null until the guest actively submits,
-- cleared again if they reopen for editing.
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS rsvp_submitted_at timestamptz;

-- 3. get_rsvp_context now also returns the wedding's attendance settings and
-- the guest's submission state, so the guest page can render the right
-- copy/options and lock state on load without a second round trip.
DROP FUNCTION IF EXISTS public.get_rsvp_context(text);
CREATE OR REPLACE FUNCTION public.get_rsvp_context(_token TEXT)
RETURNS TABLE (
  guest_id UUID, guest_name TEXT, wedding_id UUID, partner_a TEXT, partner_b TEXT,
  attendance_question_text TEXT, attendance_allow_maybe BOOLEAN, rsvp_submitted_at TIMESTAMPTZ,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT,
  current_status rsvp_status, current_plus_ones INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, w.id, w.partner_a, w.partner_b,
         w.attendance_question_text, w.attendance_allow_maybe, g.rsvp_submitted_at,
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

-- 4. Toggle the submission lock. Setting _submitted true stamps rsvp_submitted_at
-- (locking further writes below); false clears it so the guest can edit again.
CREATE OR REPLACE FUNCTION public.set_rsvp_submitted(_token TEXT, _submitted BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID;
BEGIN
  SELECT id INTO _gid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  UPDATE public.guests SET rsvp_submitted_at = CASE WHEN _submitted THEN now() ELSE NULL END WHERE id = _gid;
END;
$$;
REVOKE ALL ON FUNCTION public.set_rsvp_submitted(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_rsvp_submitted(TEXT, BOOLEAN) TO anon, authenticated, service_role;

-- 5. Enforce the lock server-side too, not just in the UI: once submitted,
-- both write paths refuse further changes until set_rsvp_submitted(false)
-- reopens editing.
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

CREATE OR REPLACE FUNCTION public.submit_rsvp_answer(
  _token TEXT,
  _question_id UUID,
  _event_id UUID,
  _answer_text TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _wid UUID; _q_wedding_id UUID; _q_event_ids UUID[]; _submitted TIMESTAMPTZ;
BEGIN
  SELECT id, wedding_id, rsvp_submitted_at INTO _gid, _wid, _submitted FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF _submitted IS NOT NULL THEN RAISE EXCEPTION 'RSVP already submitted — reopen for editing first'; END IF;

  SELECT wedding_id, event_ids INTO _q_wedding_id, _q_event_ids
  FROM public.rsvp_questions WHERE id = _question_id;
  IF _q_wedding_id IS NULL OR _q_wedding_id <> _wid THEN
    RAISE EXCEPTION 'question does not belong to this guest''s wedding';
  END IF;

  IF _q_event_ids IS NULL OR array_length(_q_event_ids, 1) IS NULL THEN
    IF _event_id IS NOT NULL THEN
      RAISE EXCEPTION 'this question is global, event_id must be null';
    END IF;
  ELSE
    IF _event_id IS NULL OR NOT (_event_id = ANY(_q_event_ids)) THEN
      RAISE EXCEPTION 'event does not match this question''s scope';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.guest_event_invites WHERE guest_id = _gid AND event_id = _event_id
    ) THEN
      RAISE EXCEPTION 'guest is not tagged to this event';
    END IF;
  END IF;

  IF _event_id IS NULL THEN
    INSERT INTO public.rsvp_responses (guest_id, question_id, event_id, answer_text)
    VALUES (_gid, _question_id, NULL, _answer_text)
    ON CONFLICT (guest_id, question_id) WHERE event_id IS NULL
    DO UPDATE SET answer_text = EXCLUDED.answer_text, answered_at = now();
  ELSE
    INSERT INTO public.rsvp_responses (guest_id, question_id, event_id, answer_text)
    VALUES (_gid, _question_id, _event_id, _answer_text)
    ON CONFLICT (guest_id, question_id, event_id) WHERE event_id IS NOT NULL
    DO UPDATE SET answer_text = EXCLUDED.answer_text, answered_at = now();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp_answer(TEXT, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp_answer(TEXT, UUID, UUID, TEXT) TO anon, authenticated, service_role;
