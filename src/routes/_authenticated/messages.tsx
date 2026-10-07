import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useGuests, useInvites, useInvalidateWedding } from "@/lib/wedding-hooks";
import { guestInvites, isGuestResponded } from "@/lib/rsvp-stats";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Mail, MessageCircle, Send, Plus, Trash2, X, ExternalLink, Check, SkipForward, Smile, Store } from "lucide-react";
import { PhotoEmptyState } from "@/components/photo-empty-state";
import { cn, formatNumber } from "@/lib/utils";
import { ConversationThreadDialog } from "@/components/conversation-thread-dialog";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
  // ?remind=1 arrives from the RSVP tracker's "Remind them" nudge — auto-opens
  // the reminder template with every not-yet-responded guest pre-selected,
  // instead of making the couple re-find and re-filter them by hand.
  validateSearch: (s: Record<string, unknown>) => ({ remind: s.remind === true || s.remind === "1" || s.remind === "true" ? true : undefined }),
});

// Email and WhatsApp are both "open the app with the message pre-filled, you hit send
// yourself" channels — neither has a real bulk-send API from a browser (WhatsApp has none
// at all without WhatsApp Business Platform, see the waitlist card at the bottom of the
// page for that). SMS was dropped rather than keep a third one-at-a-time flow around, since
// its sms: link has the exact same single-recipient limitation WhatsApp does.
function mailtoLink(guest: any, subject: string, body: string) {
  return `mailto:${guest.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// No BCC equivalent exists for WhatsApp, so unlike email this is only ever opened one
// guest at a time. Falls back to the numberless https://wa.me/?text=... form (opens
// WhatsApp's own contact picker) if a guest somehow has no phone on file.
function waLink(guest: any, body: string) {
  const phone = (guest.phone || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

// Partner names and destination are fixed for the whole wedding — not per-recipient — so
// starter templates bake in the real values as plain text instead of merge tags. {{name}}
// and {{rsvp_link}} are both genuinely per-recipient here: every send still goes through a
// guest checklist that resolves each guest's own token link.
function defaultTemplates(wedding: { partner_a: string; partner_b: string; destination_city: string | null; destination_country: string | null }) {
  const partners = `${wedding.partner_a} & ${wedding.partner_b}`;
  const destination = [wedding.destination_city, wedding.destination_country].filter(Boolean).join(", ");
  return [
    { kind: "save_the_date", name: "Save the date", body: `Hi {{name}}! ${partners} are getting married in ${destination}, save the dates. Details coming soon 💌` },
    { kind: "rsvp_request", name: "RSVP request", body: `Hi {{name}}, please RSVP for ${partners}'s wedding: {{rsvp_link}}` },
    { kind: "reminder", name: "T-7 reminder", body: "Hi {{name}}, our wedding is one week away! Review your events here: {{rsvp_link}}" },
    { kind: "thank_you", name: "Thank you", body: `Thank you for celebrating with us, {{name}}. It meant the world., ${partners}` },
  ];
}

