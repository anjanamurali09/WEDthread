import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding, useCollaborators, type Collaborator } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteWorkspaceDialog } from "@/components/delete-workspace-dialog";
import { AddPaymentMethodDialog } from "@/components/add-payment-method-dialog";
import { UserPlus, X, CreditCard, Plus, ChevronDown } from "lucide-react";
import { IntegrationsSection } from "@/components/integrations-section";
import { cn } from "@/lib/utils";
import { useActiveRole } from "@/hooks/use-active-role";

export const Route = createFileRoute("/_authenticated/settings/profile")({ component: ProfileSettingsPage });

type ProfileForm = {
  partner_a: string;
  partner_b: string;
  destination_city: string;
  destination_country: string;
  est_guest_count: string;
};

const EMPTY_FORM: ProfileForm = { partner_a: "", partner_b: "", destination_city: "", destination_country: "", est_guest_count: "" };

function ProfileSettingsPage() {
  const { data: wedding, isLoading } = useCurrentWedding();
  const { active } = useActiveRole();
  const invalidate = useInvalidateWedding();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!wedding) return;
    setForm({
      partner_a: wedding.partner_a ?? "",
      partner_b: wedding.partner_b ?? "",
      destination_city: wedding.destination_city ?? "",
      destination_country: wedding.destination_country ?? "",
      est_guest_count: wedding.est_guest_count != null ? String(wedding.est_guest_count) : "",
    });
  }, [wedding]);

  const setField = (key: keyof ProfileForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding) return;
    setSaving(true);
    const { error } = await supabase.from("weddings").update({
      partner_a: form.partner_a.trim(),
      partner_b: form.partner_b.trim(),
      destination_city: form.destination_city.trim() || null,
      destination_country: form.destination_country.trim() || null,
      est_guest_count: form.est_guest_count.trim() ? Number(form.est_guest_count) : null,
    }).eq("id", wedding.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
  };

  return (
    <AppShell title="Profile" subtitle="The core details of your wedding. Who's getting married, where, and roughly how many guests.">
      <SettingsRow title="Profile">
        {isLoading ? (
          <p className="px-8 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
        <form onSubmit={submit} className="px-8 py-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Partner 1" required value={form.partner_a} onChange={(v) => setField("partner_a", v)} />
            <F label="Partner 2" required value={form.partner_b} onChange={(v) => setField("partner_b", v)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Destination city" value={form.destination_city} onChange={(v) => setField("destination_city", v)} />
            <F label="Destination country" value={form.destination_country} onChange={(v) => setField("destination_country", v)} />
          </div>
          <F label="Estimated guest count" type="number" value={form.est_guest_count} onChange={(v) => setField("est_guest_count", v)} />

          <div className="flex justify-end pt-2">
            <button disabled={saving} className="rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
        )}
      </SettingsRow>

      {wedding && userId && wedding.owner_id === userId && active === "couple" && (
        <SettingsRow title="Collaborators"><CollaboratorsSection weddingId={wedding.id} /></SettingsRow>
      )}
      <SettingsRow title="Payment methods"><PaymentMethodsSection /></SettingsRow>
      {wedding && userId && wedding.owner_id === userId && (
        <SettingsRow title="Integrations"><IntegrationsSection weddingId={wedding.id} /></SettingsRow>
      )}
      {wedding && userId && wedding.owner_id === userId && (
        <SettingsRow title="Danger zone" danger><DangerZoneSection wedding={wedding} /></SettingsRow>
      )}
    </AppShell>
  );
}

// One collapsed line per settings area; clicking it opens the area underneath.
function SettingsRow({ title, danger = false, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="max-w-xl paper-card mt-3 overflow-hidden">
      <button type="button" data-static aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-8 py-5 text-left">
        <span className={cn("font-serif text-xl", danger && "text-cherry")}>{title}</span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-line/60">{children}</div>}
    </section>
  );
}

function DangerZoneSection({ wedding }: { wedding: { id: string; partner_a: string; partner_b: string } }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const weddingName = `${wedding.partner_a} & ${wedding.partner_b}`;

  const deleteWedding = async () => {
    const { error } = await supabase.from("weddings").delete().eq("id", wedding.id);
    if (error) { toast.error(error.message); return; }
    setConfirmOpen(false);
    toast.success("Wedding deleted.");
    navigate({ to: "/dashboard" as any });
  };

  return (
    <div className="px-8 py-6">
      <p className="text-sm text-muted-foreground">
        Permanently deletes this wedding. Every event, guest, RSVP, seating chart, budget entry, message, and your wedding website. This can't be undone.
        Your couple workspace itself stays on your account, so you can start planning a new wedding anytime.
      </p>
      <button type="button" onClick={() => setConfirmOpen(true)}
        className="mt-4 rounded-full border border-cherry text-cherry px-5 py-2.5 text-sm font-medium hover:bg-cherry hover:text-pearl cursor-pointer">
        Delete this wedding
      </button>

      <DeleteWorkspaceDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${weddingName}'s wedding?`}
        description="This permanently deletes every event, guest, RSVP, seating chart, budget entry, message, and your wedding website. This can't be undone."
        confirmWith={weddingName}
        onConfirm={deleteWedding}
      />
    </div>
  );
}

