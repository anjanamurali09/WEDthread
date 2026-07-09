import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "couple" | "planner" | "venue" | "vendor" | "seller" | "admin";

export const ROLE_LANDING: Record<AppRole, string> = {
  couple: "/dashboard",
  planner: "/dashboard",
  venue: "/vendors",
  vendor: "/vendors",
  seller: "/vendors",
  admin: "/dashboard",
};

const STORAGE_KEY = "vowzy.activeRole";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
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
