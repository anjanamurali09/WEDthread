-- Shareable/copyable RSVP links.
--
-- No column migration needed here: guests.rsvp_token already exists (see
-- 20260701113107 — `rsvp_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),
-- 'hex')`), already used by /rsvp/$token and the existing per-guest "copy RSVP link"
-- button on the Guests page. What's missing is a way to reach that same flow WITHOUT
-- already knowing a specific guest's token — a general, wedding-scoped link a guest can
-- open and find themselves on. These three functions support that lookup flow, all
-- SECURITY DEFINER since guests are anonymous site visitors with no direct table access
-- (same pattern as the existing get_rsvp_context/get_rsvp_questions/submit_rsvp).
--
-- Deliberately NOT gated on weddings.site_published — RSVP collection is independent of
-- whether the couple's public website is finished/published (matches the ask: "so people
-- can grab a link and share it manually however they want").

-- Minimal wedding info for the general RSVP lookup page's header — just enough to greet
-- the guest by the couple's names, nothing else from the weddings row.
CREATE OR REPLACE FUNCTION public.get_wedding_rsvp_info(_slug text)
RETURNS TABLE (wedding_id uuid, partner_a text, partner_b text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.partner_a, w.partner_b
  FROM public.weddings w
  WHERE w.slug = _slug;
$$;
REVOKE ALL ON FUNCTION public.get_wedding_rsvp_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wedding_rsvp_info(text) TO anon, authenticated, service_role;

-- Name search within one wedding's guest list, for the "find yourself" step. Returns only
-- what's needed to pick the right person from a list (name + household, to disambiguate
-- e.g. two "Sam Lee"s) — never phone/email/rsvp_token. Requires at least 2 characters so
-- the whole guest list can't be dumped with an empty query, and caps results.
CREATE OR REPLACE FUNCTION public.search_guests_by_wedding_slug(_slug text, _query text)
RETURNS TABLE (guest_id uuid, full_name text, household_group text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, g.household_group
  FROM public.guests g
  JOIN public.weddings w ON w.id = g.wedding_id
  WHERE w.slug = _slug
    AND length(trim(_query)) >= 2
    AND g.full_name ILIKE '%' || trim(_query) || '%'
  ORDER BY g.full_name
  LIMIT 8;
$$;
REVOKE ALL ON FUNCTION public.search_guests_by_wedding_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_guests_by_wedding_slug(text, text) TO anon, authenticated, service_role;

-- Reveals one specific guest's rsvp_token, only once they've picked themselves from the
-- search results above — _slug re-validates the guest actually belongs to that wedding,
-- so a guest_id can't be probed against an unrelated wedding's link.
CREATE OR REPLACE FUNCTION public.get_guest_rsvp_token(_guest_id uuid, _slug text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.rsvp_token
  FROM public.guests g
  JOIN public.weddings w ON w.id = g.wedding_id
  WHERE g.id = _guest_id AND w.slug = _slug;
$$;
REVOKE ALL ON FUNCTION public.get_guest_rsvp_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_rsvp_token(uuid, text) TO anon, authenticated, service_role;
