-- RSVP system, Phase 1: data foundation (question library, responses, dynamic
-- resolution by guest token + event tags). No builder/renderer UI yet.
--
-- Note: guests already have a unique, unguessable rsvp_token (see
-- 20260701113107 migration — `rsvp_token TEXT UNIQUE NOT NULL DEFAULT
-- encode(gen_random_bytes(16), 'hex')`), already wired to the public
-- /rsvp/$token page via get_rsvp_context / submit_rsvp. That requirement is
-- already satisfied; this migration only adds the custom-question layer on
-- top of the existing per-event attending/declined/maybe flow.

CREATE TYPE public.rsvp_question_type AS ENUM ('yes_no', 'multiple_choice', 'short_text');

-- ========= rsvp_questions (question library) =========
CREATE TABLE public.rsvp_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- NULL = global, applies regardless of event
  question_text TEXT NOT NULL,
  question_type public.rsvp_question_type NOT NULL DEFAULT 'short_text',
  options TEXT[] NOT NULL DEFAULT '{}', -- choices for multiple_choice; unused for other types
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  -- Conditional logic: show this question only if depends_on_question_id's
  -- answer equals depends_on_value. Both null = always shown (subject to the
  -- event-tag resolution below).
  depends_on_question_id UUID REFERENCES public.rsvp_questions(id) ON DELETE SET NULL,
  depends_on_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (depends_on_question_id IS DISTINCT FROM id)
);
CREATE INDEX IF NOT EXISTS idx_rsvp_questions_wedding ON public.rsvp_questions(wedding_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_rsvp_questions_event ON public.rsvp_questions(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvp_questions TO authenticated;
GRANT ALL ON public.rsvp_questions TO service_role;
ALTER TABLE public.rsvp_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvp questions owner all" ON public.rsvp_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
-- Public read is intentionally NOT granted — guests reach questions only
-- through the get_rsvp_questions() security-definer fn below, same pattern
-- as guests/get_rsvp_context.
CREATE TRIGGER rsvp_questions_updated BEFORE UPDATE ON public.rsvp_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep event_id and depends_on_question_id honest: both must belong to the
-- same wedding as the question itself (defense in depth beyond app logic —
-- a future builder UI bug shouldn't be able to leak/link across weddings).
CREATE OR REPLACE FUNCTION public.rsvp_questions_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _event_wedding_id UUID; _dep_wedding_id UUID;
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT wedding_id INTO _event_wedding_id FROM public.events WHERE id = NEW.event_id;
    IF _event_wedding_id IS DISTINCT FROM NEW.wedding_id THEN
      RAISE EXCEPTION 'event does not belong to this question''s wedding';
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
REVOKE ALL ON FUNCTION public.rsvp_questions_validate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_rsvp_questions_validate
  BEFORE INSERT OR UPDATE ON public.rsvp_questions
  FOR EACH ROW EXECUTE FUNCTION public.rsvp_questions_validate();

-- ========= rsvp_responses =========
CREATE TABLE public.rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.rsvp_questions(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- context event; NULL for answers to global questions
  answer_text TEXT,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One answer per guest+question, scoped by event when the question is
-- event-specific, and per-guest overall when it's global. Two partial
-- indexes because plain UNIQUE treats NULL as distinct from NULL.
CREATE UNIQUE INDEX IF NOT EXISTS ux_rsvp_responses_with_event
  ON public.rsvp_responses(guest_id, question_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_rsvp_responses_without_event
  ON public.rsvp_responses(guest_id, question_id) WHERE event_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest ON public.rsvp_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_question ON public.rsvp_responses(question_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvp_responses TO authenticated;
GRANT ALL ON public.rsvp_responses TO service_role;
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvp responses owner all" ON public.rsvp_responses FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guests g JOIN public.weddings w ON w.id = g.wedding_id
    WHERE g.id = guest_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.guests g JOIN public.weddings w ON w.id = g.wedding_id
    WHERE g.id = guest_id AND w.owner_id = auth.uid()));
-- No anon grants — guests write answers only via submit_rsvp_answer() below.

-- ========= Dynamic question resolution =========
-- Given a guest's token: global questions for their wedding, plus questions
-- scoped to any event they're tagged to in guest_event_invites (regardless
-- of RSVP status — tagging is what "invited to this event" means here).
-- Conditional (depends_on_*) fields are returned as-is; evaluating them
-- against in-progress answers is a rendering-time concern for the Phase 2
-- form, not something this fn resolves server-side.
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
         q.event_id, e.name,
         q.depends_on_question_id, q.depends_on_value,
         r.answer_text
  FROM public.guests g
  JOIN public.rsvp_questions q ON q.wedding_id = g.wedding_id
  LEFT JOIN public.events e ON e.id = q.event_id
  LEFT JOIN public.rsvp_responses r
    ON r.guest_id = g.id AND r.question_id = q.id
    AND r.event_id IS NOT DISTINCT FROM q.event_id
  WHERE g.rsvp_token = _token
    AND (
      q.event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.guest_event_invites gei
        WHERE gei.guest_id = g.id AND gei.event_id = q.event_id
      )
    )
  ORDER BY q.sort_order, q.created_at;
$$;
REVOKE ALL ON FUNCTION public.get_rsvp_questions(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp_questions(TEXT) TO anon, authenticated, service_role;

-- ========= Public answer submission =========
CREATE OR REPLACE FUNCTION public.submit_rsvp_answer(
  _token TEXT,
  _question_id UUID,
  _event_id UUID,
  _answer_text TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _wid UUID; _q_wedding_id UUID; _q_event_id UUID;
BEGIN
  SELECT id, wedding_id INTO _gid, _wid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

  SELECT wedding_id, event_id INTO _q_wedding_id, _q_event_id
  FROM public.rsvp_questions WHERE id = _question_id;
  IF _q_wedding_id IS NULL OR _q_wedding_id <> _wid THEN
    RAISE EXCEPTION 'question does not belong to this guest''s wedding';
  END IF;
  IF _q_event_id IS DISTINCT FROM _event_id THEN
    RAISE EXCEPTION 'event does not match this question''s scope';
  END IF;
  IF _q_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.guest_event_invites WHERE guest_id = _gid AND event_id = _q_event_id
  ) THEN
    RAISE EXCEPTION 'guest is not tagged to this event';
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
