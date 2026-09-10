import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useEvents, useGuests, useRsvpQuestions, useRsvpResponses, type RsvpQuestion, type Event, type Guest, type Wedding } from "@/lib/wedding-hooks";
import { ShareRsvpDialog } from "@/components/share-rsvp-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X, GripVertical, CheckCircle2, ListFilter, Type as TypeIcon, Sparkles, ChevronDown, Check, Lock, Eye, Share2, Table2, Columns3 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatNumber } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RsvpPageBody, rsvpAnswerKey, DEFAULT_ATTENDANCE_TEXT, DEFAULT_ACCEPT_LABEL, DEFAULT_DECLINE_LABEL, DEFAULT_MAYBE_LABEL, type RsvpEventRow, type RsvpQuestionRow, type RsvpSaveStatus } from "@/components/rsvp-form";

export const Route = createFileRoute("/_authenticated/rsvp-questions")({ component: RsvpQuestionsPage });

type QuestionType = RsvpQuestion["question_type"];

const QUESTION_TYPES: { value: QuestionType; label: string; icon: any }[] = [
  { value: "yes_no", label: "Single choice", icon: CheckCircle2 },
  { value: "multiple_choice", label: "Multiple choice", icon: ListFilter },
  { value: "short_text", label: "Short text", icon: TypeIcon },
];

type QuickAddTemplate = { label: string; questionType: QuestionType; options?: string[] };