function render(body: string, ctx: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`);
}

// {{name}} and {{rsvp_link}} are the only things that actually vary per recipient — partner
// names and destination are fixed for the whole wedding, so starter templates bake those in
// as plain text (see defaultTemplates() above) instead of offering them as tags.
const MERGE_TAGS: { key: string; label: string }[] = [
  { key: "name", label: "Guest's first name" },
  { key: "rsvp_link", label: "Guest's personal RSVP link" },
];

// Organized the same way WhatsApp's own picker groups its emoji keyboard, so browsing
// feels familiar — categories as tabs rather than one giant flat grid.
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: [
    "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
    "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥",
    "😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐",
    "😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓",
    "😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","👻","👽","🤖","💩","😺","😸","😹","😻","😼","😽",
  ]},
  { label: "Gestures", emojis: [
    "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍",
    "👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","👃","🧠","🦷",
    "👀","👁️","👅","👄","💋","🩸","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎",
  ]},
  { label: "Hearts", emojis: [
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
    "💌","💋","😍","🥰","😘","💑","💏","👩‍❤️‍👨","👨‍❤️‍👨","👩‍❤️‍👩","💐","🌹","🌷","🌸","🌺","🌻","🌼","🥀","💒","👰",
  ]},
  { label: "Celebration", emojis: [
    "🎉","🎊","🎈","🎁","🎀","🪅","🎇","🎆","✨","🌟","⭐","💫","🥳","🎂","🍰","🧁","🍾","🥂","🍻","🍷",
    "🍸","🍹","🥃","🍺","🎵","🎶","🎤","🎧","🎷","🎸","🎹","🥁","🎻","📸","📷","🎥","🎬","🎭","🎨","🎗️",
  ]},
  { label: "Animals & Nature", emojis: [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆",
    "🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐢","🐍","🦎","🐙","🦀","🐠","🐬","🐳",
    "🌸","🌼","🌻","🌷","🌹","🥀","🌺","🌾","🌿","☘️","🍀","🍁","🍂","🌊","☀️","🌤️","⛅","🌦️","🌈","🌙",
  ]},
  { label: "Food & Drink", emojis: [
    "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑",
    "🥦","🥬","🥒","🌽","🥕","🧄","🧅","🥔","🍞","🥐","🥖","🧀","🥚","🍳","🥞","🧇","🥓","🍔","🍟","🍕",
    "🌭","🥪","🌮","🌯","🍜","🍝","🍣","🍱","🍤","🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭","☕","🍵","🥤",
  ]},
  { label: "Travel & Places", emojis: [
    "✈️","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚚","🚲","🛵","🏍️","🚂","🚢","⛵","🚁","🗽","🗼",
    "🏰","🏯","🏟️","🎡","🎢","🏖️","🏝️","🏜️","🌋","⛰️","🏔️","🗻","🏕️","🏠","🏡","🏨","⛪","🕌","🕍","🛕",
  ]},
  { label: "Objects", emojis: [
    "💍","👑","👒","🎩","🎓","💼","👗","👠","💄","💎","📿","🕶️","👓","🧳","🎒","📱","💻","⌚","📷","🎥",
    "🔑","💡","🔦","📖","📚","✏️","✒️","📝","📌","📎","✂️","🔒","🔓","🎁","🛎️","🧸","🪄","🕯️","🧧","💰",
  ]},
  { label: "Symbols", emojis: [
    "✅","☑️","✔️","❌","❎","➕","➖","♻️","🔀","🔁","🔂","▶️","⏸️","⏹️","🔊","🔇","📣","📢","💬","🗨️",
    "💭","🕐","⏰","⌛","⚡","🔥","💥","💦","💨","🌟","💯","🆕","🆗","🆓","🔞","⚠️","🚫","♥️","♦️","♣️",
  ]},
  { label: "Flags", emojis: [
    "🏳️","🏴","🏁","🚩","🏳️‍🌈","🇺🇸","🇬🇧","🇨🇦","🇦🇺","🇮🇳","🇫🇷","🇩🇪","🇮🇹","🇪🇸","🇵🇹","🇯🇵","🇰🇷","🇨🇳","🇧🇷","🇲🇽",
  ]},
];

// Finds an unterminated "{{" run ending at the cursor, e.g. body "Hi {{na|" with the
// cursor at | returns { start: 3, query: "na" }. Returns null once the user closes it
// with "}}" or breaks the tag name with whitespace/braces.
function detectMergeTrigger(text: string, cursor: number): { start: number; query: string } | null {
  const uptoCursor = text.slice(0, cursor);
  const start = uptoCursor.lastIndexOf("{{");
  if (start === -1) return null;
  const query = uptoCursor.slice(start + 2);
  if (/[\s{}]/.test(query)) return null;
  return { start, query };
}

// Mirrors the textarea's box into a hidden div to measure the pixel position of a given
// character offset — the standard technique for anchoring a popup to a caret inside a
// plain <textarea> (there's no native API for this).
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const div = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  const properties = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
    "textTransform", "wordSpacing", "textIndent",
  ] as const;
  properties.forEach((prop) => { (div.style as any)[prop] = style[prop]; });
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";
  document.body.appendChild(div);

  div.textContent = textarea.value.slice(0, position);
  const span = document.createElement("span");
  span.textContent = textarea.value.slice(position) || ".";
  div.appendChild(span);

  const coords = { top: span.offsetTop - textarea.scrollTop, left: span.offsetLeft, height: parseInt(style.lineHeight || "16", 10) };
  document.body.removeChild(div);
  return coords;
}

function MessagesPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: invites = [] } = useInvites(wedding?.id);
  const invalidate = useInvalidateWedding();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [sending, setSending] = useState<{ template: any; channel: "email" | "whatsapp"; initialSelected?: string[]; audienceLabel?: string } | null>(null);
  const { remind } = Route.useSearch();

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data } = await supabase.from("message_templates").select("*").eq("wedding_id", wedding!.id).order("created_at");
      return data ?? [];
    },
  });

  // ?remind=1: pre-fill the reminder template's audience with every guest
  // who hasn't fully RSVP'd yet — a guest with no invites at all isn't
  // "not RSVP'd," there's nothing to remind them about.
  const remindedRef = useRef(false);
  useEffect(() => {
    if (!remind || remindedRef.current || !wedding || templatesLoading) return;
    remindedRef.current = true;
    const pendingIds = guests.filter((g) => {
      const relevant = guestInvites(g.id, invites);
      return relevant.length > 0 && !isGuestResponded(relevant);
    }).map((g) => g.id);
    const template = templates.find((t: any) => t.kind === "reminder") ?? defaultTemplates(wedding).find((t) => t.kind === "reminder")!;
    setSending({ template, channel: "email", initialSelected: pendingIds, audienceLabel: "guests who haven't RSVP'd yet" });
  }, [remind, wedding, guests, invites, templates, templatesLoading]);

  const WHATSAPP_WAITLIST_FEATURE = "whatsapp_direct_send";
  const { data: onWaitlist = false } = useQuery({
    queryKey: ["feature-waitlist", wedding?.id, WHATSAPP_WAITLIST_FEATURE],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data } = await supabase.from("feature_waitlist" as any).select("id")
        .eq("wedding_id", wedding!.id).eq("feature", WHATSAPP_WAITLIST_FEATURE).maybeSingle();
      return !!data;
    },
  });

  const joinWaitlist = async () => {
    if (!wedding) return;
    const { error } = await supabase.from("feature_waitlist" as any).insert({ wedding_id: wedding.id, feature: WHATSAPP_WAITLIST_FEATURE });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["feature-waitlist", wedding.id, WHATSAPP_WAITLIST_FEATURE] });
  };

  const seedDefaults = async () => {
    if (!wedding) return;
    const inserts = defaultTemplates(wedding).map((t) => ({ ...t, wedding_id: wedding.id, kind: t.kind as any }));
    const { error } = await supabase.from("message_templates").insert(inserts);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["templates", wedding.id] });
  };

  const saveTemplate = async (t: any) => {
    if (!wedding) return;
    const payload = { wedding_id: wedding.id, name: t.name, body: t.body, kind: t.kind };
    if (t.id) await supabase.from("message_templates").update(payload).eq("id", t.id);
    else await supabase.from("message_templates").insert(payload);
    qc.invalidateQueries({ queryKey: ["templates", wedding.id] });
    setEditing(null);
  };

  const delTemplate = async (id: string) => {
    await supabase.from("message_templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["templates", wedding?.id] });
  };

  if (!wedding) return null;

  return (
    <AppShell
      title="Messages"
      subtitle="Guest email/WhatsApp templates below, vendor enquiry conversations above."
      actions={
        <div className="flex gap-2">
          {!templatesLoading && templates.length === 0 && <button onClick={seedDefaults} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">Load starter templates</button>}
          <button onClick={() => setEditing({ kind: "custom", name: "", body: "" })} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay"><Plus className="h-4 w-4" /> New template</button>
        </div>
      }
    >
      <VendorConversationsSection weddingId={wedding.id} />

      {templatesLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <PhotoEmptyState
          photo="bridal"
          eyebrow="Messages"
          title="Speak in your own voice"
          body="Load the four starters (save-the-date, RSVP, reminder, thank-you), then edit each one so it sounds like you, not us."
        >
          <button onClick={seedDefaults} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay"><Send className="h-4 w-4" /> Load starter templates</button>
        </PhotoEmptyState>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t: any) => (
            <div key={t.id} className="paper-card p-6 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-2xl text-cherry">{t.name}</h3>
                <button onClick={() => delTemplate(t.id)} className="p-1.5 rounded-full hover:bg-stone text-cherry"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <p className="mt-3 text-lg text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.body}</p>
              <div className="mt-auto pt-5 flex flex-wrap gap-2">
                <button onClick={() => setEditing(t)} className="text-sm rounded-full border border-line px-4 py-2 hover:bg-stone">Edit</button>
                <button type="button" onClick={() => setSending({ template: t, channel: "email" })}
                  className="text-sm rounded-full bg-cherry text-paper px-4 py-2 hover:bg-ink inline-flex items-center gap-1.5 cursor-pointer">
                  <Send className="h-3.5 w-3.5" /> Send email
                </button>
                <button type="button" onClick={() => setSending({ template: t, channel: "whatsapp" })}
                  className="text-sm rounded-full bg-sage-deep text-pearl px-4 py-2 hover:bg-sage-deep-hover inline-flex items-center gap-1.5 cursor-pointer">
                  <MessageCircle className="h-3.5 w-3.5" /> Send WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 paper-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-serif text-2xl text-cherry">Coming soon</p>
          <p className="mt-1 text-lg">Interested in sending WhatsApp messages directly from the platform?</p>
        </div>
        {onWaitlist ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-sage-deep shrink-0"><Check className="h-3.5 w-3.5" /> You're on the waitlist</span>
        ) : (
          <button onClick={joinWaitlist} className="rounded-full bg-blush text-ink px-5 py-2 text-sm hover:bg-[#FFE08A] cursor-pointer shrink-0">Join the waitlist</button>
        )}
      </div>

      {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} onSave={saveTemplate} />}
      {sending && (
        <SendDialog channel={sending.channel} template={sending.template} guests={guests} wedding={wedding}
          initialSelected={sending.initialSelected} audienceLabel={sending.audienceLabel}
          onClose={() => setSending(null)} />
      )}
    </AppShell>
  );
}

type ConversationRow = { id: string; businessId: string; businessName: string; preview: string; updatedAt: string };

// Where a couple's vendor enquiries land, per Phase 4: submit-enquiry
// creates/reuses one conversation per vendor and posts the lead form answers
// as its first message — this list is that inbox, separate from the
// guest-broadcast templates below (a different audience, a different kind
// of "message" entirely).
function VendorConversationsSection({ weddingId }: { weddingId: string }) {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["couple-conversations", weddingId],
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data: convos } = await supabase.from("conversations").select("id,business_id,updated_at").eq("wedding_id", weddingId).order("updated_at", { ascending: false });
      if (!convos || convos.length === 0) return [];
      const [{ data: businesses }, { data: msgs }] = await Promise.all([
        supabase.from("businesses").select("id,legal_business_name").in("id", convos.map((c) => c.business_id)),
        supabase.from("conversation_messages").select("conversation_id,body,created_at").in("conversation_id", convos.map((c) => c.id)).order("created_at", { ascending: false }),
      ]);
      const nameById = new Map((businesses ?? []).map((b) => [b.id, b.legal_business_name]));
      const previewByConvo = new Map<string, string>();
      for (const m of msgs ?? []) if (!previewByConvo.has(m.conversation_id)) previewByConvo.set(m.conversation_id, m.body);
      return convos.map((c) => ({
        id: c.id, businessId: c.business_id, businessName: nameById.get(c.business_id) ?? "Vendor",
        preview: previewByConvo.get(c.id) ?? "", updatedAt: c.updated_at,
      }));
    },
  });
  const [openThread, setOpenThread] = useState<ConversationRow | null>(null);

  if (isLoading || conversations.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="font-serif text-2xl mb-4 inline-flex items-center gap-2"><Store className="h-5 w-5" /> Vendor enquiries</h3>
      <div className="grid gap-2">
        {conversations.map((c) => (
          <button key={c.id} type="button" onClick={() => setOpenThread(c)}
            className="text-left rounded-2xl border border-line px-5 py-3.5 hover:bg-stone/50 cursor-pointer flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">{c.businessName}</p>
              <p className="text-sm text-muted-foreground truncate">{c.preview}</p>
            </div>
            <span className="text-sm text-muted-foreground shrink-0">{new Date(c.updatedAt).toLocaleDateString()}</span>
          </button>
        ))}
      </div>
      {openThread && (
        <ConversationThreadDialog
          conversationId={openThread.id}
          title={openThread.businessName}
          senderRole="couple"
          open={!!openThread}
          onOpenChange={(o) => !o && setOpenThread(null)}
          reviewBusiness={{ id: openThread.businessId, name: openThread.businessName }}
        />
      )}
    </div>
  );
}

function TemplateDialog({ template, onClose, onSave }: any) {
  const [form, setForm] = useState(template);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mergeQuery, setMergeQuery] = useState<string | null>(null);
  const [mergeStart, setMergeStart] = useState(0);
  const [mergeIndex, setMergeIndex] = useState(0);
  const [mergeAnchor, setMergeAnchor] = useState({ top: 0, left: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);

  const filteredTags = mergeQuery == null ? [] : MERGE_TAGS.filter((t) => t.key.startsWith(mergeQuery.toLowerCase()));

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : form.body.length;
    const before = form.body.slice(0, cursor);
    const after = form.body.slice(cursor);
    const newBody = before + emoji + after;
    setForm({ ...form, body: newBody });
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const syncMergeTrigger = (el: HTMLTextAreaElement) => {
    const trig = detectMergeTrigger(el.value, el.selectionStart);
    if (!trig) { setMergeQuery(null); return; }
    setMergeQuery(trig.query);
    setMergeStart(trig.start);
    setMergeIndex(0);
    const coords = getCaretCoordinates(el, el.selectionStart);
    setMergeAnchor({ top: coords.top + coords.height, left: coords.left });
  };

  const insertMergeTag = (key: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const before = form.body.slice(0, mergeStart);
    const after = form.body.slice(cursor);
    const inserted = `{{${key}}}`;
    const newBody = before + inserted + after;
    setForm({ ...form, body: newBody });
    setMergeQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mergeQuery == null || filteredTags.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMergeIndex((i) => Math.min(i + 1, filteredTags.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMergeIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); insertMergeTag(filteredTags[mergeIndex].key); }
    else if (e.key === "Escape") { e.preventDefault(); setMergeQuery(null); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between"><h3 className="font-serif text-2xl">Template</h3><button onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="mt-6 space-y-4">
          <label className="block"><span className="text-sm uppercase tracking-widest text-muted-foreground">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm" /></label>
          <label className="block relative">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-widest text-muted-foreground">Message body</span>
              <div className="relative">
                <button type="button" onClick={() => setEmojiOpen((v) => !v)}
                  className="p-1 rounded-full text-muted-foreground hover:bg-stone hover:text-ink cursor-pointer">
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {emojiOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-2xl border border-line bg-pearl shadow-lg overflow-hidden">
                      <div className="flex gap-1 overflow-x-auto p-1.5 border-b border-line/60">
                        {EMOJI_CATEGORIES.map((cat, i) => (
                          <button type="button" key={cat.label} onClick={() => setEmojiCategory(i)}
                            className={cn("shrink-0 rounded-full px-2.5 py-1 text-sm whitespace-nowrap cursor-pointer", i === emojiCategory ? "bg-cherry text-paper" : "text-muted-foreground hover:bg-stone")}>
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-8 gap-1 p-2 max-h-56 overflow-y-auto">
                        {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                          <button type="button" key={`${emoji}-${i}`} onClick={() => insertEmoji(emoji)}
                            className="text-lg leading-none p-1.5 rounded-lg hover:bg-blush-soft cursor-pointer">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <textarea ref={textareaRef} rows={6} value={form.body}
              onChange={(e) => { setForm({ ...form, body: e.target.value }); syncMergeTrigger(e.target); }}
              onKeyUp={(e) => { if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) syncMergeTrigger(e.currentTarget); }}
              onClick={(e) => syncMergeTrigger(e.currentTarget)}
              onKeyDown={onBodyKeyDown}
              onBlur={() => setMergeQuery(null)}
              className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm" />
            {mergeQuery != null && filteredTags.length > 0 && (
              <div onMouseDown={(e) => e.preventDefault()}
                style={{ top: mergeAnchor.top, left: mergeAnchor.left }}
                className="absolute z-20 min-w-[200px] max-h-56 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
                {filteredTags.map((t, i) => (
                  <button type="button" key={t.key} onClick={() => insertMergeTag(t.key)}
                    className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2", i === mergeIndex && "bg-blush-soft")}>
                    <code className="text-sm">{`{{${t.key}}}`}</code>
                    <span className="text-sm text-muted-foreground truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
          <p className="text-sm text-muted-foreground">Type <code>{"{{"}</code> to insert a dynamic element</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
            <button onClick={() => onSave(form)} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ctxFor(g: any, wedding: any) {
  return {
    name: g.full_name.split(" ")[0],
    partner_a: wedding.partner_a, partner_b: wedding.partner_b,
    destination: [wedding.destination_city, wedding.destination_country].filter(Boolean).join(", "),
    rsvp_link: `${window.location.origin}/rsvp/${g.rsvp_token}`,
  };
}

// A template body containing {{name}} or {{rsvp_link}} can't be blasted identically to a
// BCC group — each guest's RSVP link is unique, and there's no one "name" for a group.
const PERSONAL_TAGS = /\{\{(name|rsvp_link)\}\}/;

function SendDialog({ template, guests, wedding, channel, initialSelected, audienceLabel, onClose }: {
  template: any; guests: any[]; wedding: any; channel: "email" | "whatsapp";
  // Arrives from the RSVP tracker's "Remind them" nudge — pre-checks
  // whoever it already computed as not-yet-responded, so the couple isn't
  // re-doing that filtering by hand.
  initialSelected?: string[]; audienceLabel?: string;
  onClose: () => void;
}) {
  const isWa = channel === "whatsapp";
  const eligibleGuests = guests.filter((g: any) => (isWa ? !!g.phone : !!g.email));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected ?? []));
  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  const [queueGuests, setQueueGuests] = useState<any[] | null>(null);
  const [sendingBcc, setSendingBcc] = useState(false);

  const selectedGuests = guests.filter((g: any) => selected.has(g.id));

  // Single guest: opens directly, one tap. 2+ guests, email: either one BCC email (below)
  // or a queue. 2+ guests, WhatsApp: queue only — there's no BCC equivalent, so it's always
  // one real click per guest (a browser blocks a rapid chain of window.open calls anyway).
  const sendSingle = () => {
    const g = selectedGuests[0];
    if (!g) return;
    const body = render(template.body, ctxFor(g, wedding));
    window.open(isWa ? waLink(g, body) : mailtoLink(g, template.name, body), "_blank");
    onClose();
  };

  const sendBcc = () => {
    setSendingBcc(true);
    const genericCtx = { ...ctxFor(selectedGuests[0], wedding), name: "there", rsvp_link: "" };
    const body = render(template.body, genericCtx);
    const bcc = selectedGuests.map((g: any) => g.email).join(",");
    window.open(`mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(template.name)}&body=${encodeURIComponent(body)}`, "_blank");
    setSendingBcc(false);
    onClose();
  };

  const preview = selectedGuests[0] ? render(template.body, ctxFor(selectedGuests[0], wedding)) : "";
  const isBulk = selected.size > 1;
  const usesPersonalTags = PERSONAL_TAGS.test(template.body);

  if (queueGuests) {
    return <SendQueueDialog template={template} guests={queueGuests} wedding={wedding} channel={channel} onDone={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-2xl w-full p-8 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-clay inline-flex items-center gap-1">
              {isWa ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />} Send via {isWa ? "WhatsApp" : "Email"}
            </p>
            <h3 className="font-serif text-2xl">{template.name}</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {audienceLabel && (
          <p className="mt-4 text-sm rounded-2xl bg-stone px-4 py-2.5">Pre-selected: {formatNumber(selected.size)} {audienceLabel}.</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{formatNumber(eligibleGuests.length)} guests · {formatNumber(selected.size)} selected</p>
          <button onClick={() => setSelected(new Set(eligibleGuests.map((g: any) => g.id)))} className="text-sm text-clay">Select all</button>
        </div>
        <div className="mt-2 border border-line rounded-2xl max-h-56 overflow-y-auto">
          {eligibleGuests.map((g: any) => (
            <label key={g.id} className="flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0 hover:bg-stone/40 cursor-pointer">
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
              <span className="text-sm flex-1">{g.full_name}</span>
              <span className="text-sm text-muted-foreground">{isWa ? g.phone : g.email}</span>
            </label>
          ))}
          {eligibleGuests.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No guests with a{isWa ? " phone number" : "n email address"} match.</p>
          )}
        </div>

        {preview && (
          <div className="mt-4">
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Preview (first selected)</p>
            <div className="bg-stone/60 rounded-2xl p-4 text-sm whitespace-pre-wrap">{preview}</div>
          </div>
        )}

        {isBulk && (
          <div className="mt-4 rounded-2xl border border-line p-4 space-y-3">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">How should this go out?</p>
            {isWa ? (
              <button type="button" onClick={() => setQueueGuests(selectedGuests)}
                className="w-full rounded-2xl border border-line px-4 py-3 text-left hover:bg-stone cursor-pointer">
                <p className="text-sm font-medium">Personalize each message</p>
                <p className="text-sm text-muted-foreground mt-0.5">WhatsApp has no bulk-send option — this opens it once per guest, one at a time, each with that guest's name and RSVP link.</p>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" disabled={sendingBcc} onClick={sendBcc}
                  className="flex-1 rounded-2xl border border-line px-4 py-3 text-left hover:bg-stone disabled:opacity-60 cursor-pointer">
                  <p className="text-sm font-medium">Same message for everyone</p>
                  <p className="text-sm text-muted-foreground mt-0.5">One email, everyone in BCC, one click.</p>
                </button>
                <button type="button" onClick={() => setQueueGuests(selectedGuests)}
                  className="flex-1 rounded-2xl border border-line px-4 py-3 text-left hover:bg-stone cursor-pointer">
                  <p className="text-sm font-medium">Personalize each message</p>
                  <p className="text-sm text-muted-foreground mt-0.5">One at a time, each with that guest's name and RSVP link.</p>
                </button>
              </div>
            )}
            {!isWa && usesPersonalTags && (
              <p className="text-sm text-clay">This template uses {"{{name}}"} or {"{{rsvp_link}}"} — those can't be personalized in one bulk email. "Same message" will send a generic greeting with no RSVP link.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
          {!isBulk && (
            <button disabled={selected.size === 0} onClick={sendSingle}
              className="rounded-full bg-clay text-paper px-6 py-2 text-sm hover:bg-ink disabled:opacity-50 inline-flex items-center gap-2">
              Open {isWa ? "WhatsApp" : "Email"} <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {isWa ? "Opens WhatsApp with the message pre-filled to that guest's number, you send it yourself." : "Opens your default email app with the message pre-filled, you send it yourself."}
        </p>
      </div>
    </div>
  );
}

function SendQueueDialog({ template, guests, wedding, channel, onDone }: {
  template: any; guests: any[]; wedding: any; channel: "email" | "whatsapp"; onDone: () => void;
}) {
  const isWa = channel === "whatsapp";
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(false);
  const total = guests.length;
  const done = index >= total;
  const g = !done ? guests[index] : null;

  const openCurrent = () => {
    if (!g) return;
    const body = render(template.body, ctxFor(g, wedding));
    window.open(isWa ? waLink(g, body) : mailtoLink(g, template.name, body), "_blank");
    setOpened(true);
  };

  const advance = () => { setOpened(false); setIndex((i) => i + 1); };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
      <div className="bg-paper rounded-3xl max-w-md w-full p-8">
        {done ? (
          <div className="text-center">
            <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-sage-soft text-sage-deep"><Check className="h-5 w-5" /></span>
            <h3 className="mt-4 font-serif text-2xl">All done</h3>
            <p className="mt-2 text-sm text-muted-foreground">Sent to {formatNumber(total)} guest{total === 1 ? "" : "s"} via {isWa ? "WhatsApp" : "Email"}.</p>
            <button onClick={onDone} className="mt-6 rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay cursor-pointer">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-clay inline-flex items-center gap-1">
                  {isWa ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />} Sending via {isWa ? "WhatsApp" : "Email"}
                </p>
                <h3 className="font-serif text-2xl">Guest {index + 1} of {total}</h3>
              </div>
              <button onClick={onDone}><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 flex gap-1">
              {guests.map((_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full", i < index ? "bg-sage-deep" : i === index ? "bg-clay" : "bg-stone")} />
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-line p-4">
              <p className="font-medium text-sm">{g!.full_name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{isWa ? g!.phone : g!.email}</p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <button onClick={advance} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink cursor-pointer">
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </button>
              {!opened ? (
                <button onClick={openCurrent} className="rounded-full bg-clay text-paper px-5 py-2 text-sm hover:bg-ink inline-flex items-center gap-2 cursor-pointer">
                  Open {isWa ? "WhatsApp" : "Email"} <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <button onClick={advance} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay cursor-pointer">
                  {index === total - 1 ? "Finish" : "Next"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
