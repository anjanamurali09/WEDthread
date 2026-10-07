import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { Loader2, CreditCard } from "lucide-react";

// Reads the Stripe publishable key from Vite env — same VITE_-prefixed
// convention as src/integrations/supabase/client.ts. Set
// VITE_STRIPE_PUBLISHABLE_KEY in the app's .env to enable this; until then
// this dialog shows a "not configured" message instead of crashing.
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

// Reusable "Add Payment Method" flow: Stripe's Payment Element over a
// SetupIntent, fully client-side confirmation. The resulting card-on-file
// (brand/last4 + the actual payment_methods row) is persisted by the
// stripe-webhook function reacting to setup_intent.succeeded — this
// component only drives the Stripe UI and tells the caller when it's done.
export function AddPaymentMethodDialog({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientSecret(null);
    setError(null);
    setLoading(true);
    (async () => {
      const { data, error: fnError } = await supabase.functions.invoke<{ clientSecret: string; error?: string }>("create-setup-intent", { body: {} });
      if (fnError || !data?.clientSecret) {
        setError(data?.error ?? fnError?.message ?? "Could not start payment setup.");
      } else {
        setClientSecret(data.clientSecret);
      }
      setLoading(false);
    })();
  }, [open]);

  const stripe = getStripe();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2"><CreditCard className="h-5 w-5" /> Add a payment method</DialogTitle>
          <p className="text-sm text-muted-foreground">Optional — saving a card just makes future enquiries faster.</p>
        </DialogHeader>

        {!stripe ? (
          <p className="text-sm text-muted-foreground py-4">Payment setup isn't configured yet.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : error ? (
          <p className="text-sm text-cherry py-4">{error}</p>
        ) : clientSecret ? (
          <Elements stripe={stripe} options={{ clientSecret }}>
            <SetupForm onDone={() => { onOpenChange(false); onSaved?.(); }} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    setSubmitting(false);
    if (error) return toast.error(error.message ?? "Could not save card.");
    if (setupIntent?.status === "succeeded") {
      toast.success("Card saved.");
      onDone();
    } else {
      toast.info("Finishing setup — this may take a moment.");
      onDone();
    }
  };

  return (
    <>
      <div className="py-2"><PaymentElement /></div>
      <DialogFooter>
        <button type="button" onClick={submit} disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : "Save card"}
        </button>
      </DialogFooter>
    </>
  );
}
