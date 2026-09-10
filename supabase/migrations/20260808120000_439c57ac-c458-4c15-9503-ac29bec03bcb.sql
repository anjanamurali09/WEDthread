-- Collaborators: full multi-user access on a wedding, invited by email.
--
-- Model: owner_id on weddings stays the single "real" owner (can delete the wedding,
-- can manage collaborators). wedding_collaborators adds people who get the SAME edit
-- access as the owner everywhere else in the app. Invited by email; access activates
-- automatically the moment that email signs in (matched via the JWT's email claim), so
-- there's no separate "accept invite" flow to build — matching how this app already
-- treats "have/create an account" as the only gate.
--
-- has_wedding_access() is the new single source of truth for "can this user touch this
-- wedding's data", replacing the old `w.owner_id = auth.uid()` check inline in every
-- policy below. It's SECURITY DEFINER so it can read wedding_collaborators without
-- those rows needing their own recursive RLS grant.

CREATE TABLE public.wedding_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, email)
);

CREATE OR REPLACE FUNCTION public.wedding_collaborators_normalize_email()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_wedding_collaborators_normalize_email
  BEFORE INSERT OR UPDATE ON public.wedding_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.wedding_collaborators_normalize_email();

-- Fill in user_id automatically once the invited email actually signs up/in, so the
-- app can show "who is this" without ever having to run a manual linking step.
CREATE OR REPLACE FUNCTION public.wedding_collaborators_link_user_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wedding_collaborators
  SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_link_collaborator
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.wedding_collaborators_link_user_id();

GRANT SELECT, INSERT, DELETE ON public.wedding_collaborators TO authenticated;
GRANT ALL ON public.wedding_collaborators TO service_role;
ALTER TABLE public.wedding_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_wedding_access(_wedding_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id = _wedding_id AND w.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.wedding_collaborators wc
    WHERE wc.wedding_id = _wedding_id
      AND (wc.user_id = auth.uid() OR wc.email = lower(coalesce(auth.jwt()->>'email', '')))
  );
$$;

-- Only the owner can invite/remove collaborators (not collaborators themselves); anyone
-- with access to the wedding can see who else is on it.
CREATE POLICY "collaborators read if has access" ON public.wedding_collaborators FOR SELECT TO authenticated
  USING (public.has_wedding_access(wedding_id));
CREATE POLICY "collaborators owner insert" ON public.wedding_collaborators FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));
CREATE POLICY "collaborators owner delete" ON public.wedding_collaborators FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weddings w WHERE w.id = wedding_id AND w.owner_id = auth.uid()));

-- ========= weddings: split the old single owner-all policy so collaborators get
-- select/update but NOT delete (of the wedding itself) or insert-on-behalf-of-owner =========
DROP POLICY "weddings owner all" ON public.weddings;
CREATE POLICY "weddings owner insert" ON public.weddings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "weddings owner delete" ON public.weddings FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "weddings access select" ON public.weddings FOR SELECT TO authenticated
  USING (public.has_wedding_access(id));
CREATE POLICY "weddings access update" ON public.weddings FOR UPDATE TO authenticated
  USING (public.has_wedding_access(id)) WITH CHECK (public.has_wedding_access(id));

-- One call per wedding a user belongs to (owner OR collaborator), most recent first —
-- replaces the client's old `.eq("owner_id", uid)` query, which only ever found
-- weddings the caller owned.
CREATE OR REPLACE FUNCTION public.get_my_current_wedding()
RETURNS public.weddings LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.* FROM public.weddings w
  WHERE w.owner_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.wedding_collaborators wc
       WHERE wc.wedding_id = w.id
         AND (wc.user_id = auth.uid() OR wc.email = lower(coalesce(auth.jwt()->>'email', '')))
     )
  ORDER BY w.created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_current_wedding() TO authenticated;

-- ========= direct wedding_id tables: full edit access via has_wedding_access =========
ALTER POLICY "events owner all" ON public.events
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "guests owner all" ON public.guests
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "tpl owner all" ON public.message_templates
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "registry owner all" ON public.registries
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "photos owner all" ON public.wedding_photos
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "Owners manage website_sections" ON public.website_sections
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "rsvp questions owner all" ON public.rsvp_questions
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "budget categories owner all" ON public.budget_categories
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "budget custom columns owner all" ON public.budget_custom_columns
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "expenses owner all" ON public.expenses
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "notes owner all" ON public.notes
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));
ALTER POLICY "booking couple all" ON public.booking_requests
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));

