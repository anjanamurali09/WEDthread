import { X } from "lucide-react";

/* Shared destructive-action confirmation, matching the app's existing modal styling
   (EventDialog/GuestDialog: bg-ink/40 overlay, bg-paper rounded-3xl card). Reserved for
   actions that cascade or destroy more than a single easily-re-added line item — see
   src/routes/_authenticated/guests.tsx's confirmDeleteGuest for a usage example. */
export function ConfirmDialog({ title, description, confirmLabel = "Delete", onConfirm, onCancel }: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-paper rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-ink cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <div className="flex justify-end gap-2 pt-6">
          <button type="button" onClick={onCancel} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone cursor-pointer">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-destructive text-destructive-foreground px-6 py-2 text-sm hover:opacity-90 cursor-pointer">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
