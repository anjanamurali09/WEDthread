import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "couple" | "vendor" | "venue" | "planner" | "seller";

/**
 * Autosaves onboarding form fields to `public.onboarding_drafts`
 * (debounced), and exposes a `markCompleted()` helper that records
 * completion both on the draft row and on the user's profile.
 */
export function useOnboardingDraft<T extends Record<string, any>>(
  role: Role,
  form: T,
  { enabled = true, debounceMs = 800 }: { enabled?: boolean; debounceMs?: number } = {},
) {
  const [hydrated, setHydrated] = useState(false);
  const [initial, setInitial] = useState<Partial<T> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const userIdRef = useRef<string | null>(null);
  const lastSerialized = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load any existing draft for this user + role.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setHydrated(true); return; }
      userIdRef.current = u.user.id;
      const { data } = await supabase
        .from("onboarding_drafts")
        .select("data")
        .eq("user_id", u.user.id)
        .eq("role", role)
        .maybeSingle();
      if (!alive) return;
      setInitial((data?.data ?? {}) as Partial<T>);
      lastSerialized.current = JSON.stringify(data?.data ?? {});
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [role]);

  // Debounced autosave whenever the form changes after hydration.
  useEffect(() => {
    if (!enabled || !hydrated || !userIdRef.current) return;
    const serialized = JSON.stringify(form ?? {});
    if (serialized === lastSerialized.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("onboarding_drafts")
        .upsert(
          { user_id: userIdRef.current!, role, data: form as any },
          { onConflict: "user_id,role" },
        );
      if (!error) {
        lastSerialized.current = serialized;
        setSavedAt(new Date());
      }
      setSaving(false);
    }, debounceMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [form, enabled, hydrated, role, debounceMs]);

  const markCompleted = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    // Flush the latest snapshot and stamp completion on the draft.
    await supabase
      .from("onboarding_drafts")
      .upsert(
        { user_id: uid, role, data: form as any, completed_at: new Date().toISOString() },
        { onConflict: "user_id,role" },
      );
    // Mark completion on the profile too.
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_completed_roles, onboarding_completed_at")
      .eq("user_id", uid)
      .maybeSingle();
    const roles = new Set<string>(prof?.onboarding_completed_roles ?? []);
    roles.add(role);
    await supabase
      .from("profiles")
      .update({
        onboarding_completed_roles: Array.from(roles),
        onboarding_completed_at: prof?.onboarding_completed_at ?? new Date().toISOString(),
      })
      .eq("user_id", uid);
  };

  return { hydrated, initial, saving, savedAt, markCompleted };
}
