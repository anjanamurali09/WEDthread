import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionUser } from "@/lib/session-user";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "couple" | "planner" | "venue" | "vendor" | "seller" | "admin";

export const ROLE_LANDING: Record<AppRole, string> = {
  couple: "/dashboard",
  planner: "/dashboard",
  // Was "/vendors" (the public marketplace) — a vendor/venue signing in
  // should land on their own workspace, not a browse page.
  venue: "/business/dashboard",
  vendor: "/business/dashboard",
  seller: "/vendors",
  admin: "/dashboard",
};

const STORAGE_KEY = "wedthread.activeRole";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const user = await getSessionUser();
      if (!user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as AppRole);
    },
    staleTime: 60_000,
  });
}

export function useActiveRole() {
  const { data: roles, isLoading } = useMyRoles();
  const qc = useQueryClient();
  const [active, setActive] = useState<AppRole | null>(() => {
    if (typeof window === "undefined") return null;
    return (window.localStorage.getItem(STORAGE_KEY) as AppRole | null) ?? null;
  });

  useEffect(() => {
    if (!roles || roles.length === 0) return;
    if (!active || !roles.includes(active)) {
      const next = roles[0];
      setActive(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, [roles, active]);

  const changeActive = (r: AppRole) => {
    setActive(r);
    window.localStorage.setItem(STORAGE_KEY, r);
    qc.invalidateQueries({ queryKey: ["my-roles"] });
  };

  return { active, roles: roles ?? [], setActive: changeActive, isLoading };
}

export async function addRoleForCurrentUser(role: AppRole) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: u.user.id, role })
    .select()
    .maybeSingle();
  // Unique violation is fine — role already exists.
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, role);
}

// Removes a role from the current user's account — used by "leave this
// workspace" for roles with no underlying data row of their own (admin has
// no business/wedding to delete; the role IS the workspace). Vendor/venue/
// couple "delete workspace" instead deletes the business/wedding row and
// deliberately leaves the role in place, so re-onboarding under the same
// role just works — this helper is for the one case that has nothing else
// to delete.
export async function removeRoleForCurrentUser(role: AppRole) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("user_roles").delete().eq("user_id", u.user.id).eq("role", role);
  if (error) throw error;
}