const QUICK_ADD_TEMPLATES: QuickAddTemplate[] = [
  { label: "Do you have any dietary restrictions we should know about?", questionType: "short_text" },
  { label: "Which meal would you prefer?", questionType: "multiple_choice", options: ["Vegetarian", "Non-vegetarian", "Vegan"] },
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
  const { data: guests = [] } = useGuests(wedding?.id);
  const { data: questions = [], isLoading } = useRsvpQuestions(wedding?.id);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<RsvpQuestion> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const updateAttendanceSettings = async (patch: Partial<Pick<Wedding, "attendance_question_text" | "attendance_allow_maybe" | "attendance_accept_label" | "attendance_decline_label" | "attendance_maybe_label">>) => {
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
            <Table2 className="h-4 w-4" /> See responses
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
      {wedding && <AttendanceSettingsCard wedding={wedding} onUpdate={updateAttendanceSettings} />}

      {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> :
        questions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-16 text-center bg-paper">
            <p className="font-serif text-2xl">No questions yet</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Meal choices, song requests, plus-one names, whatever helps you plan. Questions can apply to one ceremony, several, or all of them.
            </p>
            <button onClick={() => setEditing({})} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
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
        <RsvpResponsesView wedding={wedding} events={events} guests={guests} questions={questions} onClose={() => setResponsesOpen(false)} />
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
  wedding: Wedding; onUpdate: (patch: Partial<Pick<Wedding, "attendance_question_text" | "attendance_allow_maybe" | "attendance_accept_label" | "attendance_decline_label" | "attendance_maybe_label">>) => void;
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

  return (
    <div className="bg-paper rounded-md p-4 flex items-start gap-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.03)] mb-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep">
        <Lock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-lg font-semibold">Attendance question</p>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically asked for every event a guest is invited to, plus how many they're bringing. It's always included, not something you add below, but you can customize the wording.
        </p>
        <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commitText}
          placeholder={DEFAULT_ATTENDANCE_TEXT}
          className="mt-3 w-full rounded-lg border border-line/70 px-4 py-2.5 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors" />
        <p className="mt-1.5 text-sm text-muted-foreground">Use <code className="px-1 rounded bg-stone">{"{event}"}</code> to insert the event's name.</p>
        <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={wedding.attendance_allow_maybe}
            onChange={(e) => onUpdate({ attendance_allow_maybe: e.target.checked })}
            className="h-3.5 w-3.5 accent-sage-deep cursor-pointer" />
          Also show a "Maybe" option (Accept / Decline only by default)
        </label>

        <div className="mt-4 pt-4 border-t border-line/60">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Button labels</p>
          <div className={cn("mt-2 grid gap-3", wedding.attendance_allow_maybe ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            <label className="block">
              <span className="text-sm text-muted-foreground">Accept</span>
              <input value={acceptLabel} onChange={(e) => setAcceptLabel(e.target.value)} onBlur={commitAcceptLabel}
                placeholder={DEFAULT_ACCEPT_LABEL}
                className="mt-1 w-full rounded-lg border border-line/70 px-3 py-2 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors" />
            </label>
            {wedding.attendance_allow_maybe && (
              <label className="block">
                <span className="text-sm text-muted-foreground">Maybe</span>
                <input value={maybeLabel} onChange={(e) => setMaybeLabel(e.target.value)} onBlur={commitMaybeLabel}
                  placeholder={DEFAULT_MAYBE_LABEL}
                  className="mt-1 w-full rounded-lg border border-line/70 px-3 py-2 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors" />
              </label>
            )}
            <label className="block">
              <span className="text-sm text-muted-foreground">Decline</span>
              <input value={declineLabel} onChange={(e) => setDeclineLabel(e.target.value)} onBlur={commitDeclineLabel}
                placeholder={DEFAULT_DECLINE_LABEL}
                className="mt-1 w-full rounded-lg border border-line/70 px-3 py-2 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors" />
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink">Every event</span>
          <span className="text-[10px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground">Built-in</span>
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
          <Eye className="inline h-3.5 w-3.5 mr-2 -mt-0.5" /> Preview — this is what your guests see
        </p>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full border border-pearl/30 px-4 py-1.5 text-sm hover:bg-pearl/10 cursor-pointer">
          <X className="h-3.5 w-3.5" /> Close preview
        </button>
      </div>
      <div className="bg-paper py-14 px-6 min-h-[calc(100vh-48px)]">
        <RsvpPageBody
          partnerA={wedding.partner_a} partnerB={wedding.partner_b} guestName="Guest Name"
          attendanceQuestionText={wedding.attendance_question_text || DEFAULT_ATTENDANCE_TEXT}
          allowMaybe={wedding.attendance_allow_maybe ?? false}
          acceptLabel={wedding.attendance_accept_label} declineLabel={wedding.attendance_decline_label} maybeLabel={wedding.attendance_maybe_label}
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

// One column per (question, event) pair — same granularity rsvp_responses actually
// keys answers by (see rsvpAnswerKey: question_id + event_id), so a question scoped
// to three events genuinely has up to three independent answers per guest, and this
// shows exactly that rather than collapsing them into one ambiguous cell.
function RsvpResponsesView({ wedding, events, guests, questions, onClose }: {
  wedding: Wedding; events: Event[]; guests: Guest[]; questions: RsvpQuestion[]; onClose: () => void;
}) {
  const { data: responses = [], isLoading } = useRsvpResponses(wedding.id);

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

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-[32px] w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl border border-line/70" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 shrink-0">
          <div>
            <h3 className="font-serif text-2xl">Responses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Exactly what each guest submitted, one column per question.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : guests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No guests yet.</p>
          ) : columns.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No questions yet — add one to start collecting responses.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-sage-soft text-left text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap uppercase tracking-widest">Guest</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 whitespace-nowrap align-top">
                      <p className="font-sans text-ink normal-case">{c.label}</p>
                      <p className="mt-0.5 uppercase tracking-widest">{c.sub}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{g.full_name}</td>
                    {columns.map((c) => {
                      const answer = answerMap.get(`${g.id}:${c.questionId}:${c.eventId ?? "global"}`);
                      return (
                        <td key={c.key} className="px-4 py-3 whitespace-nowrap">
                          {answer ? answer : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-soft text-clay">
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
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest rounded-full bg-clay-soft px-2 py-0.5 text-clay">
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
      const ids = f.event_ids ?? [];
      return { ...f, event_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
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

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="warm-wash rounded-[32px] max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-line/70" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-soft text-sage-deep"><Sparkles className="h-3.5 w-3.5" /></span>
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
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Applies to</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setField("event_ids", [])}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                  (form.event_ids?.length ?? 0) === 0 ? "bg-sage-deep text-pearl border-sage-deep" : pillOff,
                )}>
                All events
              </button>
              {events.map((ev) => {
                const on = (form.event_ids ?? []).includes(ev.id);
                return (
                  <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                      on ? "bg-sage-deep text-pearl border-sage-deep" : pillOff,
                    )}>
                    {ev.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Pick one or more ceremonies, or leave on "All events."</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Custom column (optional)</span>
            <input value={form.guest_column_label ?? ""} onChange={(e) => setField("guest_column_label", e.target.value)}
              placeholder="e.g. Starter"
              className="mt-1 w-full rounded-2xl border border-line/70 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage-deep bg-pearl transition-colors" />
            <p className="mt-1.5 text-xs text-muted-foreground">Name it and each guest's answer shows up as its own column in Guests, right alongside phone and email. Leave blank to keep this question answer-log only.</p>
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
