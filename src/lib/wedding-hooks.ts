import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Wedding = Tables<"weddings">;
export type Event = Tables<"events">;
export type Guest = Tables<"guests">;
export type Invite = Tables<"guest_event_invites">;
export type WTable = Tables<"wedding_tables">;
export type Seat = Tables<"seat_assignments">;
export type RsvpQuestion = Tables<"rsvp_questions">;
export type MenuSection = Tables<"menu_sections">;
export type MenuItem = Tables<"menu_items">;
export type Expense = Tables<"expenses">;
export type BudgetCategory = Tables<"budget_categories">;
export type BudgetCustomColumn = Tables<"budget_custom_columns">;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useCurrentWedding() {
  return useQuery({
    queryKey: ["current-wedding"],
    queryFn: async (): Promise<Wedding | null> => {
      const uid = await getUserId();
      if (!uid) return null;
      const { data, error } = await supabase
        .from("weddings")
        .select("*")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useEvents(weddingId?: string) {
  return useQuery({
    queryKey: ["events", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("sort_order")
        .order("event_date");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGuests(weddingId?: string) {
  return useQuery({
    queryKey: ["guests", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Guest[]> => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvites(weddingId?: string) {
  return useQuery({
    queryKey: ["invites", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Invite[]> => {
      if (!weddingId) return [];
      // fetch invites via guests join
      const { data: gs } = await supabase.from("guests").select("id").eq("wedding_id", weddingId);
      const ids = (gs ?? []).map((g) => g.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("guest_event_invites").select("*").in("guest_id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRsvpQuestions(weddingId?: string) {
  return useQuery({
    queryKey: ["rsvp-questions", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<RsvpQuestion[]> => {
      const { data, error } = await supabase
        .from("rsvp_questions")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMenuSections(eventId?: string) {
  return useQuery({
    queryKey: ["menu-sections", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<MenuSection[]> => {
      const { data, error } = await supabase
        .from("menu_sections")
        .select("*")
        .eq("event_id", eventId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMenuItems(sectionIds: string[]) {
  return useQuery({
    queryKey: ["menu-items", sectionIds.join(",")],
    enabled: sectionIds.length > 0,
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExpenses(weddingId?: string) {
  return useQuery({
    queryKey: ["expenses", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetCategories(weddingId?: string) {
  return useQuery({
    queryKey: ["budget-categories", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<BudgetCategory[]> => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetCustomColumns(weddingId?: string) {
  return useQuery({
    queryKey: ["budget-custom-columns", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<BudgetCustomColumn[]> => {
      const { data, error } = await supabase
        .from("budget_custom_columns")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvalidateWedding() {
  const qc = useQueryClient();
  return (weddingId?: string) => {
    qc.invalidateQueries({ queryKey: ["current-wedding"] });
    qc.invalidateQueries({ queryKey: ["events", weddingId] });
    qc.invalidateQueries({ queryKey: ["guests", weddingId] });
    qc.invalidateQueries({ queryKey: ["invites", weddingId] });
    qc.invalidateQueries({ queryKey: ["tables", weddingId] });
    qc.invalidateQueries({ queryKey: ["expenses", weddingId] });
  };
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    },
  });
}
