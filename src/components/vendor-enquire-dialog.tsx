import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnquireForm } from "@/components/enquire-form";

// Self-contained: renders its own "Enquire" trigger and the modal (the app's
// custom Dialog, never a native <dialog>/confirm). The form itself lives in
// EnquireForm — this component is just the trigger + Dialog chrome around
// it, so the embedded "Browse vendors" page can reuse the exact same form
// inline, without a modal, alongside this.
//
// Pass exactly one of vendorServiceId (a vendor's service — Phase 3/4) or
// businessId (a venue, which has no sub-services — Phase 5).
export function VendorEnquireDialog({ vendorServiceId, businessId, serviceName, businessName, triggerLabel = "Request details", renderTrigger }: {
  vendorServiceId?: string; businessId?: string; serviceName: string; businessName?: string;
  triggerLabel?: string;
  // For a spot that needs its own compact trigger (e.g. a sticky bar) instead
  // of the default full-size button — called with the function to open the dialog.
  renderTrigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {renderTrigger ? renderTrigger(() => setOpen(true)) : (
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-full bg-cherry text-pearl px-6 py-3 text-sm font-medium hover:bg-wine cursor-pointer">
          {triggerLabel}
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-5 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal tracking-normal leading-snug">{triggerLabel} about {serviceName}</DialogTitle>
          </DialogHeader>
          <EnquireForm vendorServiceId={vendorServiceId} businessId={businessId} businessName={businessName} />
        </DialogContent>
      </Dialog>
    </>
  );
}
