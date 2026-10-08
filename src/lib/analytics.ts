import { readConsent } from "@/lib/cookie-consent";

// Reports a named event to Google Tag Manager through the dataLayer, where the Google Analytics tag picks it up.
// Events are sent only after the visitor has accepted analytics cookies, so nothing is queued up behind the
// consent choice.
//
// Event names and parameters are deliberately free of personal information: never pass names, emails,
// phone numbers, guest details or free text here.
type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined" || !readConsent()?.analytics) return;
  (window.dataLayer = window.dataLayer || []).push({ event, ...params });
}
