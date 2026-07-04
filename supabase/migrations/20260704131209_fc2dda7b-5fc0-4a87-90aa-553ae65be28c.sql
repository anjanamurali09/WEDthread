
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guests_sync_full_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vendors_prevent_status_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, uuid, public.rsvp_status, integer) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_rsvp_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp_context(text) TO anon, authenticated, service_role;
