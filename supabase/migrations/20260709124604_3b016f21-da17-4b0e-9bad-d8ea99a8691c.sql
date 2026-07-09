CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF NEW.raw_user_meta_data ? 'signup_role'
     AND NULLIF(NEW.raw_user_meta_data->>'signup_role', '') IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'signup_role')::public.app_role;
    EXCEPTION WHEN others THEN _role := NULL; END;

    IF _role IS NOT NULL AND _role <> 'admin'::public.app_role THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;