-- message_sends previously had only a SELECT policy — inserting a send (the couple's own
-- send queue) had no matching RLS policy at all, which meant it silently only worked if
-- something elsewhere bypassed RLS. Fixed here as a FOR ALL policy, which also covers
-- collaborators.
DROP POLICY "sends owner read" ON public.message_sends;
CREATE POLICY "sends access all" ON public.message_sends FOR ALL TO authenticated
  USING (public.has_wedding_access(wedding_id)) WITH CHECK (public.has_wedding_access(wedding_id));

-- ========= event_id -> events.wedding_id tables =========
ALTER POLICY "tables owner all" ON public.wedding_tables
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_wedding_access(e.wedding_id)));
ALTER POLICY "layouts owner all" ON public.seating_layouts
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_layouts.event_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_layouts.event_id AND public.has_wedding_access(e.wedding_id)));
ALTER POLICY "fixtures owner all" ON public.seating_fixtures
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_fixtures.event_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_fixtures.event_id AND public.has_wedding_access(e.wedding_id)));
ALTER POLICY "seating areas owner all" ON public.seating_areas
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_areas.event_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = seating_areas.event_id AND public.has_wedding_access(e.wedding_id)));
ALTER POLICY "menu sections owner all" ON public.menu_sections
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_wedding_access(e.wedding_id)));

-- ========= guest_id -> guests.wedding_id tables =========
ALTER POLICY "invites owner all" ON public.guest_event_invites
  USING (EXISTS (SELECT 1 FROM public.guests g WHERE g.id = guest_id AND public.has_wedding_access(g.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.guests g WHERE g.id = guest_id AND public.has_wedding_access(g.wedding_id)));
ALTER POLICY "rsvp responses owner all" ON public.rsvp_responses
  USING (EXISTS (SELECT 1 FROM public.guests g WHERE g.id = guest_id AND public.has_wedding_access(g.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.guests g WHERE g.id = guest_id AND public.has_wedding_access(g.wedding_id)));

-- ========= two-hop joins =========
ALTER POLICY "seat owner all" ON public.seat_assignments
  USING (EXISTS (SELECT 1 FROM public.wedding_tables t JOIN public.events e ON e.id = t.event_id
                 WHERE t.id = table_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wedding_tables t JOIN public.events e ON e.id = t.event_id
                 WHERE t.id = table_id AND public.has_wedding_access(e.wedding_id)));
ALTER POLICY "registry items owner all" ON public.registry_items
  USING (EXISTS (SELECT 1 FROM public.registries r WHERE r.id = registry_id AND public.has_wedding_access(r.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.registries r WHERE r.id = registry_id AND public.has_wedding_access(r.wedding_id)));
ALTER POLICY "menu items owner all" ON public.menu_items
  USING (EXISTS (SELECT 1 FROM public.menu_sections s JOIN public.events e ON e.id = s.event_id
                 WHERE s.id = section_id AND public.has_wedding_access(e.wedding_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_sections s JOIN public.events e ON e.id = s.event_id
                 WHERE s.id = section_id AND public.has_wedding_access(e.wedding_id)));

-- ========= storage: wedding-assets (path convention {wedding_id}/website/{filename}) =========
-- Keeps the original join-on-text shape (w.id::text = split_part(...)) rather than casting
-- the path segment to uuid, since a stray non-UUID path segment would make ::uuid raise
-- instead of just evaluating false, breaking the whole policy check.
ALTER POLICY "Owners upload to wedding-assets" ON storage.objects
  WITH CHECK (bucket_id = 'wedding-assets' AND EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND public.has_wedding_access(w.id)
  ));
ALTER POLICY "Owners update wedding-assets" ON storage.objects
  USING (bucket_id = 'wedding-assets' AND EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND public.has_wedding_access(w.id)
  ));
ALTER POLICY "Owners delete wedding-assets" ON storage.objects
  USING (bucket_id = 'wedding-assets' AND EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND public.has_wedding_access(w.id)
  ));
ALTER POLICY "Owners read own wedding-assets" ON storage.objects
  USING (bucket_id = 'wedding-assets' AND EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id::text = split_part(name, '/', 1) AND public.has_wedding_access(w.id)
  ));
