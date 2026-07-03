import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Check, X as XIcon, HelpCircle, MapPin, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/rsvp/$token")({ component: RsvpPage });

type Row = {
  guest_id: string; guest_name: string; wedding_id: string;
  partner_a: string; partner_b: string;
  event_id: string; event_name: string; event_date: string | null; event_time: string | null;
  venue_name: string | null; city: string | null;
  current_status: string; current_plus_ones: number;
};

function RsvpPage() {
  const { token } = Route.useParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_rsvp_context", { _token: token });
    setLoading(false);
    if (error || !data || (data as any).length === 0) { setRows([]); return; }
    setRows(data as any);
  };
  useEffect(() => { load(); }, [token]);

  const respond = async (event_id: string, status: string, plus_ones: number) => {
    setSaving(event_id);
    const { error } = await supabase.rpc("submit_rsvp", { _token: token, _event_id: event_id, _status: status as any, _plus_ones: plus_ones });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Thanks, your response is saved");
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-paper"><p className="text-sm text-muted-foreground">Loading your invitation…</p></div>;

  if (!rows || rows.length === 0) return (
    <div className="min-h-screen grid place-items-center bg-paper text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-clay">Invitation not found</p>
        <h1 className="mt-2 font-serif text-3xl">This link may have expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please contact the couple for a new RSVP link.</p>
      </div>
    </div>
  );

  const [first] = rows;

  return (
    <div className="min-h-screen bg-paper py-14 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-3.5 w-3.5" /></span>
          <span className="font-serif text-xl">Vowzy</span>
        </div>
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-clay">You are invited to celebrate</p>
        <h1 className="mt-4 text-center font-serif text-4xl md:text-6xl leading-tight">{first.partner_a} <span className="text-clay">&amp;</span> {first.partner_b}</h1>
        <p className="mt-4 text-center text-muted-foreground">Dear <span className="text-ink">{first.guest_name}</span>, please respond to each ceremony below.</p>

        <div className="mt-10 space-y-4">
          {rows.map((r) => (
            <div key={r.event_id} className="paper-card p-6">
              <p className="text-[10px] uppercase tracking-widest text-clay">Ceremony</p>
              <h3 className="font-serif text-2xl mt-1">{r.event_name}</h3>
              <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {r.event_date ? new Date(r.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                {r.event_time ? ` · ${r.event_time.slice(0,5)}` : ""}
              </p>
              {(r.venue_name || r.city) && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[r.venue_name, r.city].filter(Boolean).join(" · ")}</p>}

              <div className="mt-5 flex flex-wrap gap-2">
                <RsvpBtn active={r.current_status === "attending"} onClick={() => respond(r.event_id, "attending", r.current_plus_ones)} icon={Check} label="Joyfully accept" />
                <RsvpBtn active={r.current_status === "maybe"} onClick={() => respond(r.event_id, "maybe", 0)} icon={HelpCircle} label="Maybe" />
                <RsvpBtn active={r.current_status === "declined"} onClick={() => respond(r.event_id, "declined", 0)} icon={XIcon} label="Regretfully decline" />
              </div>

              {r.current_status === "attending" && (
                <label className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  Bringing:
                  <select value={r.current_plus_ones} onChange={(e) => respond(r.event_id, "attending", Number(e.target.value))} className="rounded-full border border-line px-3 py-1 bg-paper">
                    {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n === 0 ? "just me" : `+${n} guest${n === 1 ? "" : "s"}`}</option>)}
                  </select>
                  {saving === r.event_id && <span className="text-clay">saving…</span>}
                </label>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[11px] uppercase tracking-widest text-muted-foreground">Powered by Vowzy</p>
      </div>
    </div>
  );
}

function RsvpBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition-colors ${active ? "bg-ink text-paper border-ink" : "border-line hover:bg-stone"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
