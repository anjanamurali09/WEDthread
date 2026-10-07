import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { autoAbbr, type FoodKind } from "@/lib/dietary-tags";
import type { FoodTag } from "@/lib/wedding-hooks";

type TagInput = { name: string; color: string; emoji: string | null };

// Create / rename / delete for the dietary + allergen library. Menu items and guests store
// tag NAMES, so renaming or deleting a tag also rewrites every dish and guest wearing it.
export function useFoodTagActions(weddingId: string | undefined, tags: FoodTag[]) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["food-tags", weddingId] });
    qc.invalidateQueries({ queryKey: ["guests", weddingId] });
    qc.invalidateQueries({ queryKey: ["menu-items"] });
  };
  const isFallback = tags.some((t) => t.id.startsWith("default:"));
  const blocked = () => { toast.error("Run the food tags migration first to add or edit tags."); };

  const create = async (kind: FoodKind, input: TagInput) => {
    if (!weddingId) return;
    if (isFallback) return blocked();
    const abbr = autoAbbr(input.name, kind, tags.filter((t) => t.kind === kind).map((t) => t.abbr));
    const { error } = await supabase.from("food_tags").insert({ wedding_id: weddingId, kind, abbr, ...input });
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const rewriteNames = async (from: string, to: string | null) => {
    const swap = (arr: string[]) => (to ? arr.map((x) => (x === from ? to : x)) : arr.filter((x) => x !== from));
    const [items, guests] = await Promise.all([
      supabase.from("menu_items").select("id, dietary_tags").contains("dietary_tags", [from]),
      supabase.from("guests").select("id, dietary_tags, food_allergies").eq("wedding_id", weddingId!),
    ]);
    await Promise.all([
      ...(items.data ?? []).map((it) => supabase.from("menu_items").update({ dietary_tags: swap(it.dietary_tags) }).eq("id", it.id)),
      ...(guests.data ?? [])
        .filter((g) => g.dietary_tags?.includes(from) || g.food_allergies?.includes(from))
        .map((g) => supabase.from("guests").update({ dietary_tags: swap(g.dietary_tags ?? []), food_allergies: swap(g.food_allergies ?? []) }).eq("id", g.id)),
    ]);
  };

  const update = async (id: string, oldName: string, input: TagInput) => {
    if (!weddingId) return;
    if (isFallback) return blocked();
    const { error } = await supabase.from("food_tags").update(input).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (input.name !== oldName) await rewriteNames(oldName, input.name);
    refresh();
  };

  const remove = async (id: string, name: string) => {
    if (!weddingId) return;
    if (isFallback) return blocked();
    const { error } = await supabase.from("food_tags").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await rewriteNames(name, null);
    refresh();
  };

  return { create, update, remove };
}
