
-- 1. Remove hardcoded admin email from handle_new_user + set search_path (already set, keep)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'couple');
  RETURN NEW;
END;
$function$;

-- 2. submit_rsvp: verify event belongs to guest's wedding
CREATE OR REPLACE FUNCTION public.submit_rsvp(_token text, _event_id uuid, _status rsvp_status, _plus_ones integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _gid UUID; _wid UUID; _eid_wid UUID;
BEGIN
  SELECT id, wedding_id INTO _gid, _wid FROM public.guests WHERE rsvp_token = _token;
  IF _gid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  SELECT wedding_id INTO _eid_wid FROM public.events WHERE id = _event_id;
  IF _eid_wid IS DISTINCT FROM _wid THEN RAISE EXCEPTION 'invalid event'; END IF;
  INSERT INTO public.guest_event_invites (guest_id, event_id, rsvp_status, plus_ones, rsvp_at)
  VALUES (_gid, _event_id, _status, GREATEST(0, LEAST(_plus_ones, 10)), now())
  ON CONFLICT (guest_id, event_id) DO UPDATE
    SET rsvp_status = EXCLUDED.rsvp_status,
        plus_ones = EXCLUDED.plus_ones,
        rsvp_at = now();
END;
$function$;

-- 4. Set search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 3. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER helpers.
-- has_role is used only inside RLS (runs as definer regardless of grants).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
-- handle_new_user is a trigger — no direct callers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
-- submit_rsvp and get_rsvp_context MUST remain callable by anon (public RSVP flow).

-- 6. Vendors: prevent owner from self-approving via status change.
DROP POLICY IF EXISTS "vendors owner write" ON public.vendors;
CREATE POLICY "vendors owner update non-status"
ON public.vendors
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  AND status = (SELECT v.status FROM public.vendors v WHERE v.id = vendors.id)
);

-- 7. Storage policies for private 'wedding-assets' bucket.
-- Path convention: {wedding_id}/... — owner of the wedding controls objects.
DROP POLICY IF EXISTS "wedding-assets owner read" ON storage.objects;
DROP POLICY IF EXISTS "wedding-assets owner insert" ON storage.objects;
DROP POLICY IF EXISTS "wedding-assets owner update" ON storage.objects;
DROP POLICY IF EXISTS "wedding-assets owner delete" ON storage.objects;

CREATE POLICY "wedding-assets owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'wedding-assets'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "wedding-assets owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wedding-assets'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "wedding-assets owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'wedding-assets'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "wedding-assets owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'wedding-assets'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);
