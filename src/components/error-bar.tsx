import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { dismissError, getCurrentError, subscribeToErrors } from "@/lib/toast";

// A thin bar fixed to the very top of the page. Not a floating card: it spans the full width and
// stays until the person closes it (or the next error replaces it).
export function ErrorBar() {
  const message = useSyncExternalStore(subscribeToErrors, getCurrentError, () => null);
  if (!message) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 border-b border-destructive/30 bg-[#FDECEE] px-10 py-2 text-center text-sm font-medium text-[#9B1C2E]">
      <span>{message}</span>
      <button type="button" onClick={dismissError} aria-label="Dismiss" data-static className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9B1C2E]/70 hover:text-[#9B1C2E]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
