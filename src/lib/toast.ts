// Drop-in replacement for the old floating popups ("toasts").
//
// Success messages are intentionally silent: the page itself already shows what changed (a new
// collaborator appears in the list, a saved button changes label, and so on).
//
// Errors must never be silent, so they are shown in a thin bar across the top of the page
// (see components/error-bar.tsx) instead of a floating card, and stay until closed.

type Listener = () => void;
let current: string | null = null;
const listeners = new Set<Listener>();

function publish(message: string | null) {
  current = message;
  listeners.forEach((l) => l());
}

export function subscribeToErrors(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export const getCurrentError = () => current;
export const dismissError = () => publish(null);

const quiet = (..._args: unknown[]) => undefined;

export const toast = Object.assign(quiet, {
  success: quiet,
  info: quiet,
  message: quiet,
  warning: quiet,
  dismiss: dismissError,
  error: (message: unknown) => {
    const text = typeof message === "string" ? message : message instanceof Error ? message.message : "Something went wrong.";
    console.error("[error]", text);
    publish(text || "Something went wrong.");
  },
});
