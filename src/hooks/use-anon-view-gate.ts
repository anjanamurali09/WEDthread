import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "wedthread.anonListingViews";
const FREE_VIEW_LIMIT = 3;

type ViewedState = { venue: string[]; vendor: string[] };

function readViewed(): ViewedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { venue: [], vendor: [] };
    const parsed = JSON.parse(raw);
    // Back-compat: the old shape was a flat string[] shared across both
    // kinds — carry those ids over as venue views so an in-progress visitor
    // doesn't get a free reset the first time they load this new shape.
    if (Array.isArray(parsed)) return { venue: parsed, vendor: [] };
    return { venue: parsed.venue ?? [], vendor: parsed.vendor ?? [] };
  } catch { return { venue: [], vendor: [] }; }
}

function writeViewed(state: ViewedState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// A signed-out visitor can open FREE_VIEW_LIMIT distinct venues AND
// FREE_VIEW_LIMIT distinct vendors (separate buckets — 3 of each, not 3
// total) before being asked to sign up. Revisiting one already viewed never
// costs another. Signed-in visitors never hit this; it's a soft, client-side
// browsing nudge, not a security boundary — the underlying data is already
// public.
export function useAnonViewGate(listingId: string, kind: "venue" | "vendor") {
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGated(false);
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) { setLoading(false); return; }

      const state = readViewed();
      const viewed = state[kind];
      if (viewed.includes(listingId)) { setLoading(false); return; }
      if (viewed.length >= FREE_VIEW_LIMIT) { setGated(true); setLoading(false); return; }

      writeViewed({ ...state, [kind]: [...viewed, listingId] });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listingId, kind]);

  return { loading, gated };
}
