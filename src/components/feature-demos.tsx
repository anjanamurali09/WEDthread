import { useMemo, useState } from "react";
import { Bell, Check, Link2, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Hands-on demos for the feature pages, three per page, so a visitor can try the idea in seconds instead of
// reading. Everything is example data held in the page; nothing is saved or sent anywhere.

const NAVY = "#243746";
const BLUE = "#7FA8D6";
const DEEP = "#4A7CAD";
const YELLOW = "#FFE08A";
const SLICE = [NAVY, BLUE, YELLOW, DEEP, "#B7CBE3", "#F2C94C"];

function Frame({ title, children, onReset }: { title: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-paper p-6 shadow-sm md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-2xl leading-tight">{title}</h3>
        {onReset && (
          <button type="button" onClick={onReset} data-static className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-[#FFF7D6]">
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
          </button>
        )}
      </div>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} data-static
      className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        on ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-dashed border-[#243746]/40 hover:border-[#243746]")}>
      {children}
    </button>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="text-xs uppercase tracking-widest text-muted-foreground">{children}</p>;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/* ================================================================== BUDGET */

const BUDGET = 45000;
const CATS = [
  { name: "Venue", limit: 18000, spent: 15000 }, { name: "Catering", limit: 12000, spent: 6500 },
  { name: "Photography", limit: 5000, spent: 3000 }, { name: "Attire", limit: 4500, spent: 2400 },
  { name: "Decor", limit: 3500, spent: 1000 }, { name: "Music", limit: 2000, spent: 0 },
];
const EVENTS = [
  { name: "Ceremony", limit: 14000, spent: 9400 }, { name: "Cocktail hour", limit: 9000, spent: 3200 }, { name: "Reception", limit: 22000, spent: 15300 },
];
const ADDS = [
  { label: "Flowers", amount: 1800, cat: "Decor", ev: "Ceremony" }, { label: "DJ deposit", amount: 1500, cat: "Music", ev: "Reception" },
  { label: "Photographer balance", amount: 2500, cat: "Photography", ev: "Reception" }, { label: "Venue upgrade", amount: 4000, cat: "Venue", ev: "Reception" },
];

export function BudgetBreakdownDemo() {
  const [by, setBy] = useState<"category" | "event">("category");
  const [style, setStyle] = useState<"bars" | "donut">("bars");
  const [added, setAdded] = useState<number[]>([]);
  const rows = useMemo(() => (by === "category" ? CATS : EVENTS).map((r) => ({
    ...r, spent: r.spent + added.reduce((sum, i) => sum + (ADDS[i][by === "category" ? "cat" : "ev"] === r.name ? ADDS[i].amount : 0), 0),
  })), [by, added]);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const remaining = BUDGET - spent;
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Frame title="Your budget, by category and by event" onReset={() => { setAdded([]); setBy("category"); setStyle("bars"); }}>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip on={by === "category"} onClick={() => setBy("category")}>By category</Chip>
            <Chip on={by === "event"} onClick={() => setBy("event")}>By event</Chip>
            <Chip on={style === "bars"} onClick={() => setStyle("bars")}>Bars</Chip>
            <Chip on={style === "donut"} onClick={() => setStyle("donut")}>Donut</Chip>
          </div>
          <div className="mt-8"><Label>Add an expense</Label></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ADDS.map((a, i) => (
              <Chip key={a.label} on={added.includes(i)} onClick={() => setAdded((p) => toggle(p, i))}>
                {added.includes(i) ? <Check className="mr-1 inline h-3 w-3" aria-hidden="true" /> : "+ "}{a.label} {money(a.amount)}
              </Chip>
            ))}
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-3 text-center">
            {[["Budget", money(BUDGET), NAVY], ["Spent", money(spent), NAVY], [remaining >= 0 ? "Left" : "Over", money(Math.abs(remaining)), remaining >= 0 ? DEEP : "#C0392B"]].map(([k, v, col]) => (
              <div key={k} className="rounded-2xl bg-[#FFF7D6] px-2 py-3">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="mt-1 whitespace-nowrap font-serif text-xl tabular-nums" style={{ color: col as string }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto w-full max-w-md">
          {style === "bars" ? (
            <ul className="space-y-4">
              {rows.map((row, i) => {
                const pct = Math.min(100, (row.spent / row.limit) * 100);
                const over = row.spent > row.limit;
                return (
                  <li key={row.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{row.name}</span>
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">{money(row.spent)} / {money(row.limit)}{over && <span className="ml-1.5 rounded-full bg-[#F8D7D3] px-1.5 text-[10px] text-[#A93226]">Over</span>}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#E8EEF5]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: over ? "#C0392B" : SLICE[i % SLICE.length] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
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
                  <li key={row.name} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SLICE[i % SLICE.length] }} />
                    {row.name} <span className="tabular-nums text-muted-foreground">{spent ? Math.round((row.spent / spent) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const MONTHLY = [2000, 4500, 3000, 6500, 5200, 4800, 1900];

export function BudgetOverTimeDemo() {
  const [m, setM] = useState(3);
  const cumulative = MONTHLY.reduce<number[]>((a, v) => [...a, (a[a.length - 1] ?? 0) + v], []);
  const W = 560, H = 190, pad = 8;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (MONTHS.length - 1);
  const y = (v: number) => H - pad - (v / BUDGET) * (H - pad * 2);
  const path = cumulative.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <Frame title="Spending over time">
      <div className="mx-auto max-w-2xl">
        <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label="Cumulative spending by month">
          <line x1={pad} x2={W - pad} y1={y(BUDGET)} y2={y(BUDGET)} stroke={NAVY} strokeDasharray="4 4" opacity="0.35" />
          <text x={W - pad} y={y(BUDGET) + 16} textAnchor="end" fontSize="11" fill={NAVY} opacity="0.6">Budget {money(BUDGET)}</text>
          <path d={`${path} L${x(MONTHS.length - 1)} ${H - pad} L${x(0)} ${H - pad} Z`} fill={BLUE} opacity="0.18" />
          <path d={path} fill="none" stroke={DEEP} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {MONTHS.map((mo, i) => (
            <g key={mo} onClick={() => setM(i)} style={{ cursor: "pointer" }}>
              <rect x={x(i) - 24} y={0} width="48" height={H + 24} fill="transparent" />
              <circle cx={x(i)} cy={y(cumulative[i])} r={i === m ? 7 : 4} fill={i === m ? NAVY : DEEP} className="transition-all" />
              <text x={x(i)} y={H + 16} textAnchor="middle" fontSize="12" fill={NAVY} opacity={i === m ? 1 : 0.55}>{mo}</text>
            </g>
          ))}
        </svg>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-[#FFF7D6] px-5 py-3">
          <span className="text-sm">{MONTHS[m]}: <span className="whitespace-nowrap font-medium tabular-nums">{money(MONTHLY[m])}</span> spent</span>
          <span className="text-sm text-muted-foreground">Total so far <span className="whitespace-nowrap font-medium tabular-nums text-[#243746]">{money(cumulative[m])}</span></span>
        </div>
      </div>
    </Frame>
  );
}

export function PaymentReminderDemo() {
  const [on, setOn] = useState(true);
  const [days, setDays] = useState(3);
  const [collab, setCollab] = useState(false);
  const [paid, setPaid] = useState(false);
  const left = Math.max(0, 5 - days);
  return (
    <Frame title="Payment reminders" onReset={() => { setOn(true); setDays(3); setCollab(false); setPaid(false); }}>
      <div className="mx-auto grid max-w-3xl items-center gap-10 md:grid-cols-2">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line/70 px-4 py-3">
            <div>
              <p className="font-medium">Catering deposit</p>
              <p className="whitespace-nowrap text-sm text-muted-foreground">$3,000 · due in 5 days</p>
            </div>
            <div className="flex items-center gap-2">
              {on && !paid && <Bell className="h-4 w-4" aria-label="Reminder set" />}
              <button type="button" data-static onClick={() => setPaid((v) => !v)}
                className={cn("rounded-full px-3 py-1 text-xs", paid ? "bg-[#243746] text-[#FFF7D6]" : "bg-[#F8D7D3] text-[#A93226]")}>{paid ? "Paid" : "Pending"}</button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            Remind me
            <span className="flex items-center gap-2">
              <button type="button" aria-label="Fewer days" data-static onClick={() => setDays((d) => Math.max(1, d - 1))} className="grid h-7 w-7 place-items-center rounded-full border border-line hover:bg-[#FFF7D6]"><Minus className="h-3 w-3" /></button>
              <span className="w-28 whitespace-nowrap text-center tabular-nums">{days} {days === 1 ? "day" : "days"} before</span>
              <button type="button" aria-label="More days" data-static onClick={() => setDays((d) => Math.min(5, d + 1))} className="grid h-7 w-7 place-items-center rounded-full border border-line hover:bg-[#FFF7D6]"><Plus className="h-3 w-3" /></button>
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={collab} onChange={(e) => setCollab(e.target.checked)} className="h-4 w-4" /> Include collaborators
          </label>
          <button type="button" data-static onClick={() => setOn((v) => !v)} className="text-xs underline underline-offset-4">{on ? "Remove reminder" : "Set reminder"}</button>
        </div>
        <div className="rounded-2xl bg-[#EEF3F9] p-5 text-sm">
          {on && !paid ? (
            <div className="rounded-xl bg-paper p-4 shadow-sm">
              <p className="text-[11px] text-muted-foreground">To: you{collab ? ", your partner" : ""}</p>
              <p className="mt-1 font-medium">Payment reminder: Catering deposit</p>
              <p className="mt-2 leading-relaxed">$3,000 is due in {left} {left === 1 ? "day" : "days"}. Mark it as paid when it is done and nothing more is sent.</p>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{paid ? "Paid. No reminder is sent." : "No reminder set."}</p>
          )}
        </div>
      </div>
    </Frame>
  );
}

/* ================================================================= SEATING */

type Guest = { id: string; first: string; last: string; note?: string };
const GUESTS: Guest[] = [
  { id: "p", first: "Priya", last: "Rao" }, { id: "m", first: "Marcus", last: "Hall" }, { id: "w", first: "Wei", last: "Zhang" },
  { id: "f", first: "Fatima", last: "Khan", note: "Nut allergy" }, { id: "l", first: "Laura", last: "Bianchi" }, { id: "j", first: "John", last: "Park" },
  { id: "z", first: "Zuri", last: "Okoro" }, { id: "k", first: "Kavya", last: "Iyer" },
];
const initials = (g: Guest) => `${g.first[0]}${g.last[0]}`;
const TABLE_COLOURS = [{ name: "Cream", v: "#FFF7D6" }, { name: "Blue", v: "#C9DAEE" }, { name: "Gold", v: YELLOW }, { name: "Slate", v: "#9FB4C9" }];
const START_COLOURS: Record<string, string> = { t1: "#FFF7D6", t2: "#C9DAEE", t3: YELLOW };
const TABLES = [
  { id: "t1", name: "Table 1", cap: 4, shape: "round" }, { id: "t2", name: "Table 2", cap: 4, shape: "round" }, { id: "t3", name: "Table 3", cap: 3, shape: "rect" },
] as const;

// Only the initials circle follows the pointer while dragging, not the whole name card.
function dragCircle(e: React.DragEvent, text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  Object.assign(el.style, { position: "fixed", top: "-100px", left: "-100px", width: "34px", height: "34px", borderRadius: "999px", background: "#C9DAEE", color: "#243746",
    display: "grid", placeItems: "center", font: "600 12px sans-serif", border: "2px solid #243746" });
  document.body.appendChild(el);
  e.dataTransfer.setDragImage(el, 17, 17);
  setTimeout(() => el.remove(), 0);
}

export function SeatingDragDemo() {
  const [seats, setSeats] = useState<Record<string, string[]>>({ t1: [], t2: [], t3: [] });
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState("t1");
  const [colours, setColours] = useState(START_COLOURS);
  const [message, setMessage] = useState("");
  const seated = new Set(Object.values(seats).flat());
  const unseated = GUESTS.filter((g) => !seated.has(g.id));

  const seat = (guestId: string, tableId: string) => {
    const t = TABLES.find((x) => x.id === tableId)!;
    const g = GUESTS.find((x) => x.id === guestId);
    if (!g) return;
    if (seats[tableId].length >= t.cap) { setMessage(`${t.name} is full. Try another table.`); return; }
    setSeats((p) => ({ ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.filter((x) => x !== guestId)])), [tableId]: [...p[tableId], guestId] }));
    setPicked(null);
    setSelected(tableId);
    setMessage(g.note ? `${g.first} is at ${t.name}. ${g.note}: check the menu.` : "");
  };
  const unseat = (guestId: string) => setSeats((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.filter((x) => x !== guestId)])) as Record<string, string[]>);

  return (
    <Frame title="Seat your guests" onReset={() => { setSeats({ t1: [], t2: [], t3: [] }); setPicked(null); setMessage(""); setColours(START_COLOURS); }}>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
          {unseated.length === 0 && <li className="text-sm text-muted-foreground">Everyone is seated.</li>}
          {unseated.map((g) => (
            <li key={g.id}>
              <button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", g.id); setPicked(g.id); dragCircle(e, initials(g)); }}
                onDragEnd={() => setPicked(null)} onClick={() => setPicked(picked === g.id ? null : g.id)} data-static
                className={cn("flex w-full cursor-grab items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm active:cursor-grabbing",
                  picked === g.id ? "border-[#243746] bg-[#FFF7D6]" : "border-line bg-paper hover:border-[#243746]")}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#C9DAEE] text-[10px] font-semibold">{initials(g)}</span>
                {g.first} {g.last}
                {g.note && <span className="ml-auto rounded-full bg-[#F8E3B0] px-1.5 text-[10px]">{g.note}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div>
          <div className="grid gap-4 rounded-2xl bg-[#EEF3F9] p-4 sm:grid-cols-3">
            {TABLES.map((t) => (
              <div key={t.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); seat(e.dataTransfer.getData("text/plain"), t.id); }}
                onClick={() => (picked ? seat(picked, t.id) : setSelected(t.id))} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (picked) seat(picked, t.id); else setSelected(t.id); } }}
                className={cn("flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 border-2 p-3 transition-colors",
                  t.shape === "round" ? "rounded-[2rem]" : "rounded-xl", selected === t.id ? "border-[#243746]" : "border-transparent")}
                style={{ background: colours[t.id] }}>
                <span className="whitespace-nowrap text-xs font-medium">{t.name} <span className="text-muted-foreground">{seats[t.id].length}/{t.cap}</span></span>
                <div className="flex min-h-[30px] flex-wrap justify-center gap-1.5">
                  {seats[t.id].map((gid) => {
                    const g = GUESTS.find((x) => x.id === gid)!;
                    return <button key={gid} type="button" onClick={(e) => { e.stopPropagation(); unseat(gid); }} title={`${g.first} ${g.last}. Click to remove`} data-static
                      className={cn("grid h-8 w-8 place-items-center rounded-full bg-paper text-[10px] font-semibold shadow-sm", g.note && "ring-2 ring-[#F2C94C]")}>{initials(g)}</button>;
                  })}
                  {Array.from({ length: t.cap - seats[t.id].length }, (_, i) => <span key={i} className="h-8 w-8 rounded-full border border-dashed border-[#243746]/35" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Label>Table colour</Label>
            {TABLE_COLOURS.map((c) => (
              <button key={c.name} type="button" aria-label={`${c.name} for ${TABLES.find((t) => t.id === selected)?.name}`} data-static onClick={() => setColours((p) => ({ ...p, [selected]: c.v }))}
                className={cn("h-6 w-6 rounded-full border", colours[selected] === c.v ? "border-2 border-[#243746]" : "border-line")} style={{ background: c.v }} />
            ))}
          </div>
          <p role="status" aria-live="polite" className="mt-4 min-h-[1.25rem] text-sm text-[#4A7CAD]">{message}</p>
        </div>
      </div>
    </Frame>
  );
}

const SHAPES = [{ id: "round", label: "Round", cls: "rounded-full" }, { id: "square", label: "Square", cls: "rounded-xl" }, { id: "rect", label: "Rectangle", cls: "rounded-xl" }] as const;

export function SeatingRoomDemo() {
  const [shape, setShape] = useState<(typeof SHAPES)[number]["id"]>("round");
  const [seatsN, setSeatsN] = useState(8);
  const [colour, setColour] = useState(START_COLOURS.t2);
  const cls = SHAPES.find((s) => s.id === shape)!.cls;
  const dims = shape === "rect" ? "h-24 w-48" : "h-32 w-32";
  return (
    <Frame title="Shape the room" onReset={() => { setShape("round"); setSeatsN(8); setColour(START_COLOURS.t2); }}>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <div><Label>Shape</Label><div className="mt-2 flex flex-wrap gap-2">{SHAPES.map((s) => <Chip key={s.id} on={shape === s.id} onClick={() => setShape(s.id)}>{s.label}</Chip>)}</div></div>
          <div>
            <Label>Seats</Label>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" aria-label="Fewer seats" data-static onClick={() => setSeatsN((n) => Math.max(2, n - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:bg-[#FFF7D6]"><Minus className="h-3.5 w-3.5" /></button>
              <span className="w-6 text-center text-lg tabular-nums">{seatsN}</span>
              <button type="button" aria-label="More seats" data-static onClick={() => setSeatsN((n) => Math.min(12, n + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:bg-[#FFF7D6]"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div><Label>Colour</Label><div className="mt-2 flex gap-2">{TABLE_COLOURS.map((c) => (
            <button key={c.name} type="button" aria-label={c.name} data-static onClick={() => setColour(c.v)} className={cn("h-7 w-7 rounded-full border", colour === c.v ? "border-2 border-[#243746]" : "border-line")} style={{ background: c.v }} />
          ))}</div></div>
        </div>
        <div className="grid min-h-[280px] place-items-center rounded-2xl bg-[#EEF3F9] p-6">
          <div className="relative">
            <div className={cn("grid place-items-center text-sm font-medium transition-all", dims, cls)} style={{ background: colour }}>Table 1</div>
            {Array.from({ length: seatsN }, (_, i) => {
              const a = (i / seatsN) * 2 * Math.PI - Math.PI / 2;
              const rx = shape === "rect" ? 112 : 78, ry = shape === "rect" ? 72 : 78;
              return <span key={i} className="absolute h-5 w-5 rounded-full border border-[#243746]/40 bg-paper transition-all"
                style={{ left: `calc(50% + ${Math.cos(a) * rx}px - 10px)`, top: `calc(50% + ${Math.sin(a) * ry}px - 10px)` }} />;
            })}
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function SeatingWarningsDemo() {
  const [n, setN] = useState(3);
  const [allergy, setAllergy] = useState(false);
  const cap = 4;
  return (
    <Frame title="Warnings before the day" onReset={() => { setN(3); setAllergy(false); }}>
      <div className="mx-auto grid max-w-3xl items-center gap-10 md:grid-cols-2">
        <div className="space-y-5">
          <div className="flex gap-2">
            <button type="button" data-static onClick={() => setN((v) => Math.min(6, v + 1))} className="rounded-full bg-[#FFE08A] px-5 py-2 text-sm font-medium hover:bg-[#F2C94C]">Add a guest</button>
            <button type="button" data-static onClick={() => setN((v) => Math.max(0, v - 1))} className="rounded-full border border-line px-5 py-2 text-sm hover:bg-[#FFF7D6]">Remove one</button>
          </div>
          <Chip on={allergy} onClick={() => setAllergy((v) => !v)}>One guest has a nut allergy</Chip>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#EEF3F9] p-4">
            <span className="mr-2 text-sm font-medium">Table 1</span>
            {Array.from({ length: Math.max(cap, n) }, (_, i) => (
              <span key={i} className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", i < n ? (i >= cap ? "bg-[#F8D7D3] ring-2 ring-[#C0392B]" : "bg-paper shadow-sm") : "border border-dashed border-[#243746]/35")}>{i < n && allergy && i === 0 ? "FK" : ""}</span>
            ))}
          </div>
          {n > cap && <p role="status" className="rounded-xl bg-[#F8D7D3] px-4 py-2.5 text-sm text-[#A93226]">Table 1 has {n} guests for {cap} seats.</p>}
          {allergy && n > 0 && <p role="status" className="rounded-xl bg-[#F8E3B0] px-4 py-2.5 text-sm">Fatima Khan has a nut allergy. Check the menu for Table 1.</p>}
          {n <= cap && !allergy && <p className="rounded-xl bg-[#E8EEF5] px-4 py-2.5 text-sm">No warnings.</p>}
        </div>
      </div>
    </Frame>
  );
}

/* =============================================================== GUEST LIST */

type Rsvp = "pending" | "attending" | "declined";
const ROWS = [
  { name: "Priya Rao", events: ["Ceremony", "Reception"], diet: "Vegetarian" }, { name: "Marcus Hall", events: ["Reception"], diet: "" },
  { name: "Wei Zhang", events: ["Ceremony", "Reception"], diet: "Halal" }, { name: "Fatima Khan", events: ["Cocktail hour", "Reception"], diet: "Nut allergy" },
  { name: "Laura Bianchi", events: ["Ceremony"], diet: "" }, { name: "Zuri Okoro", events: ["Reception"], diet: "Vegan" },
];
const GL_EVENTS = ["Ceremony", "Cocktail hour", "Reception"];
const NEXT: Record<Rsvp, Rsvp> = { pending: "attending", attending: "declined", declined: "pending" };
const RSVP_STYLE: Record<Rsvp, string> = { pending: "bg-[#F5F0E0] text-[#243746]", attending: "bg-[#243746] text-[#FFF7D6]", declined: "bg-[#E9E4E4] text-[#6B5B5B] line-through" };
const START_STATUS: Rsvp[] = ["attending", "pending", "attending", "pending", "declined", "pending"];

export function RepliesDemo() {
  const [status, setStatus] = useState<Rsvp[]>(START_STATUS);
  const [onlyPending, setOnlyPending] = useState(false);
  const [event, setEvent] = useState<string | null>(null);
  const shown = ROWS.map((r, i) => ({ ...r, i })).filter((r) => (!onlyPending || status[r.i] === "pending") && (!event || r.events.includes(event)));
  const count = (s: Rsvp) => status.filter((x) => x === s).length;
  return (
    <Frame title="Track replies" onReset={() => { setStatus(START_STATUS); setOnlyPending(false); setEvent(null); }}>
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-3 gap-3 text-center">
          {([["Attending", count("attending")], ["Declined", count("declined")], ["Not replied", count("pending")]] as const).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-[#FFF7D6] px-2 py-3"><p className="font-serif text-2xl tabular-nums">{v}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p></div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip on={onlyPending} onClick={() => setOnlyPending((v) => !v)}>Not replied yet</Chip>
          {GL_EVENTS.map((e) => <Chip key={e} on={event === e} onClick={() => setEvent(event === e ? null : e)}>{e}</Chip>)}
        </div>
        <ul className="mt-5 divide-y divide-line/60 rounded-2xl border border-line/60">
          {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No guests match.</li>}
          {shown.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="min-w-[8rem] text-sm font-medium">{r.name}</span>
              <span className="flex flex-wrap gap-1.5">{r.events.map((e) => <span key={e} className="rounded-full bg-[#E8EEF5] px-2 py-0.5 text-[11px]">{e}</span>)}</span>
              <button type="button" data-static onClick={() => setStatus((p) => p.map((s, i) => (i === r.i ? NEXT[s] : s)))}
                className={cn("ml-auto rounded-full px-3 py-1 text-xs capitalize transition-colors", RSVP_STYLE[status[r.i]])}>{status[r.i] === "pending" ? "Not replied" : status[r.i]}</button>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

export function InvitesDemo() {
  const START = ROWS.map((r) => r.events);
  const [inv, setInv] = useState<string[][]>(START);
  return (
    <Frame title="Invite guests to the right events" onReset={() => setInv(START)}>
      <div className="mx-auto max-w-3xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-widest text-muted-foreground"><th className="pb-3 font-normal">Guest</th>{GL_EVENTS.map((e) => <th key={e} className="px-2 pb-3 text-center font-normal">{e}</th>)}</tr></thead>
          <tbody className="divide-y divide-line/60">
            {ROWS.map((r, i) => (
              <tr key={r.name}>
                <td className="whitespace-nowrap py-2.5 pr-4 font-medium">{r.name}</td>
                {GL_EVENTS.map((e) => (
                  <td key={e} className="px-2 py-2.5 text-center">
                    <button type="button" data-static aria-pressed={inv[i].includes(e)} aria-label={`${r.name}, ${e}`} onClick={() => setInv((p) => p.map((x, j) => (j === i ? toggle(x, e) : x)))}
                      className={cn("mx-auto grid h-7 w-7 place-items-center rounded-full border", inv[i].includes(e) ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-dashed border-[#243746]/40")}>
                      {inv[i].includes(e) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="pt-4 text-xs uppercase tracking-widest text-muted-foreground">Headcount</td>{GL_EVENTS.map((e) => <td key={e} className="pt-4 text-center font-serif text-xl tabular-nums">{inv.filter((x) => x.includes(e)).length}</td>)}</tr></tfoot>
        </table>
      </div>
    </Frame>
  );
}

export function DietaryDemo() {
  const tags = ["Vegetarian", "Halal", "Vegan", "Nut allergy"];
  const [tag, setTag] = useState<string | null>(null);
  const matches = ROWS.filter((r) => r.diet === tag);
  const total = ROWS.filter((r) => r.diet).length;
  return (
    <Frame title="Dietary needs at a glance" onReset={() => setTag(null)}>
      <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-2">
        <ul className="space-y-4">
          {tags.map((t, i) => {
            const n = ROWS.filter((r) => r.diet === t).length;
            return (
              <li key={t}>
                <button type="button" data-static onClick={() => setTag(tag === t ? null : t)} className="block w-full text-left">
                  <div className="flex justify-between text-sm"><span className={tag === t ? "font-medium" : ""}>{t}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#E8EEF5]"><div className="h-full rounded-full transition-all" style={{ width: `${(n / total) * 100}%`, background: tag === t ? NAVY : SLICE[i] }} /></div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="rounded-2xl bg-[#FFF7D6] p-5">
          {tag ? (<><Label>{tag}</Label><ul className="mt-3 space-y-1.5 text-sm">{matches.map((m) => <li key={m.name}>{m.name}</li>)}</ul></>) : <p className="text-sm text-muted-foreground">Tap a need to see who it is.</p>}
        </div>
      </div>
    </Frame>
  );
}

/* ===================================================================== RSVP */

const TEMPLATES = {
  "Save the date": (n: string, e: string) => `Hi ${n}! We are getting married and would love you there. Save the date for our ${e}. More details to follow soon.`,
  Invitation: (n: string, e: string) => `Hi ${n}, we would be so happy to have you at our ${e}. Tap your link to let us know if you can come.`,
  Reminder: (n: string, e: string) => `Hi ${n}, a quick nudge: we have not heard back about our ${e} yet. Could you reply with your link when you get a moment?`,
} as const;

export function MessageDemo() {
  const [kind, setKind] = useState<keyof typeof TEMPLATES>("Invitation");
  const [guest, setGuest] = useState("Priya");
  const [event, setEvent] = useState("ceremony");
  return (
    <Frame title="Messages written for you" onReset={() => { setKind("Invitation"); setGuest("Priya"); setEvent("ceremony"); }}>
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <div><Label>Message</Label><div className="mt-2 flex flex-wrap gap-2">{(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}</div></div>
          <div><Label>Guest</Label><div className="mt-2 flex flex-wrap gap-2">{["Priya", "Marcus", "Fatima", "Wei"].map((n) => <Chip key={n} on={guest === n} onClick={() => setGuest(n)}>{n}</Chip>)}</div></div>
          <div><Label>Event</Label><div className="mt-2 flex flex-wrap gap-2">{["ceremony", "cocktail hour", "reception"].map((n) => <Chip key={n} on={event === n} onClick={() => setEvent(n)}>{n}</Chip>)}</div></div>
        </div>
        <div className="rounded-2xl bg-[#EEF3F9] p-5">
          <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#DCF0D9] px-4 py-3 text-sm leading-relaxed shadow-sm">
            {TEMPLATES[kind](guest, event)}
            <span className="mt-2 flex items-center gap-1.5 text-xs text-[#4A7CAD]"><Link2 className="h-3 w-3" aria-hidden="true" /> wedthread.co/rsvp/{guest.toLowerCase()}-4f9a</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function RsvpFormDemo() {
  const START = { Ceremony: null, "Cocktail hour": null, Reception: null } as Record<string, "yes" | "no" | null>;
  const [ev, setEv] = useState(START);
  const [meal, setMeal] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  return (
    <Frame title="What your guests see" onReset={() => { setEv(START); setMeal(null); setSent(false); }}>
      <div className="mx-auto max-w-md rounded-2xl border border-line/70 p-5">
        {sent ? (
          <div className="py-8 text-center"><Check className="mx-auto h-7 w-7" aria-hidden="true" /><p className="mt-3 font-serif text-xl">Thank you, Priya</p></div>
        ) : (
          <div className="space-y-5">
            <p className="font-serif text-xl">Hi Priya, can you make it?</p>
            {Object.keys(ev).map((e) => (
              <div key={e} className="flex items-center justify-between gap-3">
                <span className="text-sm">{e}</span>
                <span className="flex gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button key={v} type="button" data-static onClick={() => setEv((p) => ({ ...p, [e]: v }))}
                      className={cn("whitespace-nowrap rounded-full border px-3.5 py-1 text-sm", ev[e] === v ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-dashed border-[#243746]/40")}>{v === "yes" ? "Joyfully accept" : "Decline"}</button>
                  ))}
                </span>
              </div>
            ))}
            <div><Label>Meal</Label><div className="mt-2 flex flex-wrap gap-2">{["Vegetarian", "Fish", "Chicken"].map((m) => <Chip key={m} on={meal === m} onClick={() => setMeal(m)}>{m}</Chip>)}</div></div>
            <button type="button" data-static onClick={() => setSent(true)} className="w-full rounded-full bg-[#FFE08A] py-2.5 text-sm font-medium hover:bg-[#F2C94C]">Send reply</button>
          </div>
        )}
      </div>
    </Frame>
  );
}

export function RemindersDemo() {
  const names = ["Priya Rao", "Fatima Khan", "Zuri Okoro", "Marcus Hall"];
  const [sel, setSel] = useState<string[]>(names.slice(0, 3));
  const [sent, setSent] = useState(false);
  return (
    <Frame title="Nudge only who needs it" onReset={() => { setSel(names.slice(0, 3)); setSent(false); }}>
      <div className="mx-auto max-w-md">
        <Label>Not replied yet</Label>
        <ul className="mt-3 divide-y divide-line/60 rounded-2xl border border-line/60">
          {names.map((n) => (
            <li key={n}><label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"><input type="checkbox" checked={sel.includes(n)} onChange={() => { setSel((p) => toggle(p, n)); setSent(false); }} className="h-4 w-4" />{n}</label></li>
          ))}
        </ul>
        <button type="button" data-static onClick={() => setSent(true)} className="mt-4 w-full rounded-full bg-[#FFE08A] py-2.5 text-sm font-medium hover:bg-[#F2C94C]">Remind {sel.length} {sel.length === 1 ? "guest" : "guests"}</button>
        {sent && <p role="status" className="mt-3 text-center text-sm text-[#4A7CAD]">{sel.length === 0 ? "Select at least one guest." : "Each message opens in WhatsApp, ready to send."}</p>}
      </div>
    </Frame>
  );
}

/* ================================================================= REGISTRY */

export function GiftLinkDemo() {
  const [added, setAdded] = useState(false);
  return (
    <Frame title="Add a gift from any store" onReset={() => setAdded(false)}>
      <div className="mx-auto max-w-xl">
        <div className="flex gap-2">
          <input aria-label="Product link" readOnly value="https://example-store.com/cast-iron-casserole" className="min-w-0 flex-1 rounded-xl border border-line bg-[#FFFEFB] px-3 py-2.5 text-sm" />
          <button type="button" data-static onClick={() => setAdded(true)} className="rounded-full bg-[#FFE08A] px-5 py-2.5 text-sm font-medium hover:bg-[#F2C94C]">Add</button>
        </div>
        <div className="mt-5 min-h-[104px]">
          {added && (
            <div className="flex items-center gap-4 rounded-2xl border border-line/70 p-3 animate-in fade-in">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#F4D9CF] text-xs text-[#8A4B38]">Photo</div>
              <div><p className="font-medium">Cast iron casserole, 4.5 L</p><p className="text-sm text-muted-foreground">example-store.com</p><p className="mt-1 text-sm">$149</p></div>
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

export function FundDemo() {
  const [pledged, setPledged] = useState(1200);
  const goal = 4000;
  return (
    <Frame title="Cash funds" onReset={() => setPledged(1200)}>
      <div className="mx-auto max-w-md rounded-2xl bg-[#FFF7D6] p-6">
        <p className="font-medium">Honeymoon fund</p>
        <p className="mt-1 whitespace-nowrap text-sm text-muted-foreground">{money(pledged)} of {money(goal)} pledged</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-[#243746] transition-all duration-500" style={{ width: `${Math.min(100, (pledged / goal) * 100)}%` }} /></div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[50, 100, 250].map((a) => <button key={a} type="button" data-static onClick={() => setPledged((p) => Math.min(goal, p + a))} className="whitespace-nowrap rounded-full border border-[#243746] px-4 py-1.5 text-sm hover:bg-[#FFE08A]">+ {money(a)}</button>)}
        </div>
      </div>
    </Frame>
  );
}

const GIFTS = [{ name: "Stand mixer", price: 329 }, { name: "Linen bedding set", price: 189 }, { name: "Wine glasses, set of 6", price: 72 }];
export function ClaimedDemo() {
  const [claimed, setClaimed] = useState<string[]>(["Linen bedding set"]);
  return (
    <Frame title="Guests claim gifts, no doubles" onReset={() => setClaimed(["Linen bedding set"])}>
      <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
        {GIFTS.map((g) => {
          const on = claimed.includes(g.name);
          return (
            <li key={g.name} className="rounded-2xl border border-line/70 p-4">
              <div className="grid h-20 place-items-center rounded-xl bg-gradient-to-br from-[#FFF7D6] to-[#E8EEF5] text-xs text-muted-foreground" aria-hidden="true">Photo</div>
              <p className="mt-3 font-medium">{g.name}</p>
              <p className="text-sm text-muted-foreground">{money(g.price)}</p>
              <button type="button" data-static onClick={() => setClaimed((p) => toggle(p, g.name))}
                className={cn("mt-3 w-full rounded-full border py-1.5 text-sm", on ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-line hover:bg-[#FFF7D6]")}>{on ? "Claimed" : "I will buy this"}</button>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

/* ================================================================== WEBSITE */

const PALETTES = [
  { name: "Pearl", bg: "#FDFCF7", ink: "#1A1512", accent: "#E8B4A0" }, { name: "Sage", bg: "#EAF0E4", ink: "#2F3E2C", accent: "#8FA98A" },
  { name: "Midnight", bg: "#1F2A38", ink: "#F3EBDD", accent: "#D9B26F" }, { name: "Blush", bg: "#FBEAEA", ink: "#4A2B33", accent: "#D98C9B" },
];
const SECTIONS = ["Our story", "Events", "Travel", "Registry", "RSVP"];

export function WebsiteLookDemo() {
  const [p, setP] = useState(0);
  const [on, setOn] = useState(["Our story", "Events", "RSVP"]);
  const pal = PALETTES[p];
  return (
    <Frame title="Make it yours" onReset={() => { setP(0); setOn(["Our story", "Events", "RSVP"]); }}>
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        <div className="space-y-6">
          <div><Label>Look</Label><div className="mt-2 flex flex-wrap gap-2">{PALETTES.map((x, i) => (
            <button key={x.name} type="button" data-static onClick={() => setP(i)} aria-label={x.name} aria-pressed={p === i}
              className={cn("h-9 w-9 rounded-full border-2", p === i ? "border-[#243746]" : "border-line")} style={{ background: `linear-gradient(135deg, ${x.bg} 55%, ${x.accent} 55%)` }} />
          ))}</div></div>
          <div><Label>Sections</Label><div className="mt-2 flex flex-wrap gap-2">{SECTIONS.map((s) => <Chip key={s} on={on.includes(s)} onClick={() => setOn((q) => toggle(q, s))}>{s}</Chip>)}</div></div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line/70 shadow-sm transition-colors duration-500" style={{ background: pal.bg, color: pal.ink }}>
          <div className="px-6 py-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: pal.accent }}>We are getting married</p>
            <p className="mt-3 font-serif text-3xl">Priya and Kevin</p>
            <p className="mt-1 text-sm opacity-80">12 to 14 November 2026</p>
          </div>
          {SECTIONS.filter((s) => on.includes(s)).map((s) => (
            <div key={s} className="flex items-center justify-between px-6 py-3.5 text-sm" style={{ borderTop: `1px solid ${pal.accent}55` }}>{s}<span className="h-1.5 w-8 rounded-full" style={{ background: pal.accent }} /></div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

const SCHEDULE_START = [{ t: "4:00 pm", n: "Ceremony" }, { t: "5:30 pm", n: "Cocktail hour" }, { t: "7:00 pm", n: "Reception" }];
const SCHEDULE_EXTRA = [{ t: "10:30 pm", n: "Late-night snacks" }, { t: "11:30 pm", n: "Last dance" }];

export function WebsiteScheduleDemo() {
  const [items, setItems] = useState(SCHEDULE_START);
  return (
    <Frame title="One schedule for every event" onReset={() => setItems(SCHEDULE_START)}>
      <div className="mx-auto grid max-w-3xl items-start gap-10 md:grid-cols-2">
        <div>
          <Label>Add an event</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCHEDULE_EXTRA.map((x) => <Chip key={x.n} on={items.some((i) => i.n === x.n)} onClick={() => setItems((p) => (p.some((i) => i.n === x.n) ? p.filter((i) => i.n !== x.n) : [...p, x]))}>{x.n}</Chip>)}
          </div>
        </div>
        <ol className="space-y-3 border-l-2 border-[#FFE08A] pl-5">
          {items.map((i) => <li key={i.n} className="animate-in fade-in"><p className="text-xs text-muted-foreground">{i.t}</p><p className="font-serif text-lg">{i.n}</p></li>)}
        </ol>
      </div>
    </Frame>
  );
}

export function WebsiteDeviceDemo() {
  const [phone, setPhone] = useState(true);
  return (
    <Frame title="Looks right on every screen">
      <div className="mx-auto max-w-3xl">
        <div className="flex justify-center gap-2"><Chip on={phone} onClick={() => setPhone(true)}>Phone</Chip><Chip on={!phone} onClick={() => setPhone(false)}>Computer</Chip></div>
        <div className="mt-6 grid place-items-center rounded-2xl bg-[#EEF3F9] p-6">
          <div className={cn("overflow-hidden rounded-xl border border-line bg-[#FDFCF7] text-center shadow-sm transition-all duration-500", phone ? "w-48" : "w-full max-w-lg")}>
            <div className="px-4 py-8"><p className="text-[9px] uppercase tracking-[0.3em] text-[#E8B4A0]">We are getting married</p><p className="mt-2 font-serif text-2xl">Priya and Kevin</p></div>
            <div className={cn("grid border-t border-[#E8B4A0]/40 text-xs", phone ? "grid-cols-1" : "grid-cols-3")}>
              {["Our story", "Events", "RSVP"].map((s) => <span key={s} className="border-b border-[#E8B4A0]/30 px-3 py-3 last:border-0 md:border-b-0">{s}</span>)}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ================================================================== VENUES */

const VENUES = [
  { name: "Seaside Terrace", city: "Dubai", type: "Beach", min: 40, max: 300, tier: 3 }, { name: "The Orchard House", city: "London", type: "Outdoor", min: 20, max: 120, tier: 2 },
  { name: "Skyline Rooftop", city: "Dubai", type: "Rooftop", min: 30, max: 200, tier: 4 }, { name: "Grand Hall", city: "Abu Dhabi", type: "Banquet hall", min: 150, max: 600, tier: 4 },
  { name: "Olive Grove Farm", city: "Tuscany", type: "Outdoor", min: 30, max: 150, tier: 2 }, { name: "Palm Court", city: "Dubai", type: "Banquet hall", min: 80, max: 400, tier: 3 },
];
const tierSymbol = (n: number) => "$".repeat(n);

export function VenueFilterDemo() {
  const [type, setType] = useState<string | null>(null);
  const [guests, setGuests] = useState(120);
  const shown = VENUES.filter((v) => (!type || v.type === type) && v.min <= guests && v.max >= guests);
  return (
    <Frame title="Find a venue that fits" onReset={() => { setType(null); setGuests(120); }}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex flex-wrap gap-2">{["Beach", "Outdoor", "Rooftop", "Banquet hall"].map((t) => <Chip key={t} on={type === t} onClick={() => setType(type === t ? null : t)}>{t}</Chip>)}</div>
        <label className="flex items-center gap-3 text-sm"><span className="whitespace-nowrap">{guests} guests</span>
          <input type="range" min={20} max={500} step={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} aria-label="Guest count" className="w-44" /></label>
      </div>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.length === 0 && <li className="text-sm text-muted-foreground sm:col-span-3">No venues fit. Try fewer guests or another type.</li>}
        {shown.map((v) => (
          <li key={v.name} className="rounded-2xl border border-line/70 p-4">
            <div className="h-20 rounded-xl bg-gradient-to-br from-[#E8EEF5] to-[#FFF7D6]" aria-hidden="true" />
            <p className="mt-3 font-serif text-lg">{v.name}</p>
            <p className="text-sm text-muted-foreground">{v.city} · {v.type}</p>
            <p className="mt-1 whitespace-nowrap text-sm">{v.min} to {v.max} guests · {tierSymbol(v.tier)}</p>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function VenueBudgetDemo() {
  const [tiers, setTiers] = useState<number[]>([]);
  const shown = VENUES.filter((v) => tiers.length === 0 || tiers.includes(v.tier));
  return (
    <Frame title="Choose your price range" onReset={() => setTiers([])}>
      <div className="flex flex-wrap gap-2">{[2, 3, 4].map((t) => <Chip key={t} on={tiers.includes(t)} onClick={() => setTiers((p) => toggle(p, t))}>{tierSymbol(t)}</Chip>)}</div>
      <ul className="mt-7 flex flex-wrap gap-3">{shown.map((v) => <li key={v.name} className="rounded-full border border-line/70 px-4 py-2 text-sm">{v.name} <span className="text-muted-foreground">{tierSymbol(v.tier)}</span></li>)}</ul>
    </Frame>
  );
}

export function VenueEnquiryDemo() {
  const [sent, setSent] = useState(false);
  return (
    <Frame title="Enquire in one step" onReset={() => setSent(false)}>
      <div className="mx-auto max-w-md rounded-2xl border border-line/70 p-5">
        {sent ? <p className="py-8 text-center font-serif text-xl">Enquiry sent to Seaside Terrace</p> : (
          <div className="space-y-4 text-sm">
            {[["Venue", "Seaside Terrace"], ["Date", "14 November 2026"], ["Guests", "120"]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
            ))}
            <button type="button" data-static onClick={() => setSent(true)} className="w-full rounded-full bg-[#FFE08A] py-2.5 font-medium hover:bg-[#F2C94C]">Send enquiry</button>
          </div>
        )}
      </div>
    </Frame>
  );
}

/* ================================================================== VENDORS */

const VENDOR_SETS: Record<string, { name: string; city: string; tier: number; tags: string }[]> = {
  Photographers: [{ name: "Golden Hour Studio", city: "Dubai", tier: 3, tags: "Photography and film" }, { name: "Maya Lens", city: "London", tier: 2, tags: "Photography" }, { name: "Frame and Light", city: "Tuscany", tier: 4, tags: "Photography, drone" }],
  Florists: [{ name: "Petal and Stem", city: "Dubai", tier: 2, tags: "Florals and decor" }, { name: "The Marigold Co", city: "London", tier: 3, tags: "Ceremony florals" }, { name: "Wild Bloom", city: "Abu Dhabi", tier: 2, tags: "Florals" }],
  Planners: [{ name: "Everafter Events", city: "Dubai", tier: 4, tags: "Full planning" }, { name: "Two Families Events", city: "London", tier: 3, tags: "Multicultural weddings" }, { name: "Day-of Done", city: "Tuscany", tier: 2, tags: "Day-of coordination" }],
  Caterers: [{ name: "Saffron Table", city: "Dubai", tier: 3, tags: "Regional menus" }, { name: "Long Table Kitchen", city: "London", tier: 2, tags: "Seasonal menus" }, { name: "Feast and Co", city: "Abu Dhabi", tier: 4, tags: "Live stations" }],
};

export function VendorBrowseDemo() {
  const [cat, setCat] = useState("Photographers");
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Frame title="Browse by what you need" onReset={() => { setCat("Photographers"); setSaved([]); }}>
      <div className="flex flex-wrap gap-2">{Object.keys(VENDOR_SETS).map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <ul className="mt-7 grid gap-4 sm:grid-cols-3">
        {VENDOR_SETS[cat].map((v) => {
          const on = saved.includes(v.name);
          return (
            <li key={v.name} className="rounded-2xl border border-line/70 p-4">
              <div className="h-20 rounded-xl bg-gradient-to-br from-[#FFF7D6] to-[#E8EEF5]" aria-hidden="true" />
              <p className="mt-3 font-serif text-lg leading-tight">{v.name}</p>
              <p className="text-sm text-muted-foreground">{v.tags}</p>
              <p className="mt-1 text-sm">{v.city} · {tierSymbol(v.tier)}</p>
              <button type="button" data-static onClick={() => setSaved((p) => toggle(p, v.name))}
                className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", on ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-line hover:bg-[#FFF7D6]")}>
                {on ? <><Check className="h-3 w-3" aria-hidden="true" /> Saved</> : "Save"}
              </button>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

export function VendorPriceDemo() {
  const all = Object.values(VENDOR_SETS).flat();
  const [tier, setTier] = useState<number | null>(null);
  const shown = all.filter((v) => tier === null || v.tier === tier);
  return (
    <Frame title="Match your budget" onReset={() => setTier(null)}>
      <div className="flex flex-wrap gap-2">{[2, 3, 4].map((t) => <Chip key={t} on={tier === t} onClick={() => setTier(tier === t ? null : t)}>{tierSymbol(t)}</Chip>)}</div>
      <ul className="mt-7 flex flex-wrap gap-3">{shown.map((v) => <li key={v.name} className="rounded-full border border-line/70 px-4 py-2 text-sm">{v.name} <span className="text-muted-foreground">{v.tags}</span></li>)}</ul>
    </Frame>
  );
}

export function VendorEnquiryDemo() {
  const [sent, setSent] = useState(false);
  return (
    <Frame title="Enquire straight from the profile" onReset={() => setSent(false)}>
      <div className="mx-auto max-w-md rounded-2xl border border-line/70 p-5">
        {sent ? <p className="py-8 text-center font-serif text-xl">Enquiry sent to Golden Hour Studio</p> : (
          <div className="space-y-4 text-sm">
            {[["Vendor", "Golden Hour Studio"], ["Date", "14 November 2026"], ["Location", "Dubai"]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
            ))}
            <button type="button" data-static onClick={() => setSent(true)} className="w-full rounded-full bg-[#FFE08A] py-2.5 font-medium hover:bg-[#F2C94C]">Send enquiry</button>
          </div>
        )}
      </div>
    </Frame>
  );
}

/** The three demos for a page, in the order they appear down the page: under the hero, then between sections. */
export const FEATURE_DEMOS: Record<string, React.ComponentType[]> = {
  budgeting: [BudgetBreakdownDemo, BudgetOverTimeDemo, PaymentReminderDemo],
  seating: [SeatingDragDemo, SeatingRoomDemo, SeatingWarningsDemo],
  "guest-list": [RepliesDemo, InvitesDemo, DietaryDemo],
  "rsvp-automation": [MessageDemo, RsvpFormDemo, RemindersDemo],
  registry: [GiftLinkDemo, FundDemo, ClaimedDemo],
  website: [WebsiteLookDemo, WebsiteScheduleDemo, WebsiteDeviceDemo],
  venues: [VenueFilterDemo, VenueBudgetDemo, VenueEnquiryDemo],
  "vendor-marketplace": [VendorBrowseDemo, VendorPriceDemo, VendorEnquiryDemo],
};
