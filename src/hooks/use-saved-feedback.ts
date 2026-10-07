import { useRef, useState } from "react";

export type SaveStatus = "idle" | "saved" | "error";

// Replaces a toast on save: the button itself carries the feedback (a
// color/label change for a few seconds, then back to normal) instead of a
// floating "Saved." popup. markSaved()/markError() are meant to be called
// right where a toast.success/toast.error used to go.
export function useSavedFeedback(durationMs = 5000) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const markSaved = () => {
    clearPending();
    setStatus("saved");
    setErrorMessage(null);
    timeoutRef.current = setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), durationMs);
  };

  const markError = (message?: string) => {
    clearPending();
    setStatus("error");
    setErrorMessage(message ?? null);
    timeoutRef.current = setTimeout(() => setStatus((s) => (s === "error" ? "idle" : s)), durationMs);
  };

  return { status, errorMessage, markSaved, markError };
}
