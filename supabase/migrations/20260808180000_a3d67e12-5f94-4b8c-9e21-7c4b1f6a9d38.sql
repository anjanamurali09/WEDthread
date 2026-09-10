-- Replaces the old "guest looks themselves up by name, gets redirected to their token
-- link" general-RSVP flow with an open, all-events, name-matched flow: the visitor fills
-- out the whole RSVP form directly (every event, not filtered to any existing invite),
-- and on submit we resolve/create the guest record behind the scenes.
--
-- No RLS policy changes here — anon has never had usable RLS access to guests/
-- guest_event_invites/rsvp_responses (their policies are all `TO authenticated`, scoped to
-- `w.owner_id = auth.uid()`), matching the rest of this file's public RSVP surface
-- (submit_rsvp, submit_rsvp_answer, get_rsvp_context, get_rsvp_questions), all of which
-- reach these tables exclusively through SECURITY DEFINER functions rather than direct
-- grants. This migration adds new functions in the same style; underlying table RLS is
-- untouched.

DROP FUNCTION IF EXISTS public.get_wedding_rsvp_info(text);
DROP FUNCTION IF EXISTS public.search_guests_by_wedding_slug(text, text);

-- Wedding + every event, keyed by slug instead of guest token, and not filtered to any
-- invite — mirrors get_rsvp_context's shape minus the guest-specific columns.
CREATE OR REPLACE FUNCTION public.get_wedding_rsvp_context(_slug text)
RETURNS TABLE (
  wedding_id UUID, partner_a TEXT, partner_b TEXT,
  attendance_question_text TEXT, attendance_allow_maybe BOOLEAN,
  attendance_accept_label TEXT, attendance_decline_label TEXT, attendance_maybe_label TEXT,
  event_id UUID, event_name TEXT, event_date DATE, event_time TIME, venue_name TEXT, city TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.partner_a, w.partner_b,
         w.attendance_question_text, w.attendance_allow_maybe,
         w.attendance_accept_label, w.attendance_decline_label, w.attendance_maybe_label,
         e.id, e.name, e.event_date, e.event_time, e.venue_name, e.city
  FROM public.weddings w
  LEFT JOIN public.events e ON e.wedding_id = w.id
  WHERE w.slug = _slug
  ORDER BY e.sort_order, e.event_date;
$$;
REVOKE ALL ON FUNCTION public.get_wedding_rsvp_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wedding_rsvp_context(TEXT) TO anon, authenticated, service_role;

-- Every RSVP question for the wedding (global + all event-scoped), keyed by slug instead
-- of guest token, and not filtered by any guest's invites — mirrors get_rsvp_questions'
-- UNION ALL shape minus existing_answer (there's no guest yet).
CREATE OR REPLACE FUNCTION public.get_wedding_rsvp_questions(_slug text)
RETURNS TABLE (
  question_id UUID, question_text TEXT, question_type public.rsvp_question_type,
  options TEXT[], is_required BOOLEAN, sort_order INT,
  event_id UUID, event_name TEXT,
  depends_on_question_id UUID, depends_on_value TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id AS question_id, q.question_text, q.question_type, q.options, q.is_required, q.sort_order,
         NULL::uuid AS event_id, NULL::text AS event_name,
         q.depends_on_question_id, q.depends_on_value
  FROM public.weddings w
  JOIN public.rsvp_questions q ON q.wedding_id = w.id AND q.event_ids = '{}'
  WHERE w.slug = _slug

  UNION ALL

  SELECT q.id AS question_id, q.question_text, q.question_type, q.options, q.is_required, q.sort_order,
         e.id AS event_id, e.name AS event_name,
         q.depends_on_question_id, q.depends_on_value
  FROM public.weddings w
  JOIN public.rsvp_questions q ON q.wedding_id = w.id
  JOIN public.events e ON e.id = ANY(q.event_ids) AND e.wedding_id = w.id
  WHERE w.slug = _slug

  ORDER BY sort_order, event_id NULLS FIRST;
$$;
REVOKE ALL ON FUNCTION public.get_wedding_rsvp_questions(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wedding_rsvp_questions(TEXT) TO anon, authenticated, service_role;

-- Case-insensitive, whitespace-normalized name match against existing guests for the
-- wedding. Matches on exact normalized equality, or either name being a whole-word prefix
-- of the other (so "Anjana" matches a stored "Anjana M."). Returns up to 10 candidates for
-- the caller to disambiguate among if more than one comes back.
CREATE OR REPLACE FUNCTION public.match_guests_by_name(_slug text, _full_name text)
RETURNS TABLE (guest_id UUID, full_name TEXT, household_group TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH norm AS (
    SELECT lower(regexp_replace(trim(_full_name), '\s+', ' ', 'g')) AS n
  )
  SELECT g.id, g.full_name, g.household_group
  FROM public.guests g
  JOIN public.weddings w ON w.id = g.wedding_id
  CROSS JOIN norm
  WHERE w.slug = _slug
    AND norm.n <> ''
    AND (
      lower(regexp_replace(trim(g.full_name), '\s+', ' ', 'g')) = norm.n
      OR lower(regexp_replace(trim(g.full_name), '\s+', ' ', 'g')) LIKE norm.n || ' %'
      OR norm.n LIKE lower(regexp_replace(trim(g.full_name), '\s+', ' ', 'g')) || ' %'
    )
  ORDER BY g.full_name
  LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.match_guests_by_name(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_guests_by_name(TEXT, TEXT) TO anon, authenticated, service_role;

-- Creates a brand-new guest record for a visitor who didn't match anyone on the open RSVP
-- link. Narrow, purpose-built insert (name only) rather than a general anon write path.
CREATE OR REPLACE FUNCTION public.create_guest_for_rsvp(_slug text, _full_name text)
RETURNS TABLE (guest_id UUID, rsvp_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wedding_id UUID;
  _guest_id UUID;
  _token TEXT;
BEGIN
  SELECT w.id INTO _wedding_id FROM public.weddings w WHERE w.slug = _slug;
  IF _wedding_id IS NULL THEN
    RAISE EXCEPTION 'wedding not found';
  END IF;
  IF trim(_full_name) = '' THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  INSERT INTO public.guests (wedding_id, full_name)
  VALUES (_wedding_id, trim(_full_name))
  RETURNING id, guests.rsvp_token INTO _guest_id, _token;

  RETURN QUERY SELECT _guest_id, _token;
END;
$$;
REVOKE ALL ON FUNCTION public.create_guest_for_rsvp(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_for_rsvp(TEXT, TEXT) TO anon, authenticated, service_role;
