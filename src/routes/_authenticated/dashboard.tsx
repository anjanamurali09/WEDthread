import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites } from "@/lib/wedding-hooks";
import { CalendarDays, Users, Grid3x3, Globe, ArrowRight, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const { data: wedding, isLoading } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);

  useEffect(() => {
    if (!isLoading && !wedding) navigate({ to: "/onboarding", replace: true });
  }, [wedding, isLoading, navigate]);

  if (!wedding) return null;

  const rsvpd = invites.filter((i) => i.rsvp_status !== "pending").length;
  const attending = invites.filter((i) => i.rsvp_status === "attending").length;
  const totalInvites = invites.length;

  return (
    <AppShell
      title={`${wedding.partner_a} & ${wedding.partner_b}`}
      subtitle={wedding.destination_city ? `${wedding.destination_city}${wedding.destination_country ? ", " + wedding.destination_country : ""} · ${wedding.est_guest_count ?? "-"} guests estimated` : "Set your destination in Events."}
    >
      {/* Event timeline */}
      <section className="paper-card p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Your ceremonies</h2>
          <Link to="/events" className="text-xs text-clay uppercase tracking-widest inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {events.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-muted-foreground">No events yet. Add mehendi, sangeet, nikah, ceremony, reception, whatever your wedding has.</p>
            <Link to="/events" className="mt-4 inline-flex rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay">Add your first event</Link>
          </div>
        ) : (
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e, i) => (
              <div key={e.id} className="border border-line rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-widest text-clay">Event {i + 1}</p>
                <p className="mt-1 font-serif text-2xl">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                  {e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}
                </p>
                {e.venue_name && <p className="text-sm mt-3">{e.venue_name}{e.city ? ` · ${e.city}` : ""}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progress tiles */}
      <section className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile to="/events" icon={CalendarDays} label="Events" value={String(events.length)} sub={events.length === 1 ? "ceremony" : "ceremonies"} />
        <Tile to="/guests" icon={Users} label="Guests" value={String(guests.length)} sub={`${attending} attending`} />
        <Tile to="/seating" icon={Grid3x3} label="RSVPs" value={`${totalInvites ? Math.round((rsvpd / totalInvites) * 100) : 0}%`} sub={`${rsvpd} of ${totalInvites} responded`} />
        <Tile to="/website" icon={Globe} label="Website" value={wedding.site_published ? "Live" : "Draft"} sub={`/w/${wedding.slug ?? "-"}`} />
      </section>

      {/* Discover */}
      <section className="mt-10 grid md:grid-cols-2 gap-4">
        <Link to="/venues" className="paper-card p-6 hover:shadow-md transition-shadow group">
          <p className="text-[10px] uppercase tracking-widest text-clay">Discover</p>
          <h3 className="font-serif text-2xl mt-1">Destination venues</h3>
          <p className="mt-2 text-sm text-muted-foreground">Palaces, beach resorts, vineyards, hill retreats, filter by destination and capacity.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs text-clay uppercase tracking-widest group-hover:gap-2 transition-all">Browse venues <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/vendors" className="paper-card p-6 hover:shadow-md transition-shadow group">
          <p className="text-[10px] uppercase tracking-widest text-clay">Discover</p>
          <h3 className="font-serif text-2xl mt-1">Vendors near your ceremonies</h3>
          <p className="mt-2 text-sm text-muted-foreground">Planners, photographers, mehendi artists, florists, filtered by the destination you actually chose.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs text-clay uppercase tracking-widest group-hover:gap-2 transition-all">Browse vendors <ArrowRight className="h-3 w-3" /></span>
        </Link>
      </section>

      {/* Messaging */}
      <section className="mt-10 paper-card p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-clay inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</p>
            <h3 className="font-serif text-2xl mt-1">Automated guest messages</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">Save-the-dates, RSVP requests, T-7 reminders and thank-yous. Schedule once, Vowzy sends them.</p>
          </div>
          <Link to="/messages" className="rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay">Open messaging</Link>
        </div>
      </section>
    </AppShell>
  );
}

function Tile({ to, icon: Icon, label, value, sub }: { to: any; icon: any; label: string; value: string; sub: string }) {
  return (
    <Link to={to} className="paper-card p-5 hover:shadow-md transition-shadow block">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-clay" />
      </div>
      <p className="mt-3 font-serif text-4xl">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Link>
  );
}
