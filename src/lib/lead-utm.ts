// UTM helpers — single source of truth for outbound attribution.

export type LeadKind = "vendor" | "venue";
export type LeadChannel = "whatsapp" | "inquiry";

export function utmParams(kind: LeadKind, channel: LeadChannel, id: string): Record<string, string> {
  return {
    utm_source: "vowzy",
    utm_medium: "referral",
    utm_campaign: `${kind}_${channel}`,
    utm_content: id,
  };
}

export function appendUtm(url: string, kind: LeadKind, channel: LeadChannel, id: string): string {
  try {
    const u = new URL(url);
    const p = utmParams(kind, channel, id);
    for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    const qs = new URLSearchParams(utmParams(kind, channel, id)).toString();
    return url + (url.includes("?") ? "&" : "?") + qs;
  }
}

export function whatsappUrl(
  phone: string,
  message: string,
  kind: LeadKind,
  id: string,
): string {
  const clean = phone.replace(/[^\d]/g, "");
  const tag = `\n\nvia Vowzy · ref:${kind}:${id}`;
  const text = encodeURIComponent(message + tag);
  return `https://wa.me/${clean}?text=${text}`;
}

export function buildLeadMessage(opts: {
  partnerA?: string | null;
  partnerB?: string | null;
  city?: string | null;
  country?: string | null;
  date?: string | null;
  guests?: number | null;
  targetName: string;
}): string {
  const who = [opts.partnerA, opts.partnerB].filter(Boolean).join(" & ") || "A couple planning their wedding";
  const where = [opts.city, opts.country].filter(Boolean).join(", ");
  const when = opts.date ? new Date(opts.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "date TBD";
  const guests = opts.guests ? `~${opts.guests} guests` : "";
  return `Hi ${opts.targetName}, ${who} found you on Vowzy and we'd love to check availability.\nWedding: ${when}${where ? ` · ${where}` : ""}${guests ? ` · ${guests}` : ""}.`;
}
