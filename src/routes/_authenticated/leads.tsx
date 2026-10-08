import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Inbox, Mail, Phone, Calendar, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

const STATUSES = ["new", "read", "replied", "archived"] as const;

function LeadsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["my-leads"],
    queryFn: async () => (await supabase.from("booking_leads" as any).select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = leads.filter((l: any) => filter === "all" || l.status === filter);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("booking_leads" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated."); qc.invalidateQueries({ queryKey: ["my-leads"] }); }
  };

  return (
    <AppShell title="Leads" subtitle="Inquiries from couples who found your listing on WEDthread.">
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "chip-active" : ""}`}>All ({formatNumber(leads.length)})</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-active" : ""}`}>
            {s} ({formatNumber(leads.filter((l: any) => l.status === s).length)})
          </button>
        ))}
      </div>

      <style>{`.chip{border-radius:999px;padding:0.5rem 0.9rem;font-size:0.8rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-transform:capitalize}.chip:hover{background:var(--cream)}.chip-active{background:var(--cherry);color:var(--pearl);border-color:var(--cherry)}`}</style>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-serif text-2xl mt-3">No leads {filter === "all" ? "yet" : `in ${filter}`}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Couples who click "I'm interested" on your listing will appear here with their wedding details pre-filled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l: any) => (
            <article key={l.id} className="paper-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-xl">{l.contact_name ?? "New inquiry"}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {l.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {l.contact_email}</span>}
                    {l.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {l.contact_phone}</span>}
                    {l.event_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(l.event_date).toLocaleDateString()}</span>}
                    {l.guest_count && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {formatNumber(l.guest_count)}</span>}
                    {l.city && <span>{l.city}{l.country ? ", " + l.country : ""}</span>}
                  </div>
                </div>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)} className="text-sm rounded-full border border-line px-3 py-1 bg-paper capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="mt-3 text-sm text-ink whitespace-pre-line">{l.message}</p>
              {(l.budget_min || l.budget_max) && (
                <p className="mt-2 text-sm text-muted-foreground">Budget: {l.budget_min != null ? formatNumber(l.budget_min) : "?"} – {l.budget_max != null ? formatNumber(l.budget_max) : "?"} {l.currency ?? ""}</p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                via {l.utm_source}/{l.utm_medium}{l.utm_campaign ? ` · ${l.utm_campaign}` : ""} · {new Date(l.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
