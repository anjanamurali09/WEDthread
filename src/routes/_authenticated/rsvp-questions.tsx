import { createFileRoute, Link } from "@tanstack/react-router";
import { partnerOne, partnerTwo } from "@/lib/partner-names";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useInvites, useRsvpQuestions, useRsvpResponses, type RsvpQuestion, type Event, type Guest, type Wedding, type Invite } from "@/lib/wedding-hooks";
import { summarizeGuestRsvps, guestInvites, isGuestAttending, isGuestResponded } from "@/lib/rsvp-stats";
import { ShareRsvpDialog } from "@/components/share-rsvp-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  Plus, Trash2, X, GripVertical, CheckCircle2, ListFilter, Type as TypeIcon, ChevronDown, Check, Lock, Eye, Share2, Table2, Columns3,
  XCircle, Clock, Search, ChevronRight, Download, Users, Send,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatNumber } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RsvpPageBody, rsvpAnswerKey, DEFAULT_ATTENDANCE_TEXT, DEFAULT_ACCEPT_LABEL, DEFAULT_DECLINE_LABEL, DEFAULT_MAYBE_LABEL, type RsvpEventRow, type RsvpQuestionRow, type RsvpSaveStatus, type RsvpMode } from "@/components/rsvp-form";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CustomColorButton } from "@/components/custom-color";

export const Route = createFileRoute("/_authenticated/rsvp-questions")({ component: RsvpQuestionsPage });

// Mirrors the wording the couple set on the RSVP builder, same as guests.tsx's own copy of this.
function rsvpStatusLabel(status: string, wedding?: Wedding | null): string {
  if (status === "attending") return wedding?.attendance_accept_label || DEFAULT_ACCEPT_LABEL;
  if (status === "declined") return wedding?.attendance_decline_label || DEFAULT_DECLINE_LABEL;
  if (status === "maybe") return wedding?.attendance_maybe_label || DEFAULT_MAYBE_LABEL;
  return "Pending";
}

type QuestionType = RsvpQuestion["question_type"];

const QUESTION_TYPES: { value: QuestionType; label: string; icon: any }[] = [
  { value: "yes_no", label: "Single choice", icon: CheckCircle2 },
  { value: "multiple_choice", label: "Multiple choice", icon: ListFilter },
  { value: "short_text", label: "Short text", icon: TypeIcon },
];

type QuickAddTemplate = { label: string; questionType: QuestionType; options?: string[] };

const QUICK_ADD_TEMPLATES: QuickAddTemplate[] = [
  { label: "Do you have any dietary restrictions we should know about?", questionType: "short_text" },
  { label: "Which meal would you prefer?", questionType: "multiple_choice", options: ["Option 1", "Option 2", "Option 3"] },
  { label: "Are you bringing a plus one?", questionType: "yes_no", options: ["Yes", "No"] },
  { label: "Will you need transportation to the venue?", questionType: "yes_no", options: ["Yes", "No"] },
  { label: "Any song requests to get you on the dance floor?", questionType: "short_text" },
];

function eventLabel(eventIds: string[], events: Event[]): string {
  if (!eventIds.length) return "All events";
  const names = eventIds.map((id) => events.find((e) => e.id === id)?.name).filter(Boolean) as string[];
  if (names.length > 2) return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  return names.join(", ") || "All events";
}

// Expands the couple's questions (one row per question, with an array of
// applicable events) into the flat per-(question, event) shape the guest
// page renders, exactly mirroring what get_rsvp_questions returns for a
// guest tagged to every event — so the preview matches production.
function expandQuestionsForPreview(questions: RsvpQuestion[], events: Event[]): RsvpQuestionRow[] {
  const rows: RsvpQuestionRow[] = [];
  questions.forEach((q) => {
    const base = {
      question_id: q.id, question_text: q.question_text, question_type: q.question_type,
      options: q.options ?? [], is_required: q.is_required, sort_order: q.sort_order,
      depends_on_question_id: q.depends_on_question_id, depends_on_value: q.depends_on_value,
      existing_answer: null,
    };
    if (!q.event_ids.length) {
      rows.push({ ...base, event_id: null, event_name: null });
    } else {
      q.event_ids.forEach((eid) => {
        rows.push({ ...base, event_id: eid, event_name: events.find((e) => e.id === eid)?.name ?? null });
      });
    }
  });
  return rows;
}

function buildPreviewEventRows(events: Event[], statusMap: Record<string, { status: string; plusOnes: number }>): RsvpEventRow[] {
  return events.map((e) => ({
    event_id: e.id, event_name: e.name, event_date: e.event_date, event_time: e.event_time,
    venue_name: e.venue_name, city: e.city,
    current_status: statusMap[e.id]?.status ?? "pending",
    current_plus_ones: statusMap[e.id]?.plusOnes ?? 0,
  }));
}

