import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Destructive, cascading, irreversible — requires typing the exact name
// back (not just a yes/no click) before the button even becomes clickable.
// Shared by every "delete a workspace" flow (vendor/venue business, wedding,
// admin role) so the confirmation bar is the same everywhere.
export function DeleteWorkspaceDialog({ open, onOpenChange, title, description, confirmWith, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  // The exact text the user must retype to enable the delete button.
  confirmWith: string;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const close = (v: boolean) => { if (!v) setTyped(""); onOpenChange(v); };
  // Ignores capital letters and extra spaces: the name is shown in capitals by the label's styling, so people
  // naturally type it that way.
  const normalise = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  const matches = normalise(typed) === normalise(confirmWith);

  const confirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cherry">{title}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <label className="mt-5 block">
          <span className="text-sm uppercase tracking-widest text-muted-foreground">
            Type <span className="font-medium normal-case text-ink">{confirmWith}</span> to confirm
          </span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus
            className="mt-3 w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
        </label>

        <DialogFooter>
          <button type="button" onClick={() => close(false)}
            className="rounded-full px-5 py-2.5 text-sm border border-line hover:bg-stone cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!matches || deleting}
            className="inline-flex items-center gap-2 rounded-full bg-cherry text-pearl px-6 py-2.5 text-sm font-medium hover:bg-wine disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
