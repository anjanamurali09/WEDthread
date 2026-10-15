import { supabase } from "@/integrations/supabase/client";

// What venues and vendors pay to be listed, per month in US dollars. These are shown to people; the amounts that
// are actually charged are the prices set up in Stripe (the STRIPE_PRICE_VENUE and STRIPE_PRICE_VENDOR secrets).
export const LISTING_PRICE = { vendor: "$4.99", venue: "$9.99" } as const;

async function callBilling(action: "checkout" | "portal", businessId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("business-billing", { body: { action, business_id: businessId } });
  if (error) {
    // The function explains what went wrong in its response body.
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message ?? "Could not reach the payment page");
  }
  if (!data?.url) throw new Error("Could not reach the payment page");
  return data.url as string;
}

// Takes the owner to Stripe to pay for their listing. They come back to the workspace afterwards.
export async function startListingCheckout(businessId: string) {
  window.location.href = await callBilling("checkout", businessId);
}

// Takes the owner to Stripe to change their card, see invoices or cancel.
export async function openBillingPortal(businessId: string) {
  window.location.href = await callBilling("portal", businessId);
}
