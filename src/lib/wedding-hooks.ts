import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_FOOD_TAGS, DIET_COLOR, ALLERGY_COLOR } from "@/lib/dietary-tags";

export type Wedding = Tables<"weddings">;
export type Event = Tables<"events">;
export type Guest = Tables<"guests">;
export type Invite = Tables<"guest_event_invites">;
export type WTable = Tables<"wedding_tables">;
export type Seat = Tables<"seat_assignments">;
export type RsvpQuestion = Tables<"rsvp_questions">;
export type RsvpResponse = Tables<"rsvp_responses">;
export type MenuSection = Tables<"menu_sections">;
export type MenuItem = Tables<"menu_items">;
export type Expense = Tables<"expenses">;
export type BudgetCategory = Tables<"budget_categories">;
export type BudgetCustomColumn = Tables<"budget_custom_columns">;
export type PaymentReminder = Tables<"payment_reminders">;
export type Note = Tables<"notes">;
export type Collaborator = Tables<"wedding_collaborators">;
export type WeddingPhoto = Tables<"wedding_photos">;
export type GuestTag = Tables<"guest_tags">;
export type FoodTag = Tables<"food_tags">;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Single source of truth for "does this couple already have a wedding" used by every
// post-sign-in entry point (auth callback, login dialog). Previously each entry point ran
// its own copy of this query and only destructured `data`, silently ignoring `error` — a
// transient failure (RLS hiccup, RPC not yet migrated, brief auth-hydration race) would
// read as "no wedding" and route a returning couple straight into the onboarding form,
// which is exactly how duplicate blank wedding rows got created. On any error here we
// deliberately do NOT assume "no wedding" — we send the user to /dashboard, which is
// read-only and re-checks via useCurrentWedding() rather than ever creating a row.
export async function resolveCoupleLanding(_userId: string): Promise<"/dashboard" | "/onboarding"> {
  // A wedding the person owns OR is invited to as a collaborator (matched by email) counts: someone
  // invited to an existing wedding goes straight to it, never to "create your own wedding".
  const { data, error } = await supabase.rpc("get_my_current_wedding");
  if (error) {
    console.error("wedding lookup failed after sign-in; defaulting to /dashboard, not onboarding", error);
    return "/dashboard";
  }
  return (data as { id?: string } | null)?.id ? "/dashboard" : "/onboarding";
}

export function useCurrentWedding() {
  return useQuery({
    queryKey: ["current-wedding"],
    queryFn: async (): Promise<Wedding | null> => {
      const uid = await getUserId();
      if (!uid) return null;
      // Finds a wedding the user owns OR collaborates on (matched by email) — a plain
      // `.eq("owner_id", uid)` filter would miss collaborator access entirely, and relying
      // on RLS alone here would over-match: the `weddings` table also has a broader
      // "published sites are readable by any authenticated user" policy for public site
      // rendering, so this needs the RPC's explicit owner-or-collaborator scoping.
      const { data, error } = await supabase.rpc("get_my_current_wedding");
      if (error) throw error;
      // A signed-in collaborator opening the wedding is what "accepting" the invitation means.
      // Best effort: a failure here must never stop the wedding from loading.
      if (data && (data as { owner_id?: string }).owner_id !== uid) {
        void (supabase as any).rpc("accept_collaborator_invites").then(() => undefined, () => undefined);
      }
      return data ?? null;
    },
  });
}

export function useCollaborators(weddingId?: string) {
  return useQuery({
    queryKey: ["collaborators", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Collaborator[]> => {
      const { data, error } = await supabase
        .from("wedding_collaborators")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
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

// rsvp_responses has no wedding_id of its own (it hangs off guest_id), so — same
// two-step shape as useInvites above — this fetches the wedding's guest ids first,
// then every response belonging to any of them.
export function useRsvpResponses(weddingId?: string) {
  return useQuery({
    queryKey: ["rsvp-responses", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<RsvpResponse[]> => {
      if (!weddingId) return [];
      const { data: gs } = await supabase.from("guests").select("id").eq("wedding_id", weddingId);
      const ids = (gs ?? []).map((g) => g.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("rsvp_responses").select("*").in("guest_id", ids);
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

export function useNotes(weddingId?: string) {
  return useQuery({
    queryKey: ["notes", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("updated_at", { ascending: false });
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

export function useWeddingPhotos(weddingId?: string) {
  return useQuery({
    queryKey: ["wedding-photos", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<WeddingPhoto[]> => {
      const { data, error } = await supabase
        .from("wedding_photos")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGuestTags(weddingId?: string) {
  return useQuery({
    queryKey: ["guest-tags", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<GuestTag[]> => {
      const { data, error } = await supabase
        .from("guest_tags")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Dietary / allergen library. A wedding starts with the usual defaults, seeded on first
// load; if the table doesn't exist yet (migration not run) the defaults are returned
// read-only so the Menu and Guests pages keep working.
export function useFoodTags(weddingId?: string) {
  return useQuery({
    queryKey: ["food-tags", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<FoodTag[]> => {
      const fallback = (): FoodTag[] => DEFAULT_FOOD_TAGS.map((t) => ({
        id: `default:${t.name}`, wedding_id: weddingId!, name: t.name, kind: t.kind, abbr: t.abbr,
        color: t.kind === "allergy" ? ALLERGY_COLOR : DIET_COLOR, emoji: null, created_at: "",
      }));
      const load = () => supabase.from("food_tags").select("*").eq("wedding_id", weddingId!).order("created_at").order("name");
      const first = await load();
      if (first.error) return fallback();
      if (first.data.length > 0) return first.data;
      await supabase.from("food_tags").upsert(
        DEFAULT_FOOD_TAGS.map((t) => ({
          wedding_id: weddingId!, name: t.name, kind: t.kind, abbr: t.abbr,
          color: t.kind === "allergy" ? ALLERGY_COLOR : DIET_COLOR,
        })),
        { onConflict: "wedding_id,name", ignoreDuplicates: true },
      );
      const second = await load();
      return second.error || second.data.length === 0 ? fallback() : second.data;
    },
  });
}

export function usePaymentReminders(weddingId?: string) {
  return useQuery({
    queryKey: ["payment-reminders", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<PaymentReminder[]> => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("wedding_id", weddingId!)
        .order("due_date");
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
    qc.invalidateQueries({ queryKey: ["guest-tags", weddingId] });
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
