import { useMemo, useState } from "react";
import { Bell, Check, Link2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Small hands-on demos for the feature pages, so a visitor can try the idea in a few seconds instead of reading.
// Everything here is example data held in the page; nothing is saved or sent anywhere.

const NAVY = "#243746";
const BLUE = "#7FA8D6";
const DEEP = "#4A7CAD";
const YELLOW = "#FFE08A";

function Frame({ title, hint, children, onReset }: { title: string; hint: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-paper p-5 shadow-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl leading-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        {onReset && (
          <button type="button" onClick={onReset} data-static className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-[#FFF7D6]">
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
          </button>
        )}
      </div>
      <div className="mt-6">{children}</div>
      <p className="mt-5 text-[11px] text-muted-foreground">Example data. Nothing here is saved.</p>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} data-static
      className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        on ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-dashed border-[#243746]/40 hover:border-[#243746]")}>
      {children}
    </button>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/* ------------------------------------------------------------------ Budget */

const BUDGET = 45000;
const CATS = [
  { name: "Venue", limit: 18000, spent: 15000 },
  { name: "Catering", limit: 12000, spent: 6500 },
  { name: "Photography", limit: 5000, spent: 3000 },
  { name: "Attire", limit: 4500, spent: 2400 },
  { name: "Decor", limit: 3500, spent: 1000 },
  { name: "Music", limit: 2000, spent: 0 },
];
const EVENTS = [
  { name: "Ceremony", limit: 14000, spent: 9400 },
  { name: "Cocktail hour", limit: 9000, spent: 3200 },
  { name: "Reception", limit: 22000, spent: 15300 },
];
const ADDS = [
  { label: "Flowers", amount: 1800, cat: "Decor", ev: "Ceremony" },
  { label: "DJ deposit", amount: 1500, cat: "Music", ev: "Reception" },
  { label: "Photographer balance", amount: 2500, cat: "Photography", ev: "Reception" },
  { label: "Venue upgrade", amount: 4000, cat: "Venue", ev: "Reception" },
];
const SLICE = [NAVY, BLUE, YELLOW, DEEP, "#B7CBE3", "#F2C94C"];

export function BudgetDemo() {
  const [by, setBy] = useState<"category" | "event">("category");
  const [style, setStyle] = useState<"bars" | "donut">("bars");
  const [added, setAdded] = useState<number[]>([]);

  const rows = useMemo(() => {
    const base = by === "category" ? CATS : EVENTS;
    return base.map((r) => ({
      ...r,
      spent: r.spent + added.reduce((sum, i) => sum + (ADDS[i][by === "category" ? "cat" : "ev"] === r.name ? ADDS[i].amount : 0), 0),
    }));
  }, [by, added]);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const remaining = BUDGET - spent;

  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Frame title="Watch your budget move" hint="Add an expense and see the totals and charts update straight away." onReset={() => { setAdded([]); setBy("category"); setStyle("bars"); }}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip on={by === "category"} onClick={() => setBy("category")}>By category</Chip>
            <Chip on={by === "event"} onClick={() => setBy("event")}>By event</Chip>
            <span className="mx-1 hidden w-px bg-line sm:block" />
            <Chip on={style === "bars"} onClick={() => setStyle("bars")}>Bars</Chip>
            <Chip on={style === "donut"} onClick={() => setStyle("donut")}>Donut</Chip>
          </div>
          <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Add an expense</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ADDS.map((a, i) => (
              <Chip key={a.label} on={added.includes(i)} onClick={() => setAdded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}>
                {added.includes(i) ? <Check className="mr-1 inline h-3 w-3" aria-hidden="true" /> : "+ "}{a.label} {money(a.amount)}
              </Chip>
            ))}
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[["Budget", money(BUDGET), NAVY], ["Spent", money(spent), NAVY], [remaining >= 0 ? "Left" : "Over", money(Math.abs(remaining)), remaining >= 0 ? DEEP : "#C0392B"]].map(([k, v, col]) => (
              <div key={k} className="rounded-2xl bg-[#FFF7D6] px-2 py-3">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-serif text-xl" style={{ color: col as string }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          {style === "bars" ? (
            <ul className="space-y-3.5">
              {rows.map((row, i) => {
                const pct = Math.min(100, (row.spent / row.limit) * 100);
                const over = row.spent > row.limit;
                return (
                  <li key={row.name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{row.name}</span>
                      <span className="tabular-nums text-muted-foreground">{money(row.spent)} <span className="text-[11px]">of {money(row.limit)}</span>{over && <span className="ml-1.5 rounded-full bg-[#F8D7D3] px-1.5 text-[10px] text-[#A93226]">Over</span>}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#E8EEF5]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: over ? "#C0392B" : SLICE[i % SLICE.length] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <svg viewBox="0 0 140 140" className="h-44 w-44 shrink-0 -rotate-90" role="img" aria-label="Spending split">
                <circle cx="70" cy="70" r={r} fill="none" stroke="#E8EEF5" strokeWidth="20" />
                {rows.map((row, i) => {
                  const len = spent > 0 ? (row.spent / spent) * c : 0;
                  const el = <circle key={row.name} cx="70" cy="70" r={r} fill="none" stroke={SLICE[i % SLICE.length]} strokeWidth="20"
                    strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} className="transition-all duration-500" />;
                  offset += len;
                  return el;
                })}
              </svg>
              <ul className="space-y-1.5 text-sm">
                {rows.map((row, i) => (
                  <li key={row.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SLICE[i % SLICE.length] }} />
                    {row.name} <span className="tabular-nums text-muted-foreground">{spent ? Math.round((row.spent / spent) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" aria-hidden="true" /> Catering deposit due in 3 days. Reminder set.</p>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------------------------------------------- Seating */

type Guest = { id: string; name: string; note?: string };
const GUESTS: Guest[] = [
  { id: "p", name: "Priya" }, { id: "m", name: "Marcus" }, { id: "w", name: "Wei" }, { id: "f", name: "Fatima", note: "Nut allergy" },
  { id: "l", name: "Laura" }, { id: "j", name: "John" }, { id: "z", name: "Zuri" }, { id: "k", name: "Kavya" },
];
const TABLES = [
  { id: "t1", name: "Table 1", cap: 4, shape: "round" },
  { id: "t2", name: "Table 2", cap: 4, shape: "round" },
  { id: "t3", name: "Table 3", cap: 3, shape: "rect" },
] as const;
const TABLE_COLOURS = [{ name: "Cream", v: "#FFF7D6" }, { name: "Blue", v: "#C9DAEE" }, { name: "Gold", v: YELLOW }, { name: "Navy", v: "#9FB4C9" }];

export function SeatingDemo() {
  const [seats, setSeats] = useState<Record<string, string[]>>({ t1: [], t2: [], t3: [] });
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("t1");
  const [colours, setColours] = useState<Record<string, string>>({ t1: "#FFF7D6", t2: "#C9DAEE", t3: YELLOW });
  const [message, setMessage] = useState<string>("Drag a guest onto a table, or tap a guest and then a table.");
  const seated = new Set(Object.values(seats).flat());
  const unseated = GUESTS.filter((g) => !seated.has(g.id));

  const seat = (guestId: string, tableId: string) => {
    const t = TABLES.find((x) => x.id === tableId)!;
    const g = GUESTS.find((x) => x.id === guestId)!;
    if (seats[tableId].length >= t.cap) { setMessage(`${t.name} is full (${t.cap} seats). Try another table.`); return; }
    setSeats((p) => ({ ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.filter((x) => x !== guestId)])), [tableId]: [...p[tableId].filter((x) => x !== guestId), guestId] }));
    setPicked(null);
    setSelected(tableId);
    setMessage(g.note ? `${g.name} seated at ${t.name}. Flagged: ${g.note.toLowerCase()}, so check the menu.` : `${g.name} seated at ${t.name}.`);
  };
  const unseat = (guestId: string) => setSeats((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.filter((x) => x !== guestId)])) as Record<string, string[]>);

  return (
    <Frame title="Seat a guest in one move" hint="Drag guests from the list onto a table. Tap a table, then a colour, to restyle it."
      onReset={() => { setSeats({ t1: [], t2: [], t3: [] }); setPicked(null); setMessage("Drag a guest onto a table, or tap a guest and then a table."); setColours({ t1: "#FFF7D6", t2: "#C9DAEE", t3: YELLOW }); }}>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Guests to seat ({unseated.length})</p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
            {unseated.length === 0 && <li className="text-sm text-muted-foreground">Everyone is seated.</li>}
            {unseated.map((g) => (
              <li key={g.id}>
                <button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", g.id); setPicked(g.id); }} onDragEnd={() => setPicked(null)}
                  onClick={() => setPicked(picked === g.id ? null : g.id)} data-static
                  className={cn("flex w-full cursor-grab items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm active:cursor-grabbing",
                    picked === g.id ? "border-[#243746] bg-[#FFF7D6]" : "border-line bg-paper hover:border-[#243746]")}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C9DAEE] text-[10px] font-medium">{g.name[0]}</span>
                  {g.name}
                  {g.note && <span className="ml-auto rounded-full bg-[#F8E3B0] px-1.5 text-[10px]">{g.note}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="grid gap-4 rounded-2xl bg-[#EEF3F9] p-4 sm:grid-cols-3">
            {TABLES.map((t) => (
              <div key={t.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); seat(e.dataTransfer.getData("text/plain"), t.id); }}
                onClick={() => (picked ? seat(picked, t.id) : setSelected(t.id))} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); picked ? seat(picked, t.id) : setSelected(t.id); } }}
                className={cn("flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 border-2 p-3 transition-colors",
                  t.shape === "round" ? "rounded-[2rem]" : "rounded-xl", selected === t.id ? "border-[#243746]" : "border-transparent")}
                style={{ background: colours[t.id] }}>
                <span className="text-xs font-medium">{t.name} <span className="text-muted-foreground">{seats[t.id].length}/{t.cap}</span></span>
                <div className="flex min-h-[28px] flex-wrap justify-center gap-1.5">
                  {seats[t.id].map((gid) => {
                    const g = GUESTS.find((x) => x.id === gid)!;
                    return (
                      <button key={gid} type="button" onClick={(e) => { e.stopPropagation(); unseat(gid); }} title={`${g.name}. Click to remove`} data-static
                        className={cn("grid h-7 w-7 place-items-center rounded-full bg-paper text-[11px] font-medium shadow-sm", g.note && "ring-2 ring-[#F2C94C]")}>{g.name[0]}</button>
                    );
                  })}
                  {Array.from({ length: t.cap - seats[t.id].length }, (_, i) => <span key={i} className="h-7 w-7 rounded-full border border-dashed border-[#243746]/35" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Table colour</span>
            {TABLE_COLOURS.map((c) => (
              <button key={c.name} type="button" aria-label={`${c.name} for ${TABLES.find((t) => t.id === selected)?.name}`} data-static
                onClick={() => setColours((p) => ({ ...p, [selected]: c.v }))}
                className={cn("h-6 w-6 rounded-full border", colours[selected] === c.v ? "border-2 border-[#243746]" : "border-line")} style={{ background: c.v }} />
            ))}
          </div>
          <p role="status" aria-live="polite" className="mt-4 text-sm text-[#4A7CAD]">{message}</p>
        </div>
      </div>
    </Frame>
  );
}

/* -------------------------------------------------------------- Guest list */

type Rsvp = "pending" | "attending" | "declined";
const ROWS = [
  { name: "Priya Rao", events: ["Ceremony", "Reception"], diet: "Vegetarian" },
  { name: "Marcus Hall", events: ["Reception"], diet: "" },
  { name: "Wei Zhang", events: ["Ceremony", "Reception"], diet: "Halal" },
  { name: "Fatima Khan", events: ["Cocktail hour", "Reception"], diet: "Nut allergy" },
  { name: "Laura Bianchi", events: ["Ceremony"], diet: "" },
  { name: "Zuri Okoro", events: ["Reception"], diet: "Vegan" },
];
const NEXT: Record<Rsvp, Rsvp> = { pending: "attending", attending: "declined", declined: "pending" };
const RSVP_STYLE: Record<Rsvp, string> = { pending: "bg-[#F5F0E0] text-[#243746]", attending: "bg-[#243746] text-[#FFF7D6]", declined: "bg-[#E9E4E4] text-[#6B5B5B] line-through" };

export function GuestListDemo() {
  const [status, setStatus] = useState<Rsvp[]>(["attending", "pending", "attending", "pending", "declined", "pending"]);
  const [onlyPending, setOnlyPending] = useState(false);
  const [event, setEvent] = useState<string | null>(null);
  const events = ["Ceremony", "Cocktail hour", "Reception"];
  const shown = ROWS.map((r, i) => ({ ...r, i })).filter((r) => (!onlyPending || status[r.i] === "pending") && (!event || r.events.includes(event)));
  const count = (s: Rsvp) => status.filter((x) => x === s).length;

  return (
    <Frame title="Track replies at a glance" hint="Tap a status to change a reply, or filter by event and by who has not answered."
      onReset={() => { setStatus(["attending", "pending", "attending", "pending", "declined", "pending"]); setOnlyPending(false); setEvent(null); }}>
      <div className="grid grid-cols-3 gap-3 text-center">
        {([["Attending", count("attending")], ["Declined", count("declined")], ["Not replied", count("pending")]] as const).map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-[#FFF7D6] px-2 py-3">
            <p className="font-serif text-2xl tabular-nums">{v}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip on={onlyPending} onClick={() => setOnlyPending((v) => !v)}>Not replied yet</Chip>
        {events.map((e) => <Chip key={e} on={event === e} onClick={() => setEvent(event === e ? null : e)}>{e}</Chip>)}
      </div>
      <ul className="mt-5 divide-y divide-line/60 rounded-2xl border border-line/60">
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No guests match.</li>}
        {shown.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <span className="min-w-[8rem] text-sm font-medium">{r.name}</span>
            <span className="flex flex-wrap gap-1.5">{r.events.map((e) => <span key={e} className="rounded-full bg-[#E8EEF5] px-2 py-0.5 text-[11px]">{e}</span>)}</span>
            {r.diet && <span className="rounded-full bg-[#F8E3B0] px-2 py-0.5 text-[11px]">{r.diet}</span>}
            <button type="button" data-static onClick={() => setStatus((p) => p.map((s, i) => (i === r.i ? NEXT[s] : s)))}
              className={cn("ml-auto rounded-full px-3 py-1 text-xs capitalize transition-colors", RSVP_STYLE[status[r.i]])}>{status[r.i] === "pending" ? "Not replied" : status[r.i]}</button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* -------------------------------------------------------------------- RSVP */

const TEMPLATES = {
  "Save the date": (n: string, e: string) => `Hi ${n}! We are getting married and would love you there. Save the date for our ${e}. More details to follow soon.`,
  Invitation: (n: string, e: string) => `Hi ${n}, we would be so happy to have you at our ${e}. Tap your link to let us know if you can come.`,
  Reminder: (n: string, e: string) => `Hi ${n}, a quick nudge: we have not heard back about our ${e} yet. Could you reply with your link when you get a moment?`,
} as const;

export function RsvpDemo() {
  const [kind, setKind] = useState<keyof typeof TEMPLATES>("Invitation");
  const [guest, setGuest] = useState("Priya");
  const [event, setEvent] = useState("ceremony");
  const [remind, setRemind] = useState(false);
  const names = ["Priya", "Marcus", "Fatima", "Wei"];

  return (
    <Frame title="Messages written for you" hint="Pick a guest and a message. Each one greets the guest by name and carries their personal RSVP link."
      onReset={() => { setKind("Invitation"); setGuest("Priya"); setEvent("ceremony"); setRemind(false); }}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Message</p>
            <div className="mt-2 flex flex-wrap gap-2">{(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Guest</p>
            <div className="mt-2 flex flex-wrap gap-2">{names.map((n) => <Chip key={n} on={guest === n} onClick={() => setGuest(n)}>{n}</Chip>)}</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Event</p>
            <div className="mt-2 flex flex-wrap gap-2">{["ceremony", "cocktail hour", "reception"].map((n) => <Chip key={n} on={event === n} onClick={() => setEvent(n)}>{n}</Chip>)}</div>
          </div>
        </div>
        <div className="rounded-2xl bg-[#EEF3F9] p-5">
          <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#DCF0D9] px-4 py-3 text-sm leading-relaxed shadow-sm">
            {TEMPLATES[kind](guest, event)}
            <span className="mt-2 flex items-center gap-1.5 text-xs text-[#4A7CAD]"><Link2 className="h-3 w-3" aria-hidden="true" /> wedthread.co/rsvp/{guest.toLowerCase()}-4f9a</span>
          </div>
          <button type="button" data-static onClick={() => setRemind((v) => !v)}
            className="mt-5 flex w-full items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-left text-sm hover:bg-[#FFF7D6]">
            <span>Remind everyone who has not replied</span>
            <span className="rounded-full bg-[#243746] px-2.5 py-0.5 text-xs text-[#FFF7D6]">3 guests</span>
          </button>
          {remind && <p role="status" className="mt-3 text-sm text-[#4A7CAD]">Ready: Priya, Fatima and Zuri are selected. Each message opens in WhatsApp for you to send.</p>}
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- Registry */

export function RegistryDemo() {
  const [added, setAdded] = useState(false);
  const [pledged, setPledged] = useState(1200);
  const goal = 4000;
  return (
    <Frame title="Add a gift from any store" hint="Paste a link, and the photo, name and price are filled in. Funds show contributions as they arrive."
      onReset={() => { setAdded(false); setPledged(1200); }}>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground" htmlFor="demo-link">Product link</label>
          <div className="mt-2 flex gap-2">
            <input id="demo-link" readOnly value="https://example-store.com/cast-iron-casserole" className="min-w-0 flex-1 rounded-xl border border-line bg-[#FFFEFB] px-3 py-2.5 text-sm" />
            <button type="button" data-static onClick={() => setAdded(true)} className="rounded-full bg-[#FFE08A] px-5 py-2.5 text-sm font-medium hover:bg-[#F2C94C]">Add</button>
          </div>
          <div className="mt-4 min-h-[112px]">
            {added ? (
              <div className="flex items-center gap-4 rounded-2xl border border-line/70 p-3 animate-in fade-in">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#F4D9CF] text-xs text-[#8A4B38]">Photo</div>
                <div>
                  <p className="font-medium">Cast iron casserole, 4.5 L</p>
                  <p className="text-sm text-muted-foreground">example-store.com</p>
                  <p className="mt-1 text-sm">$149 <span className="ml-2 rounded-full bg-[#E8EEF5] px-2 py-0.5 text-[11px]">Pulled from the link</span></p>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Press Add to see what is pulled in.</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFF7D6] p-5">
          <p className="font-medium">Honeymoon fund</p>
          <p className="mt-1 text-sm text-muted-foreground">{money(pledged)} of {money(goal)} pledged</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-[#243746] transition-all duration-500" style={{ width: `${Math.min(100, (pledged / goal) * 100)}%` }} /></div>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">A guest contributes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[50, 100, 250].map((a) => <button key={a} type="button" data-static onClick={() => setPledged((p) => Math.min(goal, p + a))} className="rounded-full border border-[#243746] px-4 py-1.5 text-sm hover:bg-[#FFE08A]">+ {money(a)}</button>)}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------------------------------------------- Website */

const PALETTES = [
  { name: "Pearl", bg: "#FDFCF7", ink: "#1A1512", accent: "#E8B4A0" },
  { name: "Sage", bg: "#EAF0E4", ink: "#2F3E2C", accent: "#8FA98A" },
  { name: "Midnight", bg: "#1F2A38", ink: "#F3EBDD", accent: "#D9B26F" },
  { name: "Blush", bg: "#FBEAEA", ink: "#4A2B33", accent: "#D98C9B" },
];
const SECTIONS = ["Our story", "Events", "Travel", "Registry", "RSVP"];

export function WebsiteDemo() {
  const [p, setP] = useState(0);
  const [on, setOn] = useState<string[]>(["Our story", "Events", "RSVP"]);
  const pal = PALETTES[p];
  return (
    <Frame title="Make it yours in two taps" hint="Switch the look, then choose which sections guests see."
      onReset={() => { setP(0); setOn(["Our story", "Events", "RSVP"]); }}>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Look</p>
            <div className="mt-2 flex flex-wrap gap-2">{PALETTES.map((x, i) => (
              <button key={x.name} type="button" data-static onClick={() => setP(i)} aria-label={x.name} aria-pressed={p === i}
                className={cn("h-9 w-9 rounded-full border-2", p === i ? "border-[#243746]" : "border-line")} style={{ background: `linear-gradient(135deg, ${x.bg} 55%, ${x.accent} 55%)` }} />
            ))}</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Sections</p>
            <div className="mt-2 flex flex-wrap gap-2">{SECTIONS.map((s) => <Chip key={s} on={on.includes(s)} onClick={() => setOn((q) => (q.includes(s) ? q.filter((x) => x !== s) : [...q, s]))}>{s}</Chip>)}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line/70 shadow-sm transition-colors duration-500" style={{ background: pal.bg, color: pal.ink }}>
          <div className="px-6 py-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: pal.accent }}>We are getting married</p>
            <p className="mt-3 font-serif text-3xl">Priya and Kevin</p>
            <p className="mt-1 text-sm opacity-80">12 to 14 November 2026 · Lake Como</p>
          </div>
          <div className="space-y-px">
            {SECTIONS.filter((s) => on.includes(s)).map((s) => (
              <div key={s} className="flex items-center justify-between px-6 py-3.5 text-sm" style={{ borderTop: `1px solid ${pal.accent}55` }}>
                {s}<span className="h-1.5 w-8 rounded-full" style={{ background: pal.accent }} />
              </div>
            ))}
            {on.length === 0 && <p className="px-6 pb-6 text-center text-sm opacity-70">Choose a section to show.</p>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ Venues */

const VENUES = [
  { name: "Seaside Terrace", city: "Dubai", type: "Beach", min: 40, max: 300, tier: "$$$" },
  { name: "The Orchard House", city: "London", type: "Outdoor", min: 20, max: 120, tier: "$$" },
  { name: "Skyline Rooftop", city: "Dubai", type: "Rooftop", min: 30, max: 200, tier: "$$$$" },
  { name: "Grand Hall", city: "Abu Dhabi", type: "Banquet hall", min: 150, max: 600, tier: "$$$$" },
  { name: "Olive Grove Farm", city: "Tuscany", type: "Outdoor", min: 30, max: 150, tier: "$$" },
  { name: "Palm Court", city: "Dubai", type: "Banquet hall", min: 80, max: 400, tier: "$$$" },
];
export function VenuesDemo() {
  const [type, setType] = useState<string | null>(null);
  const [guests, setGuests] = useState(120);
  const shown = VENUES.filter((v) => (!type || v.type === type) && v.min <= guests && v.max >= guests);
  return (
    <Frame title="Narrow it down in seconds" hint="Choose a type of space and your guest count to see which example venues fit."
      onReset={() => { setType(null); setGuests(120); }}>
      <div className="flex flex-wrap gap-2">{["Beach", "Outdoor", "Rooftop", "Banquet hall"].map((t) => <Chip key={t} on={type === t} onClick={() => setType(type === t ? null : t)}>{t}</Chip>)}</div>
      <label className="mt-5 block text-sm">Guests: <span className="font-medium tabular-nums">{guests}</span>
        <input type="range" min={20} max={500} step={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-2 block w-full max-w-md" />
      </label>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.length === 0 && <li className="text-sm text-muted-foreground sm:col-span-3">No example venues fit. Try fewer guests or another type.</li>}
        {shown.map((v) => (
          <li key={v.name} className="rounded-2xl border border-line/70 p-4">
            <div className="h-20 rounded-xl bg-gradient-to-br from-[#E8EEF5] to-[#FFF7D6]" aria-hidden="true" />
            <p className="mt-3 font-serif text-lg">{v.name}</p>
            <p className="text-sm text-muted-foreground">{v.city} · {v.type}</p>
            <p className="mt-1 text-sm">{v.min} to {v.max} guests · {v.tier}</p>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ----------------------------------------------------------------- Vendors */

const VENDOR_SETS: Record<string, { name: string; city: string; tier: string; tags: string }[]> = {
  Photographers: [{ name: "Golden Hour Studio", city: "Dubai", tier: "$$$", tags: "Photography and film" }, { name: "Maya Lens", city: "London", tier: "$$", tags: "Photography" }, { name: "Frame and Light", city: "Tuscany", tier: "$$$$", tags: "Photography, drone" }],
  Florists: [{ name: "Petal and Stem", city: "Dubai", tier: "$$", tags: "Florals and decor" }, { name: "The Marigold Co", city: "London", tier: "$$$", tags: "Ceremony florals" }, { name: "Wild Bloom", city: "Abu Dhabi", tier: "$$", tags: "Florals" }],
  Planners: [{ name: "Everafter Events", city: "Dubai", tier: "$$$$", tags: "Full planning" }, { name: "Two Families Events", city: "London", tier: "$$$", tags: "Multicultural weddings" }, { name: "Day-of Done", city: "Tuscany", tier: "$$", tags: "Day-of coordination" }],
  Caterers: [{ name: "Saffron Table", city: "Dubai", tier: "$$$", tags: "South Asian, Arabic" }, { name: "Long Table Kitchen", city: "London", tier: "$$", tags: "Seasonal menus" }, { name: "Feast and Co", city: "Abu Dhabi", tier: "$$$$", tags: "Live stations" }],
};
export function VendorsDemo() {
  const [cat, setCat] = useState("Photographers");
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Frame title="Browse by what you need" hint="Pick a category, then save the examples you like to a shortlist."
      onReset={() => { setCat("Photographers"); setSaved([]); }}>
      <div className="flex flex-wrap gap-2">{Object.keys(VENDOR_SETS).map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {VENDOR_SETS[cat].map((v) => {
          const on = saved.includes(v.name);
          return (
            <li key={v.name} className="rounded-2xl border border-line/70 p-4">
              <div className="h-20 rounded-xl bg-gradient-to-br from-[#FFF7D6] to-[#E8EEF5]" aria-hidden="true" />
              <p className="mt-3 font-serif text-lg leading-tight">{v.name}</p>
              <p className="text-sm text-muted-foreground">{v.tags}</p>
              <p className="mt-1 text-sm">{v.city} · {v.tier}</p>
              <button type="button" data-static onClick={() => setSaved((p) => (on ? p.filter((x) => x !== v.name) : [...p, v.name]))}
                className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", on ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-line hover:bg-[#FFF7D6]")}>
                {on ? <><Check className="h-3 w-3" aria-hidden="true" /> Saved</> : "Save"}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">{saved.length === 0 ? "Nothing saved yet." : `${saved.length} saved to your shortlist.`}</p>
    </Frame>
  );
}

export function FeatureDemo({ slug }: { slug: string }) {
  switch (slug) {
    case "budgeting": return <BudgetDemo />;
    case "seating": return <SeatingDemo />;
    case "guest-list": return <GuestListDemo />;
    case "rsvp-automation": return <RsvpDemo />;
    case "registry": return <RegistryDemo />;
    case "website": return <WebsiteDemo />;
    case "venues": return <VenuesDemo />;
    case "vendor-marketplace": return <VendorsDemo />;
    default: return null;
  }
}
