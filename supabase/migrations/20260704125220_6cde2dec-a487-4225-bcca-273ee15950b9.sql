
-- 1. Vendors: prevent non-admins from changing status via trigger
DROP POLICY IF EXISTS "vendors owner update non-status" ON public.vendors;
CREATE POLICY "vendors owner update"
  ON public.vendors FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.vendors_prevent_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change vendor status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendors_prevent_status_escalation ON public.vendors;
CREATE TRIGGER trg_vendors_prevent_status_escalation
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.vendors_prevent_status_escalation();

-- 2. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_rsvp_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp_context(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vendors_prevent_status_escalation() FROM PUBLIC, anon, authenticated;

-- 3. Revoke unused anon grants on guests (RLS also blocks, this removes the latent grant)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.guests FROM anon;

-- 4. Harden submit_rsvp: explicit event/wedding ownership check + revalidate token binding
CREATE OR REPLACE FUNCTION public.submit_rsvp(_token text, _event_id uuid, _status public.rsvp_status, _plus_ones integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _gid UUID; _wid UUID; _eid_wid UUID;
BEGIN
  SELECT id, wedding_id INTO _gid, _wid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  SELECT wedding_id INTO _eid_wid FROM public.events WHERE id = _event_id;
  IF _eid_wid IS NULL OR _eid_wid <> _wid THEN
    RAISE EXCEPTION 'event does not belong to this guest''s wedding';
  END IF;
  INSERT INTO public.guest_event_invites (guest_id, event_id, rsvp_status, plus_ones, rsvp_at)
  VALUES (_gid, _event_id, _status, GREATEST(0, LEAST(_plus_ones, 10)), now())
  ON CONFLICT (guest_id, event_id) DO UPDATE
    SET rsvp_status = EXCLUDED.rsvp_status,
        plus_ones = EXCLUDED.plus_ones,
        rsvp_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) TO anon, authenticated, service_role;
