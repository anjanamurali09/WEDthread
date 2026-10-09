import { useCallback, useState } from "react";

// Like useState, but the value is remembered in this browser and comes back after a refresh. Meant for small
// per-person preferences such as which table columns are shown. `revive` can tidy up whatever was saved (for
// example fill in options added since). Reading storage can fail (private windows, blocked storage), in which
// case the default is used and nothing breaks.
export function usePersistedState<T>(key: string, initial: T, revive?: (stored: unknown) => T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        return revive ? revive(parsed) : (parsed as T);
      }
    } catch { /* fall through to the default */ }
    return initial;
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);
  return [value, set];
}