function PaymentMethodsSection() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string } | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await supabase.from("payment_methods").select("id,card_brand,card_last4,is_default").order("created_at")).data ?? [],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["payment-methods"] });

  const removeMethod = async () => {
    if (!toRemove) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", toRemove.id);
    setToRemove(null);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="px-8 py-6 space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Entirely optional. Save a card ahead of time so future vendor enquiries go faster.
          Nothing here is required to send an enquiry today.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : methods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No card on file yet.</p>
      ) : (
        <ul className="space-y-2">
          {methods.map((m: any) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 px-4 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {m.card_brand ? `${m.card_brand} •••• ${m.card_last4}` : "Card on file"}
                {m.is_default && <span className="text-[10px] uppercase tracking-widest text-clay">Default</span>}
              </span>
              <button type="button" onClick={() => setToRemove({ id: m.id })} title="Remove card"
                className="p-1.5 rounded-full text-muted-foreground hover:text-cherry hover:bg-stone cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => setAddOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
        <Plus className="h-4 w-4" /> Add payment method
      </button>

      <AddPaymentMethodDialog open={addOpen} onOpenChange={setAddOpen} onSaved={invalidate} />

      {toRemove && (
        <ConfirmDialog
          title="Remove this card?"
          description="You can always add another one later."
          confirmLabel="Remove card"
          onConfirm={removeMethod}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

function CollaboratorsSection({ weddingId }: { weddingId: string }) {
  const { data: collaborators = [], isLoading } = useCollaborators(weddingId);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [toRemove, setToRemove] = useState<Collaborator | null>(null);
  // Feedback shows inline under the form rather than as a popup.
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["collaborators", weddingId] });

  // Emails the invitation. The collaborator row must already exist (the function checks that).
  // Returns the reason when it fails, so the message can say what actually went wrong.
  const sendInviteEmail = async (to: string): Promise<{ ok: boolean; reason?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ sent?: boolean; error?: string }>("send-collaborator-invite", { body: { wedding_id: weddingId, email: to } });
    if (!error && data?.sent) return { ok: true };
    let reason = data?.error ?? error?.message ?? "Unknown error";
    try {
      const body = await (error as { context?: Response } | null)?.context?.json?.();
      if (body?.error) reason = body.error;
    } catch { /* keep the generic reason */ }
    return { ok: false, reason };
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const { data: userData } = await supabase.auth.getUser();
    if (trimmed === userData.user?.email?.toLowerCase()) {
      return setNotice({ kind: "error", text: "That's your own email. You already own this wedding." });
    }
    setInviting(true);
    const { error } = await supabase.from("wedding_collaborators").insert({
      wedding_id: weddingId,
      email: trimmed,
      invited_by: userData.user!.id,
    });
    if (error) {
      setInviting(false);
      return setNotice({ kind: "error", text: error.code === "23505" ? "That email is already a collaborator." : error.message });
    }
    track("collaborator_invited");
    const sent = await sendInviteEmail(trimmed);
    setInviting(false);
    setEmail("");
    invalidate();
    setNotice(sent.ok
      ? { kind: "ok", text: `Invitation sent to ${trimmed}. They get access as soon as they sign in with that email.` }
      : { kind: "error", text: `${trimmed} has been added, but the invitation email couldn't be sent: ${sent.reason}. Use Resend invite below to try again.` });
  };

  const resend = async (c: Collaborator) => {
    setNotice(null);
    setResending(c.id);
    const sent = await sendInviteEmail(c.email);
    setResending(null);
    setNotice(sent.ok ? { kind: "ok", text: `Invitation sent again to ${c.email}.` } : { kind: "error", text: `Couldn't send the email to ${c.email}: ${sent.reason}` });
  };

  const removeCollaborator = async () => {
    if (!toRemove) return;
    const { error } = await supabase.from("wedding_collaborators").delete().eq("id", toRemove.id);
    setToRemove(null);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="px-8 py-6 space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Give someone else full edit access to this wedding. Everything except deleting
          the wedding itself or managing collaborators. They need a WedThread account with a
          matching email; access starts as soon as they sign in.
        </p>
      </div>

      <form onSubmit={invite} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="flex-1 rounded-2xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
        />
        <button disabled={inviting} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer shrink-0">
          <UserPlus className="h-4 w-4" /> {inviting ? "Inviting…" : "Invite"}
        </button>
      </form>
      {notice && <p className={cn("text-sm", notice.kind === "error" ? "text-destructive" : "text-muted-foreground")}>{notice.text}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : collaborators.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collaborators yet.</p>
      ) : (
        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 px-4 py-2.5">
              <div>
                <p className="text-sm">{c.email}</p>
                <p className="text-sm text-muted-foreground">{c.accepted_at ? "Active" : "Invited, hasn't accepted yet"}</p>
              </div>
              {!c.accepted_at && (
                <button type="button" disabled={resending === c.id} onClick={() => resend(c)}
                  className="ml-auto text-sm text-cherry underline underline-offset-4 hover:text-ink disabled:opacity-60 cursor-pointer">
                  {resending === c.id ? "Sending…" : "Resend invite"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setToRemove(c)}
                title="Remove access"
                className="p-1.5 rounded-full text-muted-foreground hover:text-cherry hover:bg-stone cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {toRemove && (
        <ConfirmDialog
          title="Remove collaborator?"
          description={`${toRemove.email} will immediately lose access to this wedding.`}
          confirmLabel="Remove access"
          onConfirm={removeCollaborator}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">{label}{required && <span className="text-cherry ml-0.5">*</span>}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-line px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
    </label>
  );
}