function RsvpQuestionsPage() {
  const { data: wedding } = useCurrentWedding();
  const { data: events = [] } = useEvents(wedding?.id);
  const { data: guests = [], isLoading: guestsLoading } = useGuests(wedding?.id);
  const { data: invites = [], isLoading: invitesLoading } = useInvites(wedding?.id);
  const { data: questions = [], isLoading } = useRsvpQuestions(wedding?.id);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<RsvpQuestion> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Once guests have started replying, the page opens straight onto their responses, with a short note on how many
  // there are (and how many are new since the last visit). The note goes away by itself after ten seconds.
  const [notice, setNotice] = useState<string | null>(null);
  const openedForResponses = useRef(false);
  const responseCount = useMemo(() => summarizeGuestRsvps(guests.map((g) => g.id), invites).responded, [guests, invites]);

  useEffect(() => {
    if (!wedding || openedForResponses.current || guestsLoading || invitesLoading || responseCount === 0) return;
    openedForResponses.current = true;
    const key = `wedthread.rsvp-seen.${wedding.id}`;
    let seen = 0;
    try { seen = Number(localStorage.getItem(key) ?? 0) || 0; localStorage.setItem(key, String(responseCount)); } catch { /* storage unavailable */ }
    const fresh = responseCount - seen;
    const plural = (n: number) => `${n} response${n === 1 ? "" : "s"}`;
    setNotice(fresh > 0 && seen > 0 ? `${plural(fresh)} since your last visit. ${plural(responseCount)} in total.` : `You have ${plural(responseCount)} so far.`);
    setResponsesOpen(true);
    const timer = window.setTimeout(() => setNotice(null), 10000);
    return () => window.clearTimeout(timer);
  }, [wedding, guestsLoading, invitesLoading, responseCount]);

  const invalidateQuestions = () => qc.invalidateQueries({ queryKey: ["rsvp-questions", wedding?.id] });

  const persistOrder = async (ordered: RsvpQuestion[]) => {
    qc.setQueryData(["rsvp-questions", wedding?.id], ordered);
    await Promise.all(ordered.map((q, i) => supabase.from("rsvp_questions").update({ sort_order: i }).eq("id", q.id)));
    invalidateQuestions();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex((q) => q.id === active.id);
    const newIdx = questions.findIndex((q) => q.id === over.id);
    persistOrder(arrayMove(questions, oldIdx, newIdx));
  };

  const save = async (q: Partial<RsvpQuestion>) => {
    if (!wedding) return;
    const payload: any = {
      wedding_id: wedding.id,
      question_text: q.question_text!.trim(),
      question_type: q.question_type ?? "short_text",
      options: q.question_type === "multiple_choice" || q.question_type === "yes_no" ? (q.options ?? []).filter((o) => o.trim()) : [],
      event_ids: q.event_ids ?? [],
      is_required: q.is_required ?? false,
      depends_on_question_id: q.depends_on_question_id || null,
      depends_on_value: q.depends_on_question_id ? (q.depends_on_value || null) : null,
      sort_order: q.sort_order ?? questions.length,
      guest_column_label: q.guest_column_label?.trim() || null,
    };
    try {
      if (q.id) {
        const { error } = await supabase.from("rsvp_questions").update(payload).eq("id", q.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rsvp_questions").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEditing(null);
      invalidateQuestions();
    } catch (err: any) { toast.error(err.message); }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("rsvp_questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidateQuestions();
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await del(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const updateAttendanceSettings = async (patch: Partial<Pick<Wedding, "attendance_question_text" | "attendance_allow_maybe" | "attendance_accept_label" | "attendance_decline_label" | "attendance_maybe_label" | "rsvp_mode">>) => {
    if (!wedding) return;
    const { error } = await supabase.from("weddings").update(patch).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["current-wedding"] });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  return (
    <AppShell
      title="RSVP"
      subtitle="Ask guests what you need to know, per ceremony or across the whole wedding."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setResponsesOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
            <Table2 className="h-4 w-4" /> Track responses
          </button>
          <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      }
    >
      {notice && !responsesOpen && <p role="status" className="mb-3 rounded-2xl bg-[#FFF7D6] px-4 py-2.5 text-sm text-ink">{notice}</p>}
      {wedding && <AttendanceSettingsCard wedding={wedding} onUpdate={updateAttendanceSettings} />}

      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        questions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line px-8 py-8 text-center bg-paper">
            <p className="font-serif text-2xl">No questions yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">Meal choices, song requests, plus ones. Whatever helps you plan.</p>
            <button onClick={() => setEditing({})} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
              <Plus className="h-4 w-4" /> Add your first question
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{formatNumber(questions.length)} question{questions.length === 1 ? "" : "s"} · drag to reorder</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((q) => (
                    <QuestionRow key={q.id} question={q} events={events}
                      onEdit={() => setEditing(q)} onDelete={() => setConfirmDeleteId(q.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={() => setEditing({})}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cherry text-paper px-4 py-2 text-sm hover:bg-ink cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Add question
            </button>
          </>
        )
      }

      {editing && <QuestionDialog question={editing} events={events} questions={questions} onClose={() => setEditing(null)} onSave={save} />}
      {previewOpen && wedding && (
        <RsvpGuestPreview wedding={wedding} events={events} questions={questions} onClose={() => setPreviewOpen(false)} />
      )}
      {shareOpen && wedding && (
        <ShareRsvpDialog wedding={wedding} guests={guests} onClose={() => setShareOpen(false)} />
      )}
      {responsesOpen && wedding && (
        <RsvpResponsesView wedding={wedding} events={events} guests={guests} invites={invites} questions={questions} notice={notice} onClose={() => setResponsesOpen(false)} />
      )}
      {confirmDeleteId && (() => {
        const q = questions.find((qq) => qq.id === confirmDeleteId);
        return (
          <ConfirmDialog
            title="Delete question"
            description={`Delete "${q?.question_text ?? "this question"}"? Any guest answers to it will also be removed. This can't be undone.`}
            confirmLabel="Delete question"
            onConfirm={confirmDelete}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </AppShell>
  );
}

function AttendanceSettingsCard({ wedding, onUpdate }: {
  wedding: Wedding; onUpdate: (patch: Partial<Pick<Wedding, "attendance_question_text" | "attendance_allow_maybe" | "attendance_accept_label" | "attendance_decline_label" | "attendance_maybe_label" | "rsvp_mode">>) => void;
}) {
  const [text, setText] = useState(wedding.attendance_question_text || DEFAULT_ATTENDANCE_TEXT);
  const [acceptLabel, setAcceptLabel] = useState(wedding.attendance_accept_label || DEFAULT_ACCEPT_LABEL);
  const [declineLabel, setDeclineLabel] = useState(wedding.attendance_decline_label || DEFAULT_DECLINE_LABEL);
  const [maybeLabel, setMaybeLabel] = useState(wedding.attendance_maybe_label || DEFAULT_MAYBE_LABEL);

  useEffect(() => { setText(wedding.attendance_question_text || DEFAULT_ATTENDANCE_TEXT); }, [wedding.attendance_question_text]);
  useEffect(() => { setAcceptLabel(wedding.attendance_accept_label || DEFAULT_ACCEPT_LABEL); }, [wedding.attendance_accept_label]);
  useEffect(() => { setDeclineLabel(wedding.attendance_decline_label || DEFAULT_DECLINE_LABEL); }, [wedding.attendance_decline_label]);
  useEffect(() => { setMaybeLabel(wedding.attendance_maybe_label || DEFAULT_MAYBE_LABEL); }, [wedding.attendance_maybe_label]);

  const commitText = () => {
    const trimmed = text.trim() || DEFAULT_ATTENDANCE_TEXT;
    setText(trimmed);
    if (trimmed !== wedding.attendance_question_text) onUpdate({ attendance_question_text: trimmed });
  };
  const commitAcceptLabel = () => {
    const trimmed = acceptLabel.trim() || DEFAULT_ACCEPT_LABEL;
    setAcceptLabel(trimmed);
    if (trimmed !== wedding.attendance_accept_label) onUpdate({ attendance_accept_label: trimmed });
  };
  const commitDeclineLabel = () => {
    const trimmed = declineLabel.trim() || DEFAULT_DECLINE_LABEL;
    setDeclineLabel(trimmed);
    if (trimmed !== wedding.attendance_decline_label) onUpdate({ attendance_decline_label: trimmed });
  };
  const commitMaybeLabel = () => {
    const trimmed = maybeLabel.trim() || DEFAULT_MAYBE_LABEL;
    setMaybeLabel(trimmed);
    if (trimmed !== wedding.attendance_maybe_label) onUpdate({ attendance_maybe_label: trimmed });
  };

  const modeBtn = (on: boolean) => cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors cursor-pointer", on ? "border-ink bg-ink text-paper" : "border-line/70 hover:bg-stone");
  const mode = wedding.rsvp_mode ?? "per_event";
  const labelField = "mt-1 w-full rounded-lg border border-line/70 px-3 py-1.5 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors";

  return (
    <div className="bg-paper rounded-md p-4 flex items-start gap-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.03)] mb-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep">
        <Lock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-lg font-semibold">Attendance question</p>
        <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commitText}
          placeholder={DEFAULT_ATTENDANCE_TEXT} aria-label="Attendance question wording"
          className="mt-2 w-full rounded-lg border border-line/70 px-4 py-2 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors" />
        <p className="mt-1 text-xs text-muted-foreground">Use <code className="px-1 rounded bg-stone">{"{event}"}</code> for the event name.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onUpdate({ rsvp_mode: "per_event" })} className={modeBtn(mode === "per_event")}>RSVP per event</button>
          <button type="button" onClick={() => onUpdate({ rsvp_mode: "single" })} className={modeBtn(mode === "single")}>One RSVP for all</button>
          <label className="ml-1 flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={wedding.attendance_allow_maybe}
              onChange={(e) => onUpdate({ attendance_allow_maybe: e.target.checked })}
              className="h-3.5 w-3.5 accent-sage-deep cursor-pointer" />
            Show "Maybe"
          </label>
        </div>

        <div className={cn("mt-3 grid gap-3", wedding.attendance_allow_maybe ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          <label className="block">
            <span className="text-xs text-muted-foreground">Accept button</span>
            <input value={acceptLabel} onChange={(e) => setAcceptLabel(e.target.value)} onBlur={commitAcceptLabel} placeholder={DEFAULT_ACCEPT_LABEL} className={labelField} />
          </label>
          {wedding.attendance_allow_maybe && (
            <label className="block">
              <span className="text-xs text-muted-foreground">Maybe button</span>
              <input value={maybeLabel} onChange={(e) => setMaybeLabel(e.target.value)} onBlur={commitMaybeLabel} placeholder={DEFAULT_MAYBE_LABEL} className={labelField} />
            </label>
          )}
          <label className="block">
            <span className="text-xs text-muted-foreground">Decline button</span>
            <input value={declineLabel} onChange={(e) => setDeclineLabel(e.target.value)} onBlur={commitDeclineLabel} placeholder={DEFAULT_DECLINE_LABEL} className={labelField} />
          </label>
        </div>
      </div>
    </div>
  );
}

function RsvpGuestPreview({ wedding, events, questions, onClose }: {
  wedding: Wedding; events: Event[]; questions: RsvpQuestion[]; onClose: () => void;
}) {
  const [statusMap, setStatusMap] = useState<Record<string, { status: string; plusOnes: number }>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, RsvpSaveStatus>>({});
  const [rsvpSaveStatus, setRsvpSaveStatus] = useState<Record<string, RsvpSaveStatus>>({});
  const [submitted, setSubmitted] = useState(false);

  // Event-scoped questions only render once that event's status is "attending"/"maybe"
  // (RsvpPageBody's `showQuestions` gate) — correct for a real guest, since asking about
  // song requests for an event they haven't accepted doesn't make sense. But a brand new
  // preview starts every event at "pending" (no real guest behind it), so any
  // event-scoped question was invisible until the couple manually clicked Accept on that
  // exact event card first — with no indication that's why it was missing. Defaulting
  // every event to "attending" here makes the preview show everything by default, the
  // same way the global "Help us plan" section already does unconditionally, while still
  // leaving status toggleable to check decline/maybe behavior if wanted.
  useEffect(() => {
    setStatusMap((prev) => {
      let changed = false;
      const next = { ...prev };
      events.forEach((e) => {
        if (!(e.id in next)) { next[e.id] = { status: "attending", plusOnes: 0 }; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [events]);

  const eventRows = buildPreviewEventRows(events, statusMap);
  const questionRows = expandQuestionsForPreview(questions, events);

  const onRespond = (eventId: string, status: string, plusOnes: number) => {
    setStatusMap((prev) => ({ ...prev, [eventId]: { status, plusOnes } }));
    setRsvpSaveStatus((prev) => ({ ...prev, [eventId]: "saved" }));
  };
  const onAnswer = (q: RsvpQuestionRow, value: string) => {
    const key = rsvpAnswerKey(q);
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSaveStatus((prev) => ({ ...prev, [key]: "saved" }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-ink text-pearl px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-widest">
          <Eye className="inline h-3.5 w-3.5 mr-2 -mt-0.5" /> Preview. This is what your guests see
        </p>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full border border-pearl/30 px-4 py-1.5 text-sm hover:bg-pearl/10 cursor-pointer">
          <X className="h-3.5 w-3.5" /> Close preview
        </button>
      </div>
      <div className="bg-paper py-14 px-6 min-h-[calc(100vh-48px)]">
        <RsvpPageBody
          partnerA={partnerOne(wedding)} partnerB={partnerTwo(wedding)} guestName="Guest Name"
          attendanceQuestionText={wedding.attendance_question_text || DEFAULT_ATTENDANCE_TEXT}
          allowMaybe={wedding.attendance_allow_maybe ?? false}
          acceptLabel={wedding.attendance_accept_label} declineLabel={wedding.attendance_decline_label} maybeLabel={wedding.attendance_maybe_label}
          rsvpMode={(wedding.rsvp_mode as RsvpMode) ?? "per_event"}
          eventRows={eventRows} questions={questionRows}
          answers={answers} saveStatus={saveStatus} rsvpSaveStatus={rsvpSaveStatus}
          submitted={submitted} submitting={false} submitError={null}
          onRespond={onRespond} onAnswerNow={onAnswer} onAnswerDebounced={onAnswer} onBlurAnswer={() => {}}
          onSubmit={() => setSubmitted(true)} onUnsubmit={() => setSubmitted(false)}
        />
      </div>
    </div>
  );
}

type ResponsesTab = "question" | "guest";

// Bright, saturated pairs for the attending/declined bars and stats — kept
// independent of the app's own muted brand palette (cherry/sage-deep here
// both actually render as blue, which is why the very first version of
// this view read as flat and monochrome despite the icon colors looking
// "set"). A couple can pick whichever pair reads clearest against their
// own wedding colors.
type ResponsesTheme = { name: string; positive: string; negative: string };
const RESPONSES_THEMES: ResponsesTheme[] = [
  { name: "Classic", positive: "#22c55e", negative: "#ef4444" },
  { name: "Ocean", positive: "#3b82f6", negative: "#f97316" },
  { name: "Berry", positive: "#a855f7", negative: "#ec4899" },
  { name: "Meadow", positive: "#10b981", negative: "#f43f5e" },
  { name: "Sunset", positive: "#f59e0b", negative: "#8b5cf6" },
  { name: "Blossom", positive: "#f9a8d4", negative: "#93c5fd" },
  { name: "Mint", positive: "#5eead4", negative: "#fda4af" },
  { name: "Lilac", positive: "#c4b5fd", negative: "#fdba74" },
  { name: "Coral", positive: "#fb923c", negative: "#38bdf8" },
  { name: "Forest", positive: "#16a34a", negative: "#b91c1c" },
];
const RESPONSES_THEME_KEY = "wedthread_rsvp_theme";

function ColorThemePicker({ theme, onChange, custom, onCustomChange }: { theme: ResponsesTheme; onChange: (t: ResponsesTheme) => void; custom: ResponsesTheme; onCustomChange: (t: ResponsesTheme) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-stone cursor-pointer">
        <span className="inline-flex -space-x-1">
          <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: theme.positive }} />
          <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: theme.negative }} />
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-20 w-44 max-h-72 overflow-y-auto rounded-2xl border border-line bg-white shadow-lg p-1.5">
            {RESPONSES_THEMES.map((t) => (
              <button key={t.name} type="button" onClick={() => { onChange(t); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-stone cursor-pointer">
                <span className="inline-flex -space-x-1 shrink-0">
                  <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: t.positive }} />
                  <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: t.negative }} />
                </span>
                <span className="flex-1 text-left">{t.name}</span>
                {t.name === theme.name && <Check className="h-3.5 w-3.5 text-ink shrink-0" />}
              </button>
            ))}
            {/* Custom: pick any two colours (attending / declined) by hex code or colour wheel. */}
            <div className="px-3 py-2 border-t border-line/60 mt-1">
              <p className="flex items-center justify-between text-sm">Custom {theme.name === "Custom" && <Check className="h-3.5 w-3.5 text-ink" />}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <CustomColorButton className="h-4 w-4" value={custom.positive} active title="Attending colour"
                  onChange={(hex) => onCustomChange({ ...custom, positive: hex })} />
                <CustomColorButton className="h-4 w-4" value={custom.negative} active title="Declined colour"
                  onChange={(hex) => onCustomChange({ ...custom, negative: hex })} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// One column per (question, event) pair — same granularity rsvp_responses actually
// keys answers by (see rsvpAnswerKey: question_id + event_id), so a question scoped
// to three events genuinely has up to three independent answers per guest, and this
// shows exactly that rather than collapsing them into one ambiguous cell.
function RsvpResponsesView({ wedding, events, guests, invites, questions, notice, onClose }: {
  wedding: Wedding; events: Event[]; guests: Guest[]; invites: Invite[]; questions: RsvpQuestion[]; notice?: string | null; onClose: () => void;
}) {
  const { data: responses = [], isLoading } = useRsvpResponses(wedding.id);
  const [tab, setTab] = useState<ResponsesTab>("question");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState<ResponsesTheme>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`${RESPONSES_THEME_KEY}_custom`) ?? "null");
      if (raw?.positive && raw?.negative) return { name: "Custom", positive: raw.positive, negative: raw.negative };
    } catch {}
    return { ...RESPONSES_THEMES[0], name: "Custom" };
  });
  const [theme, setTheme] = useState<ResponsesTheme>(() => {
    try {
      const saved = localStorage.getItem(RESPONSES_THEME_KEY);
      if (saved === "Custom") return customTheme;
      return RESPONSES_THEMES.find((t) => t.name === saved) ?? RESPONSES_THEMES[0];
    } catch { return RESPONSES_THEMES[0]; }
  });
  const setThemeAndSave = (t: ResponsesTheme) => {
    setTheme(t);
    try { localStorage.setItem(RESPONSES_THEME_KEY, t.name); } catch {}
  };
  const setCustomAndSave = (t: ResponsesTheme) => {
    setCustomTheme(t);
    try { localStorage.setItem(`${RESPONSES_THEME_KEY}_custom`, JSON.stringify({ positive: t.positive, negative: t.negative })); } catch {}
    setThemeAndSave(t);
  };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => setExpandedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const [guestStatusFilter, setGuestStatusFilter] = useState<"attending" | "declined" | "pending" | null>(null);

  const columns = useMemo(() => {
    const cols: { key: string; questionId: string; eventId: string | null; label: string; sub: string }[] = [];
    questions.forEach((q) => {
      if (!q.event_ids.length) {
        cols.push({ key: `${q.id}:global`, questionId: q.id, eventId: null, label: q.question_text, sub: "All events" });
      } else {
        q.event_ids.forEach((eid) => {
          cols.push({ key: `${q.id}:${eid}`, questionId: q.id, eventId: eid, label: q.question_text, sub: events.find((e) => e.id === eid)?.name ?? "?" });
        });
      }
    });
    return cols;
  }, [questions, events]);

  const answerMap = useMemo(() => {
    const m = new Map<string, string>();
    responses.forEach((r) => m.set(`${r.guest_id}:${r.question_id}:${r.event_id ?? "global"}`, r.answer_text ?? ""));
    return m;
  }, [responses]);

  // Whole-wedding attendance: a guest counts once, same rule guests.tsx and
  // the Events cards already use (accepting even one event → attending;
  // "responded" only once every event they're invited to has a firm
  // answer). Declined computed directly rather than as responded-minus-
  // attending, since a guest who accepted one event but hasn't answered
  // another yet is "attending" without being "responded" — subtraction
  // would silently go wrong there.
  const overall = useMemo(() => summarizeGuestRsvps(guests.map((g) => g.id), invites), [guests, invites]);
  const overallDeclined = useMemo(() => {
    let n = 0;
    for (const g of guests) {
      const relevant = guestInvites(g.id, invites);
      if (relevant.length && isGuestResponded(relevant) && !isGuestAttending(relevant)) n++;
    }
    return n;
  }, [guests, invites]);
  const pctResponded = overall.invited ? Math.round((overall.responded / overall.invited) * 100) : 0;

  // One card per event's own attendance question — this app asks
  // attendance per ceremony (not one single wedding-wide RSVP), so that's
  // the natural unit here rather than forcing a single combined number.
  const perEvent = useMemo(() => events.map((e) => {
    const s = summarizeGuestRsvps(guests.map((g) => g.id), invites, e.id);
    let declined = 0;
    for (const g of guests) {
      const relevant = guestInvites(g.id, invites, e.id);
      if (relevant.length && isGuestResponded(relevant) && !isGuestAttending(relevant)) declined++;
    }
    return { event: e, ...s, declined };
  }), [events, guests, invites]);

  // Per-question breakdown — the guest "pool" a question is measured against
  // is whoever's invited to its event (or every guest, for a wedding-wide
  // question), since asking "how many answered" only makes sense relative to
  // who could have been asked at all.
  const questionStats = useMemo(() => {
    return columns.map((col) => {
      const question = questions.find((q) => q.id === col.questionId)!;
      const pool = col.eventId
        ? guests.filter((g) => invites.some((i) => i.guest_id === g.id && i.event_id === col.eventId))
        : guests;
      const withAnswers = pool
        .map((g) => ({ guest: g, answer: answerMap.get(`${g.id}:${col.questionId}:${col.eventId ?? "global"}`) ?? "" }))
        .filter((x) => x.answer.trim() !== "");
      const hasOptions = (question.question_type === "multiple_choice" || question.question_type === "yes_no") && (question.options?.length ?? 0) > 0;
      const optionCounts = hasOptions
        ? question.options!.map((o) => ({ label: o, count: withAnswers.filter((x) => x.answer === o).length }))
        : null;
      return { col, question, total: pool.length, answered: withAnswers.length, optionCounts, withAnswers };
    });
  }, [columns, questions, guests, invites, answerMap]);

  const filteredQuestionStats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questionStats;
    return questionStats.filter((s) => s.col.label.toLowerCase().includes(q));
  }, [questionStats, search]);

  // One overall status per guest, same rule as everywhere else in this
  // file: any accepted event → attending; every invited event answered but
  // none accepted → declined; anything else → pending.
  const guestStatus = (guestId: string): "attending" | "declined" | "pending" => {
    const relevant = guestInvites(guestId, invites);
    if (!relevant.length) return "pending";
    if (isGuestAttending(relevant)) return "attending";
    if (isGuestResponded(relevant)) return "declined";
    return "pending";
  };

  // Guests grouped by household — a solo guest is its own singleton group —
  // so a family/couple renders as one expandable card, matching how the
  // couple already thinks about their household groups on the Guests page.
  const guestGroups = useMemo(() => {
    const groups = new Map<string, Guest[]>();
    const order: string[] = [];
    for (const g of guests) {
      const key = g.household_group ? `h:${g.household_group}` : `g:${g.id}`;
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key)!.push(g);
    }
    return order.map((key) => ({ key, label: guests.find((g) => g.household_group && `h:${g.household_group}` === key)?.household_group, members: groups.get(key)! }));
  }, [guests]);

  const filteredGuestGroups = useMemo(() => {
    if (!guestStatusFilter) return guestGroups;
    return guestGroups
      .map((g) => ({ ...g, members: g.members.filter((m) => guestStatus(m.id) === guestStatusFilter) }))
      .filter((g) => g.members.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestGroups, guestStatusFilter, invites]);

  const questionIcon = (type: RsvpQuestion["question_type"]) => QUESTION_TYPES.find((t) => t.value === type)?.icon ?? TypeIcon;

  const AVATAR_COLORS = ["#fbcfe8", "#bfdbfe", "#fde68a", "#bbf7d0", "#ddd6fe", "#fecaca"];
  const avatarColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
  };
  const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  // One row per guest — RSVP status per event, then every question's
  // answer — the same information the By-guest cards show, flattened for
  // a spreadsheet.
  const exportResponsesCsv = () => {
    const eventHeaders = events.map((e) => `RSVP: ${e.name}`);
    const questionHeaders = columns.map((c) => `${c.label} (${c.sub})`);
    const fields = ["Guest", "Email", ...eventHeaders, ...questionHeaders];
    const rows = guests.map((g) => {
      const row: Record<string, string> = { Guest: g.full_name, Email: g.email ?? "" };
      events.forEach((e) => {
        const inv = invites.find((i) => i.guest_id === g.id && i.event_id === e.id);
        row[`RSVP: ${e.name}`] = inv ? inv.rsvp_status : "";
      });
      columns.forEach((c) => {
        row[`${c.label} (${c.sub})`] = answerMap.get(`${g.id}:${c.questionId}:${c.eventId ?? "global"}`) ?? "";
      });
      return row;
    });
    const csv = Papa.unparse({ fields, data: rows.map((r) => fields.map((f) => r[f] ?? "")) });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "rsvp-responses.csv"; a.click();
  };

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-white p-0 flex flex-col gap-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 shrink-0">
          <div>
            <h3 className="font-serif text-2xl">Track responses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">How RSVPs and questions are coming along.</p>
          </div>
        </div>
        {notice && <p role="status" className="shrink-0 bg-[#FFF7D6] px-6 py-2.5 text-sm text-ink">{notice}</p>}

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : guests.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No guests yet.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-widest text-muted-foreground">At a glance</p>
                <ColorThemePicker theme={theme} onChange={setThemeAndSave} custom={customTheme} onCustomChange={setCustomAndSave} />
              </div>
              <div className="mt-3 rounded-2xl border border-line p-4">
                <GlancePieChart attending={overall.attending} declined={overallDeclined} pending={overall.pending} theme={theme} />
              </div>

              {(() => {
                const pendingGuests = guests.filter((g) => guestStatus(g.id) === "pending");
                if (pendingGuests.length === 0) return null;
                const names = pendingGuests.slice(0, 4).map((g) => g.full_name);
                return (
                  <div className="mt-3 rounded-2xl border border-line p-5 text-center">
                    <div className="flex justify-center -space-x-2">
                      {pendingGuests.slice(0, 4).map((g) => (
                        <span key={g.id} className="h-9 w-9 rounded-full border-2 border-white grid place-items-center text-xs font-semibold text-ink" style={{ backgroundColor: avatarColor(g.full_name) }}>
                          {initials(g.full_name)}
                        </span>
                      ))}
                      {pendingGuests.length > 4 && (
                        <span className="h-9 w-9 rounded-full border-2 border-white bg-stone grid place-items-center text-xs font-semibold text-muted-foreground">+{pendingGuests.length - 4}</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      {names[0]}{pendingGuests.length > 1 ? ` and ${formatNumber(pendingGuests.length - 1)} other${pendingGuests.length - 1 === 1 ? "" : "s"}` : ""} {pendingGuests.length === 1 ? "hasn't" : "haven't"} RSVP'd yet.
                    </p>
                    <Link to="/messages" search={{ remind: true }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-clay cursor-pointer">
                      <Send className="h-3.5 w-3.5" /> Remind them
                    </Link>
                  </div>
                );
              })()}
              <div className="mt-4">
                <div className="h-2 rounded-full bg-stone overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pctResponded}%`, backgroundColor: theme.positive }} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{pctResponded}% responded</p>
              </div>

              {perEvent.length > 0 && (
                <div className="mt-6 grid gap-3">
                  {perEvent.map(({ event, invited, attending, declined, pending }) => (
                    <div key={event.id} className="rounded-2xl border border-line p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-sans font-semibold">{event.name}</p>
                        <span className="text-xs text-muted-foreground">{formatNumber(invited)} invited</span>
                      </div>
                      {invited > 0 && (
                        <div className="mt-2 h-2 rounded-full bg-stone overflow-hidden flex">
                          <div className="h-full" style={{ width: `${(attending / invited) * 100}%`, backgroundColor: theme.positive }} />
                          <div className="h-full" style={{ width: `${(declined / invited) * 100}%`, backgroundColor: theme.negative }} />
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1" style={{ color: theme.positive }}><CheckCircle2 className="h-3 w-3" /> {formatNumber(attending)}</span>
                        <span className="inline-flex items-center gap-1" style={{ color: theme.negative }}><XCircle className="h-3 w-3" /> {formatNumber(declined)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatNumber(pending)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm uppercase tracking-widest text-muted-foreground">Browse responses</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={exportResponsesCsv}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-stone cursor-pointer">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                  <div className="inline-flex rounded-full border border-line p-0.5">
                    <button type="button" onClick={() => setTab("question")}
                      className={cn("rounded-full px-4 py-1.5 text-sm cursor-pointer transition-colors", tab === "question" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                      By question
                    </button>
                    <button type="button" onClick={() => setTab("guest")}
                      className={cn("rounded-full px-4 py-1.5 text-sm cursor-pointer transition-colors", tab === "guest" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
                      By guest
                    </button>
                  </div>
                </div>
              </div>

              {tab === "question" ? (
                columns.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No questions yet. Add one to start collecting responses.</p>
                ) : (
                  <>
                    <div className="relative mt-3">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions"
                        className="w-full rounded-full border border-line bg-paper pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                    </div>
                    <div className="mt-3 grid gap-3">
                      {filteredQuestionStats.map(({ col, total, answered, optionCounts, withAnswers }) => (
                        <div key={col.key} className="rounded-2xl border border-line p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-sans font-semibold">{col.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{col.sub}</p>
                            </div>
                            <span className="shrink-0 text-xs rounded-full bg-stone px-2.5 py-1 whitespace-nowrap">{formatNumber(answered)}/{formatNumber(total)} responded</span>
                          </div>

                          {optionCounts ? (
                            <div className="mt-3 grid gap-2">
                              {optionCounts.map((o) => (
                                <div key={o.label}>
                                  <div className="flex items-center justify-between text-sm">
                                    <span>{o.label}</span>
                                    <span className="text-muted-foreground">{formatNumber(o.count)}</span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-stone overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${answered ? (o.count / answered) * 100 : 0}%`, backgroundColor: theme.positive }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3">
                              <div className="h-1.5 rounded-full bg-stone overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${total ? (answered / total) * 100 : 0}%`, backgroundColor: theme.positive }} />
                              </div>
                            </div>
                          )}

                          {withAnswers.length > 0 && (
                            <button type="button" onClick={() => setExpanded(expanded === col.key ? null : col.key)}
                              className="mt-3 inline-flex items-center gap-1 text-sm text-clay hover:underline cursor-pointer">
                              {expanded === col.key ? "Hide" : "View"} {formatNumber(withAnswers.length)} response{withAnswers.length === 1 ? "" : "s"}
                              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded === col.key && "rotate-90")} />
                            </button>
                          )}
                          {expanded === col.key && (
                            <div className="mt-2 grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {withAnswers.map(({ guest, answer }) => (
                                <div key={guest.id} className="flex items-start justify-between gap-3 text-sm rounded-xl bg-stone/50 px-3 py-2">
                                  <span className="font-medium shrink-0">{guest.full_name}</span>
                                  <span className="text-muted-foreground text-right">{answer}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {(["attending", "declined", "pending"] as const).map((s) => {
                      const count = guests.filter((g) => guestStatus(g.id) === s).length;
                      const active = guestStatusFilter === s;
                      const color = s === "attending" ? theme.positive : s === "declined" ? theme.negative : "#6b7280";
                      const Icon = s === "attending" ? CheckCircle2 : s === "declined" ? XCircle : Clock;
                      return (
                        <button key={s} type="button" onClick={() => setGuestStatusFilter(active ? null : s)}
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors"
                          style={active ? { backgroundColor: color, borderColor: color, color: "#fff" } : { borderColor: "var(--line)" }}>
                          <Icon className="h-3.5 w-3.5" style={active ? undefined : { color }} />
                          {s === "attending" ? "Attending" : s === "declined" ? "Declined" : "Awaiting"} ({formatNumber(count)})
                        </button>
                      );
                    })}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatNumber(filteredGuestGroups.length)} group{filteredGuestGroups.length === 1 ? "" : "s"} · {formatNumber(filteredGuestGroups.reduce((n, g) => n + g.members.length, 0))} guests
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {filteredGuestGroups.map((group) => {
                      const groupOpen = expandedGroups.has(group.key);
                      const groupStatuses = group.members.map((m) => guestStatus(m.id));
                      const groupOverall: "attending" | "declined" | "pending" = groupStatuses.includes("attending") ? "attending" : groupStatuses.every((s) => s === "declined") ? "declined" : "pending";
                      const groupColor = groupOverall === "attending" ? theme.positive : groupOverall === "declined" ? theme.negative : "#6b7280";
                      const GroupIcon = groupOverall === "attending" ? CheckCircle2 : groupOverall === "declined" ? XCircle : Clock;
                      const groupLabel = group.label || group.members.map((m) => m.full_name.split(" ")[0]).join(" & ");
                      return (
                        <div key={group.key} className="rounded-2xl border border-line overflow-hidden">
                          <button type="button" onClick={() => toggleGroup(group.key)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone/40 transition-colors cursor-pointer">
                            <span className="flex -space-x-2 shrink-0">
                              {group.members.slice(0, 4).map((m) => (
                                <span key={m.id} className="h-7 w-7 rounded-full border-2 border-white grid place-items-center text-[10px] font-semibold text-ink" style={{ backgroundColor: avatarColor(m.full_name) }}>
                                  {initials(m.full_name)}
                                </span>
                              ))}
                            </span>
                            <span className="font-semibold text-left flex-1 min-w-0 truncate">{groupLabel}</span>
                            <span className="shrink-0 grid h-7 w-7 place-items-center rounded-full" style={{ backgroundColor: `${groupColor}26` }}>
                              <GroupIcon className="h-4 w-4" style={{ color: groupColor }} />
                            </span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", groupOpen && "rotate-180")} />
                          </button>

                          {groupOpen && (
                            <div className="border-t border-line divide-y divide-line">
                              {group.members.map((m) => {
                                const status = guestStatus(m.id);
                                const color = status === "attending" ? theme.positive : status === "declined" ? theme.negative : "#6b7280";
                                const StatusIcon = status === "attending" ? CheckCircle2 : status === "declined" ? XCircle : Clock;
                                const memberInvites = invites.filter((i) => i.guest_id === m.id);
                                return (
                                  <div key={m.id} className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <span className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[10px] font-semibold text-ink" style={{ backgroundColor: avatarColor(m.full_name) }}>
                                        {initials(m.full_name)}
                                      </span>
                                      <span className="font-medium flex-1 min-w-0 truncate">{m.full_name}</span>
                                      <StatusIcon className="h-4 w-4 shrink-0" style={{ color }} />
                                    </div>

                                    <div className="mt-2.5 grid gap-2">
                                      {memberInvites.map((inv) => {
                                        const ev = events.find((e) => e.id === inv.event_id);
                                        const ivColor = inv.rsvp_status === "attending" ? theme.positive : inv.rsvp_status === "declined" ? theme.negative : "#6b7280";
                                        return (
                                          <div key={inv.id} className="flex items-center gap-2.5 text-sm">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone"><Users className="h-3 w-3 text-muted-foreground" /></span>
                                            <span className="text-muted-foreground flex-1 min-w-0 truncate">RSVP: {ev?.name ?? "?"}</span>
                                            <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${ivColor}1a`, color: ivColor }}>
                                              {rsvpStatusLabel(inv.rsvp_status, wedding)}
                                            </span>
                                          </div>
                                        );
                                      })}

                                      {columns
                                        .filter((c) => !c.eventId || memberInvites.some((i) => i.event_id === c.eventId))
                                        .map((c) => {
                                          const question = questions.find((q) => q.id === c.questionId)!;
                                          const QIcon = questionIcon(question.question_type);
                                          const answer = answerMap.get(`${m.id}:${c.questionId}:${c.eventId ?? "global"}`);
                                          return (
                                            <div key={c.key} className="flex items-start gap-2.5 text-sm">
                                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone"><QIcon className="h-3 w-3 text-muted-foreground" /></span>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-muted-foreground">Custom: {c.label}</p>
                                                <p className={cn(answer ? "text-ink" : "text-muted-foreground italic")}>{answer || "No response"}</p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function GlancePieChart({ attending, declined, pending, theme }: {
  attending: number; declined: number; pending: number; theme: ResponsesTheme;
}) {
  const total = attending + declined + pending;
  const r = 52, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
  const segments = [
    { value: attending, color: theme.positive },
    { value: declined, color: theme.negative },
    { value: pending, color: "#d1d5db" },
  ];
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="20" />
          ) : segments.map((s, i) => {
            if (s.value === 0) return null;
            const dash = (s.value / total) * circumference;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="20"
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-cumulative} />
            );
            cumulative += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-serif text-2xl">{formatNumber(total)}</p>
            <p className="text-xs text-muted-foreground">Guests</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2.5 flex-1 min-w-[160px]">
        <LegendRow color={theme.positive} label="Attending" value={attending} />
        <LegendRow color={theme.negative} label="Declined" value={declined} />
        <LegendRow color="#9ca3af" label="Awaiting response" value={pending} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-medium">{formatNumber(value)}</span>
    </div>
  );
}

function QuestionRow({ question, events, onEdit, onDelete }: {
  question: RsvpQuestion; events: Event[]; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.question_type) ?? QUESTION_TYPES[2];
  const Icon = typeInfo.icon;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="bg-paper rounded-md p-4 flex items-center gap-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.03)]">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-ink shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-lg font-semibold truncate">{question.question_text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground">{typeInfo.label}</span>
          <span className="text-[10px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink">{eventLabel(question.event_ids, events)}</span>
          {question.is_required && <span className="text-[10px] uppercase tracking-widest rounded-full bg-cherry/15 px-2 py-0.5 text-cherry">Required</span>}
          {question.depends_on_question_id && <span className="text-[10px] uppercase tracking-widest rounded-full bg-blush-soft px-2 py-0.5 text-ink">Conditional</span>}
          {question.guest_column_label && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest rounded-full bg-ink px-2 py-0.5 text-paper">
              <Columns3 className="h-2.5 w-2.5" /> Column: {question.guest_column_label}
            </span>
          )}
        </div>
      </div>
      <button onClick={onEdit} className="text-sm rounded-full border border-line px-3 py-1.5 hover:bg-stone cursor-pointer shrink-0">Edit</button>
      <button onClick={onDelete} className="text-muted-foreground hover:text-cherry p-1 shrink-0 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function QuestionDialog({ question, events, questions, onClose, onSave }: {
  question: Partial<RsvpQuestion>; events: Event[]; questions: RsvpQuestion[];
  onClose: () => void; onSave: (q: Partial<RsvpQuestion>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<RsvpQuestion>>({
    question_type: "short_text", is_required: false, event_ids: [],
    depends_on_question_id: null, depends_on_value: "",
    ...question,
  });
  const [optionInputs, setOptionInputs] = useState<string[]>(form.options?.length ? form.options : ["", ""]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const otherQuestions = questions.filter((q) => q.id !== question.id);
  const dependsOnQuestion = otherQuestions.find((q) => q.id === form.depends_on_question_id);

  const validate = (next: Partial<RsvpQuestion>, opts: string[]) => {
    const e: Record<string, string> = {};
    if (!next.question_text || !next.question_text.trim()) e.question_text = "Please enter a question.";
    if ((next.question_type === "multiple_choice" || next.question_type === "yes_no") && opts.filter((o) => o.trim()).length < 2) {
      e.options = "Add at least two options.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setField = <K extends keyof RsvpQuestion>(key: K, value: RsvpQuestion[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    validate(next, optionInputs);
  };

  // Switching to Single choice seeds "Yes"/"No" as a starting point (still fully
  // editable, unlike the old hardcoded yes/no) rather than dropping the couple into
  // two blank option fields — only when there's nothing worth keeping already.
  const setQuestionType = (type: QuestionType) => {
    const next = { ...form, question_type: type };
    setForm(next);
    if (type === "yes_no" && optionInputs.every((o) => !o.trim())) {
      setOptionInputs(["Yes", "No"]);
      validate(next, ["Yes", "No"]);
    } else {
      validate(next, optionInputs);
    }
  };

  const setDependsOn = (id: string) => {
    setForm((f) => ({ ...f, depends_on_question_id: id || null, depends_on_value: id ? f.depends_on_value : "" }));
  };

  const toggleEvent = (id: string) => {
    setForm((f) => {
      const current = (f.event_ids?.length ?? 0) === 0 ? events.map((e) => e.id) : (f.event_ids as string[]);
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      if (next.length === 0) return f; // always asked for at least one event
      return { ...f, event_ids: next.length === events.length ? [] : next };
    });
  };

  const setOption = (i: number, value: string) => {
    const next = optionInputs.map((o, idx) => (idx === i ? value : o));
    setOptionInputs(next);
    validate(form, next);
  };
  const addOption = () => setOptionInputs((prev) => [...prev, ""]);
  const removeOption = (i: number) => {
    const next = optionInputs.filter((_, idx) => idx !== i);
    setOptionInputs(next);
    validate(form, next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ question_text: true, options: true });
    if (!validate(form, optionInputs)) return;
    setSaving(true);
    await onSave({ ...form, options: optionInputs });
    setSaving(false);
  };

  const applyTemplate = (t: QuickAddTemplate) => {
    const opts = t.options ?? ["", ""];
    const next = { ...form, question_text: t.label, question_type: t.questionType };
    setForm(next);
    setOptionInputs(opts);
    validate(next, opts);
  };

  const pillOff = "bg-pearl text-ink border-line/70 hover:bg-blush-soft/50";

  // Which events this question is asked for. No events chosen means all of them. Every event shows as ticked by
  // default, the same chip style as "What does this event need?" on the event sheet, and untick one to leave it out.
  const effectiveEventIds = (form.event_ids?.length ?? 0) === 0 ? events.map((e) => e.id) : (form.event_ids as string[]);
  const allEventsOn = (form.event_ids?.length ?? 0) === 0;
  const chip = (on: boolean) => cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors cursor-pointer",
    on ? "border border-solid border-ink bg-ink text-paper font-medium" : "border border-dashed border-ink/40 bg-transparent text-muted-foreground hover:border-ink/70 hover:text-ink");

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="warm-wash rounded-[32px] max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-line/70" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl">{question.id ? "Edit question" : "Add question"}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form noValidate onSubmit={submit} className="mt-6 space-y-4">
          {!question.id && (
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Quick add</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_ADD_TEMPLATES.map((t, i) => (
                  <button key={i} type="button" onClick={() => applyTemplate(t)}
                    className="rounded-full border border-line/70 bg-pearl px-3 py-1.5 text-xs hover:bg-blush-soft/50 cursor-pointer text-left">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Question <span className="text-cherry">*</span></span>
            <textarea rows={2} value={form.question_text ?? ""} onChange={(e) => setField("question_text", e.target.value)}
              placeholder="e.g. Any dietary restrictions we should know about?"
              className={cn(
                "mt-1 w-full rounded-lg border border-line/70 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage-deep bg-pearl transition-colors",
                touched.question_text && errors.question_text && "border-cherry focus:ring-cherry",
              )} />
            {touched.question_text && errors.question_text && (
              <p className="mt-1.5 text-xs text-cherry flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-cherry" />{errors.question_text}</p>
            )}
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Answer type</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUESTION_TYPES.map((t) => {
                const on = form.question_type === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => setQuestionType(t.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                      on ? "bg-sage-deep text-pearl border-sage-deep" : pillOff,
                    )}>
                    <t.icon className="h-3.5 w-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(form.question_type === "multiple_choice" || form.question_type === "yes_no") && (
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Options</span>
              <div className="mt-2 space-y-2">
                {optionInputs.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-2xl border border-line/70 px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sage-deep bg-pearl" />
                    {optionInputs.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-cherry p-1 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addOption} className="mt-2 text-xs text-sage-deep hover:underline cursor-pointer">+ Add option</button>
              {touched.options && errors.options && (
                <p className="mt-1.5 text-xs text-cherry flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-cherry" />{errors.options}</p>
              )}
            </div>
          )}

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Asked for</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {events.length > 1 && (
                <button type="button" role="checkbox" aria-checked={allEventsOn} onClick={() => setField("event_ids", [])} className={chip(allEventsOn)}>
                  {allEventsOn ? <Check className="h-3 w-3" /> : null} All events
                </button>
              )}
              {events.map((ev) => {
                const on = effectiveEventIds.includes(ev.id);
                return (
                  <button key={ev.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggleEvent(ev.id)} className={chip(on)}>
                    {on ? <Check className="h-3 w-3" /> : null} {ev.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Guests column (optional)</span>
            <input value={form.guest_column_label ?? ""} onChange={(e) => setField("guest_column_label", e.target.value)}
              placeholder="e.g. Starter"
              className="mt-1 w-full rounded-2xl border border-line/70 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage-deep bg-pearl transition-colors" />
            <p className="mt-1.5 text-xs text-muted-foreground">Each guest's answer shows as this column in Guests.</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Response</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setField("is_required", false)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                  !form.is_required ? "bg-sage-deep text-pearl border-sage-deep" : pillOff,
                )}>
                Optional
              </button>
              <button type="button" onClick={() => setField("is_required", true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                  form.is_required ? "bg-sage-deep text-pearl border-sage-deep" : pillOff,
                )}>
                Required
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-sage/40 bg-sage-soft/40 p-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Show only if… (optional)</span>
            <DependsOnPicker
              value={form.depends_on_question_id ?? ""}
              onChange={setDependsOn}
              options={otherQuestions.map((q) => ({ value: q.id, label: q.question_text }))}
            />

            {dependsOnQuestion && (
              <div className="mt-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">…was answered</span>
                {dependsOnQuestion.question_type === "yes_no" || dependsOnQuestion.question_type === "multiple_choice" ? (
                  <select value={form.depends_on_value ?? ""} onChange={(e) => setField("depends_on_value", e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line/70 px-4 py-3 text-xs bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep">
                    <option value="">Select…</option>
                    {(dependsOnQuestion.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={form.depends_on_value ?? ""} onChange={(e) => setField("depends_on_value", e.target.value)}
                    placeholder="Expected answer"
                    className="mt-1 w-full rounded-2xl border border-line/70 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage-deep bg-pearl" />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-xs border border-line/70 hover:bg-stone cursor-pointer bg-pearl">Cancel</button>
            <button disabled={saving} className="rounded-full bg-ink text-paper px-6 py-2 text-xs hover:bg-clay disabled:opacity-60 cursor-pointer">{saving ? "Saving…" : "Save question"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DependsOnPicker({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);

  return (
    <div className="relative mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-pearl pl-4 pr-3 py-3 text-xs text-left focus:outline-none focus:ring-2 focus:ring-sage-deep cursor-pointer">
        <span className={cn("truncate", !active && "text-muted-foreground")}>
          {active ? (active.label.length > 60 ? `${active.label.slice(0, 60)}…` : active.label) : "No condition, always show"}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-2 z-20 max-h-56 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-blush-soft cursor-pointer", !value && "font-medium")}>
              No condition, always show
            </button>
            {options.map((o) => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2", value === o.value && "font-medium")}>
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check className="h-3.5 w-3.5 text-sage-deep shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
