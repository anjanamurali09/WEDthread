import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dedupeByLabel } from "@/lib/utils";
import { toast } from "sonner";
import type { SelectOption } from "@/components/searchable-multi-select";

// Shared by every category picker (admin add/edit, a vendor's own self-serve
// edit, and the marketplace filter) so the dedupe logic and "add a missing
// category" behavior stay in one place.
export function useVendorCategories() {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendor_categories").select("id,name").order("name").then(({ data }) => {
      setCategories(dedupeByLabel((data ?? []).map((c) => ({ value: c.id, label: c.name }))));
      setLoading(false);
    });
  }, []);

  const createCategory = async (name: string): Promise<SelectOption | null> => {
    const { data, error } = await supabase.from("vendor_categories").insert({ name }).select("id,name").single();
    if (error) { toast.error(error.message); return null; }
    const opt = { value: data.id, label: data.name };
    setCategories((prev) => dedupeByLabel([...prev, opt]).sort((a, b) => a.label.localeCompare(b.label)));
    return opt;
  };

  return { categories, loading, createCategory };
}
