import type { Invite } from "./wedding-hooks";

// A guest is only "responded" once every event they're personally invited to has a
// firm answer (accept or decline) — a "maybe", or any still-pending event, keeps them
// counted as pending. This mirrors per-event RSVP data (unchanged) into per-guest stats.
const RESPONDED_STATUSES = new Set(["attending", "declined"]);

export function guestInvites(guestId: string, invites: Invite[], eventId?: string | null): Invite[] {
  const gi = invites.filter((i) => i.guest_id === guestId);
  return eventId ? gi.filter((i) => i.event_id === eventId) : gi;
}

export function isGuestAttending(relevant: Invite[]): boolean {
  return relevant.some((i) => i.rsvp_status === "attending");
}

export function isGuestResponded(relevant: Invite[]): boolean {
  return relevant.length > 0 && relevant.every((i) => RESPONDED_STATUSES.has(i.rsvp_status));
}

/** Per-guest RSVP summary, optionally scoped to a single event's invite. Guests with no
 * relevant invite are excluded from every count — there's nothing to respond to yet. */
export function summarizeGuestRsvps(guestIds: string[], invites: Invite[], eventId?: string | null) {
  let invitedCount = 0, attending = 0, responded = 0;
  for (const guestId of guestIds) {
    const relevant = guestInvites(guestId, invites, eventId);
    if (relevant.length === 0) continue;
    invitedCount++;
    if (isGuestAttending(relevant)) attending++;
    if (isGuestResponded(relevant)) responded++;
  }
  return { invited: invitedCount, attending, responded, pending: invitedCount - responded };
}
