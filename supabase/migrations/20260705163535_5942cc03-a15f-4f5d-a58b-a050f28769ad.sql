
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guests_sync_full_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vendors_prevent_status_escalation() FROM PUBLIC, anon, authenticated;
