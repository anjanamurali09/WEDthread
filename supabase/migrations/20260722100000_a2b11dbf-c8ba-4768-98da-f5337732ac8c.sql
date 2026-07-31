-- RSVP questions: support tagging a question to multiple specific events,
-- not just one-or-global. Replaces rsvp_questions.event_id (single, nullable
-- FK) with event_ids (UUID[], empty array = all events / global).

ALTER TABLE public.rsvp_questions ADD COLUMN event_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE public.rsvp_questions SET event_ids = ARRAY[event_id] WHERE event_id IS NOT NULL;

DROP INDEX IF EXISTS idx_rsvp_questions_event;
CREATE INDEX IF NOT EXISTS idx_rsvp_questions_event_ids ON public.rsvp_questions USING GIN (event_ids);

ALTER TABLE public.rsvp_questions DROP COLUMN event_id;

-- Re-validate: every id in event_ids (if any) must belong to the same
-- wedding as the question. (depends_on_question_id check is unchanged.)
CREATE OR REPLACE FUNCTION public.rsvp_questions_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bad_count INT; _dep_wedding_id UUID;
BEGIN
  IF NEW.event_ids IS NOT NULL AND array_length(NEW.event_ids, 1) > 0 THEN
    SELECT count(*) INTO _bad_count
    FROM unnest(NEW.event_ids) AS eid
    WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = eid AND e.wedding_id = NEW.wedding_id);
    IF _bad_count > 0 THEN
      RAISE EXCEPTION 'one or more event_ids do not belong to this question''s wedding';
    END IF;
  END IF;
  IF NEW.depends_on_question_id IS NOT NULL THEN
    SELECT wedding_id INTO _dep_wedding_id FROM public.rsvp_questions WHERE id = NEW.depends_on_question_id;
    IF _dep_wedding_id IS DISTINCT FROM NEW.wedding_id THEN
      RAISE EXCEPTION 'depends_on_question_id does not belong to this question''s wedding';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Dynamic resolution, updated for multi-event: a global question (event_ids
-- = '{}') resolves once; an event-scoped question resolves once per tagged
-- event the guest is actually invited to (so a question shared by Mehendi +
-- Reception is answered — and stored — separately per event, same as if it
-- were two questions).
CREATE OR REPLACE FUNCTION public.get_rsvp_questions(_token TEXT)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  question_type public.rsvp_question_type,
  options TEXT[],
  is_required BOOLEAN,
  sort_order INT,
  event_id UUID,
  event_name TEXT,
  depends_on_question_id UUID,
  depends_on_value TEXT,
  existing_answer TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question_text, q.question_type, q.options, q.is_required, q.sort_order,
         NULL::UUID, NULL::TEXT,
         q.depends_on_question_id, q.depends_on_value,
         r.answer_text
  FROM public.guests g
  JOIN public.rsvp_questions q ON q.wedding_id = g.wedding_id AND q.event_ids = '{}'
  LEFT JOIN public.rsvp_responses r ON r.guest_id = g.id AND r.question_id = q.id AND r.event_id IS NULL
  WHERE g.rsvp_token = _token

  UNION ALL

  SELECT q.id, q.question_text, q.question_type, q.options, q.is_required, q.sort_order,
         e.id, e.name,
         q.depends_on_question_id, q.depends_on_value,
         r.answer_text
  FROM public.guests g
  JOIN public.guest_event_invites gei ON gei.guest_id = g.id
  JOIN public.events e ON e.id = gei.event_id
  JOIN public.rsvp_questions q ON q.wedding_id = g.wedding_id AND e.id = ANY(q.event_ids)
  LEFT JOIN public.rsvp_responses r ON r.guest_id = g.id AND r.question_id = q.id AND r.event_id = e.id
  WHERE g.rsvp_token = _token

  ORDER BY sort_order, event_id NULLS FIRST;
$$;

-- Answer submission, updated for multi-event: _event_id must be null for a
-- global question, or one of the question's tagged events (and the guest
-- must actually be invited to it) for an event-scoped one.
CREATE OR REPLACE FUNCTION public.submit_rsvp_answer(
  _token TEXT,
  _question_id UUID,
  _event_id UUID,
  _answer_text TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _wid UUID; _q_wedding_id UUID; _q_event_ids UUID[];
BEGIN
  SELECT id, wedding_id INTO _gid, _wid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

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
