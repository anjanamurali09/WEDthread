import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type IntegrationConnection = Tables<"integrations">;
export type IntegrationLink = Tables<"integration_links">;
export type LinkKind = "guests" | "budget";

export const LINK_KINDS: { kind: LinkKind; label: string; blurb: string }[] = [
  { kind: "guests", label: "Guest list", blurb: "Names, contact details, dietary needs and tags." },
  { kind: "budget", label: "Budget", blurb: "Every expense with its category, amount and status." },
];

// Edge Functions return a JSON {error} on failure, but supabase-js only surfaces a generic
// "non-2xx" message — read the real one off the response so people see what went wrong.
export async function callIntegrationFn<T = any>(name: "google-oauth" | "google-sheets-sync", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try { message = (await (error as any).context.json()).error ?? message; } catch { /* keep generic */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useIntegrations(weddingId?: string) {
  return useQuery({
    queryKey: ["integrations", weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<{ connection: IntegrationConnection | null; links: IntegrationLink[] }> => {
      const [conn, links] = await Promise.all([
        supabase.from("integrations").select("*").eq("wedding_id", weddingId!).eq("provider", "google").maybeSingle(),
        supabase.from("integration_links").select("*").eq("wedding_id", weddingId!),
      ]);
      // Tables missing (migration not run yet) just reads as "not connected".
      if (conn.error || links.error) return { connection: null, links: [] };
      return { connection: conn.data, links: links.data ?? [] };
    },
  });
}

const AUTO_SYNC_EVERY_MS = 3 * 60_000;

// Keeps linked sheets in step while the app is open: syncs shortly after load, every few
// minutes, and whenever the tab regains focus (a couple switching back from editing the
// sheet). Only links with auto-sync on are touched; a sync already in flight is never doubled up.
export function useIntegrationAutoSync(weddingId?: string) {
  const { data } = useIntegrations(weddingId);
  const qc = useQueryClient();
  const busy = useRef(false);
  const hasAuto = !!data?.links.some((l) => l.auto_sync);

  useEffect(() => {
    if (!weddingId || !hasAuto) return;
    const run = async () => {
      if (busy.current || document.visibilityState === "hidden") return;
      busy.current = true;
      try {
        await callIntegrationFn("google-sheets-sync", { action: "sync", wedding_id: weddingId, only_auto: true });
        ["guests", "expenses", "guest-tags", "integrations"].forEach((k) => qc.invalidateQueries({ queryKey: [k, weddingId] }));
      } catch { /* shown on the Integrations card via last_error; never interrupt the page */ }
      busy.current = false;
    };
    const first = setTimeout(run, 4000);
    const timer = setInterval(run, AUTO_SYNC_EVERY_MS);
    window.addEventListener("focus", run);
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener("focus", run); };
  }, [weddingId, hasAuto, qc]);
}
