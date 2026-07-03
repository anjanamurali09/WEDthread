import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Send, Plus, Trash2, X, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({ component: MessagesPage });

const KIND_LABELS: Record<string, string> = {
  save_the_date: "Save the date",
  rsvp_request: "RSVP request",
  reminder: "Reminder",
  thank_you: "Thank you",
  custom: "Custom",
};

const DEFAULT_TEMPLATES = [
  { kind: "save_the_date", name: "Save the date", body: "Hi {{name}}! {{partner_a}} & {{partner_b}} are getting married in {{destination}}, save the dates. Details coming soon 💌" },
  { kind: "rsvp_request", name: "RSVP request", body: "Hi {{name}}, please RSVP for {{partner_a}} & {{partner_b}}'s wedding: {{rsvp_link}}" },
  { kind: "reminder", name: "T-7 reminder", body: "Hi {{name}}, our wedding is one week away! Review your events here: {{rsvp_link}}" },
  { kind: "thank_you", name: "Thank you", body: "Thank you for celebrating with us, {{name}}. It meant the world., {{partner_a}} & {{partner_b}}" },
];

function render(body: string, ctx: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`);
}

function MessagesPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const invalidate = useInvalidateWedding();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [sending, setSending] = useState<any | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data } = await supabase.from("message_templates").select("*").eq("wedding_id", wedding!.id).order("created_at");
      return data ?? [];
    },
  });

  const { data: sends = [] } = useQuery({
    queryKey: ["sends", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data } = await supabase.from("message_sends").select("*").eq("wedding_id", wedding!.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const seedDefaults = async () => {
    if (!wedding) return;
    const inserts = DEFAULT_TEMPLATES.map((t) => ({ ...t, wedding_id: wedding.id, kind: t.kind as any }));
    const { error } = await supabase.from("message_templates").insert(inserts);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["templates", wedding.id] });
    toast.success("Templates ready");
  };

  const saveTemplate = async (t: any) => {
    if (!wedding) return;
    const payload = { wedding_id: wedding.id, name: t.name, body: t.body, kind: t.kind };
    if (t.id) await supabase.from("message_templates").update(payload).eq("id", t.id);
    else await supabase.from("message_templates").insert(payload);
    qc.invalidateQueries({ queryKey: ["templates", wedding.id] });
    setEditing(null);
    toast.success("Saved");
  };

  const delTemplate = async (id: string) => {
    if (!confirm("Delete template?")) return;
    await supabase.from("message_templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["templates", wedding?.id] });
  };

  if (!wedding) return null;

  return (
    <AppShell
      title="Messages"
      subtitle="WhatsApp templates with merge tags. Preview per guest, then open in WhatsApp, one tap to send, no logins."
      actions={
        <div className="flex gap-2">
          {templates.length === 0 && <button onClick={seedDefaults} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">Load starter templates</button>}
          <button onClick={() => setEditing({ kind: "custom", name: "", body: "" })} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay"><Plus className="h-4 w-4" /> New template</button>
        </div>
      }
    >
      {templates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <MessageCircle className="h-8 w-8 mx-auto text-clay" />
          <h3 className="mt-4 font-serif text-2xl">No templates yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">Load the four starters (save-the-date, RSVP, reminder, thank-you), then edit to match your voice.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t: any) => (
            <div key={t.id} className="paper-card p-6">
              <p className="text-[10px] uppercase tracking-widest text-clay">{KIND_LABELS[t.kind] ?? t.kind}</p>
              <div className="flex items-start justify-between mt-1">
                <h3 className="font-serif text-2xl">{t.name}</h3>
                <button onClick={() => delTemplate(t.id)} className="p-1.5 rounded-full hover:bg-stone text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap line-clamp-4">{t.body}</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setEditing(t)} className="text-xs rounded-full border border-line px-3 py-1.5 hover:bg-stone">Edit</button>
                <button onClick={() => setSending(t)} className="text-xs rounded-full bg-clay text-paper px-3 py-1.5 hover:bg-ink inline-flex items-center gap-1"><Send className="h-3 w-3" /> Send via WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-4">Recent sends</h2>
        {sends.length === 0 ? <p className="text-sm text-muted-foreground">No sends logged yet.</p> :
          <div className="paper-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone/50 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">To</th><th className="px-4 py-3 hidden md:table-cell">Message</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {sends.map((s: any) => {
                  const g = guests.find((x) => x.id === s.guest_id);
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{g?.full_name ?? s.to_phone}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-ink/70 truncate max-w-[300px]">{s.body}</td>
                      <td className="px-4 py-3"><span className="text-[10px] rounded-full bg-stone px-2 py-0.5">{s.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
      </section>

      {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} onSave={saveTemplate} />}
      {sending && <SendDialog template={sending} guests={guests} events={events} invites={invites} wedding={wedding} onClose={() => { setSending(null); qc.invalidateQueries({ queryKey: ["sends", wedding.id] }); }} />}
    </AppShell>
  );
}

function TemplateDialog({ template, onClose, onSave }: any) {
  const [form, setForm] = useState(template);
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between"><h3 className="font-serif text-2xl">Template</h3><button onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="mt-6 space-y-4">
          <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Kind</span>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm bg-paper">
              {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm" /></label>
          <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Message body</span>
            <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm" /></label>
          <p className="text-[11px] text-muted-foreground">Merge tags: <code>{"{{name}}"}</code>, <code>{"{{partner_a}}"}</code>, <code>{"{{partner_b}}"}</code>, <code>{"{{destination}}"}</code>, <code>{"{{rsvp_link}}"}</code></p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
            <button onClick={() => onSave(form)} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendDialog({ template, guests, events, invites, wedding, onClose }: any) {
  const [eventId, setEventId] = useState<string>("");
  const eligibleGuests = guests.filter((g: any) => {
    if (!g.phone) return false;
    if (!eventId) return true;
    return invites.some((i: any) => i.guest_id === g.id && i.event_id === eventId);
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };

  const openAll = async () => {
    for (const gid of selected) {
      const g = guests.find((x: any) => x.id === gid);
      if (!g?.phone) continue;
      const ctx = {
        name: g.full_name.split(" ")[0],
        partner_a: wedding.partner_a, partner_b: wedding.partner_b,
        destination: [wedding.destination_city, wedding.destination_country].filter(Boolean).join(", "),
        rsvp_link: `${window.location.origin}/rsvp/${g.rsvp_token}`,
      };
      const body = render(template.body, ctx);
      const phone = g.phone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, "_blank");
      await supabase.from("message_sends").insert({
        wedding_id: wedding.id, guest_id: g.id, template_id: template.id,
        to_phone: g.phone, body, channel: "whatsapp", status: "sent", sent_at: new Date().toISOString(),
      });
    }
    onClose();
  };

  const preview = selected.size > 0 ? (() => {
    const g = guests.find((x: any) => x.id === [...selected][0]);
    if (!g) return "";
    return render(template.body, {
      name: g.full_name.split(" ")[0],
      partner_a: wedding.partner_a, partner_b: wedding.partner_b,
      destination: [wedding.destination_city, wedding.destination_country].filter(Boolean).join(", "),
      rsvp_link: `${window.location.origin}/rsvp/${g.rsvp_token}`,
    });
  })() : "";

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-2xl w-full p-8 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-clay">Send via WhatsApp</p>
            <h3 className="font-serif text-2xl">{template.name}</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <label className="block mt-6"><span className="text-xs uppercase tracking-widest text-muted-foreground">Filter by event (optional)</span>
          <select value={eventId} onChange={(e) => { setEventId(e.target.value); setSelected(new Set()); }} className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm bg-paper">
            <option value="">All guests with a phone number</option>
            {events.map((e: any) => <option key={e.id} value={e.id}>{e.name}, invitees</option>)}
          </select>
        </label>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{eligibleGuests.length} guests · {selected.size} selected</p>
          <button onClick={() => setSelected(new Set(eligibleGuests.map((g: any) => g.id)))} className="text-xs text-clay">Select all</button>
        </div>
        <div className="mt-2 border border-line rounded-2xl max-h-56 overflow-y-auto">
          {eligibleGuests.map((g: any) => (
            <label key={g.id} className="flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0 hover:bg-stone/40 cursor-pointer">
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
              <span className="text-sm flex-1">{g.full_name}</span>
              <span className="text-xs text-muted-foreground">{g.phone}</span>
            </label>
          ))}
          {eligibleGuests.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground">No guests with a phone number match.</p>}
        </div>

        {preview && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Preview (first selected)</p>
            <div className="bg-stone/60 rounded-2xl p-4 text-sm whitespace-pre-wrap">{preview}</div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
          <button disabled={selected.size === 0} onClick={openAll} className="rounded-full bg-clay text-paper px-6 py-2 text-sm hover:bg-ink disabled:opacity-50 inline-flex items-center gap-2">
            Open {selected.size} WhatsApp chat{selected.size === 1 ? "" : "s"} <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Vowzy opens each chat with the message pre-filled, you tap send in WhatsApp. This works with your personal number, no Twilio setup needed. (Business API auto-send coming soon.)</p>
      </div>
    </div>
  );
}
