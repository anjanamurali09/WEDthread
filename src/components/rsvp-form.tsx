import { useMemo, useState } from "react";
import { Sparkles, Check, X as XIcon, HelpCircle, MapPin, CalendarDays, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export type RsvpEventRow = {
  event_id: string; event_name: string; event_date: string | null; event_time: string | null;
  venue_name: string | null; city: string | null;
  current_status: string; current_plus_ones: number;
};

export type RsvpQuestionType = "yes_no" | "multiple_choice" | "short_text";

export type RsvpQuestionRow = {
  question_id: string; question_text: string; question_type: RsvpQuestionType;
  options: string[]; is_required: boolean; sort_order: number;
  event_id: string | null; event_name: string | null;
  depends_on_question_id: string | null; depends_on_value: string | null;
  existing_answer: string | null;
};

export type RsvpSaveStatus = "idle" | "typing" | "saving" | "saved" | "error";

export const rsvpAnswerKey = (q: RsvpQuestionRow) => `${q.question_id}:${q.event_id ?? "global"}`;

export const DEFAULT_ATTENDANCE_TEXT = "Will you be attending {event}?";
export const DEFAULT_ACCEPT_LABEL = "Joyfully accept";
export const DEFAULT_DECLINE_LABEL = "Regretfully decline";
export const DEFAULT_MAYBE_LABEL = "Maybe";

const renderAttendanceText = (template: string, eventName: string) => template.replaceAll("{event}", eventName);

export function RsvpPageBody({
  partnerA, partnerB, guestName,
  eventRows, questions,
  attendanceQuestionText, allowMaybe,
  acceptLabel = DEFAULT_ACCEPT_LABEL, declineLabel = DEFAULT_DECLINE_LABEL, maybeLabel = DEFAULT_MAYBE_LABEL,
  answers, saveStatus, rsvpSaveStatus,
  submitted, submitting, submitError,
  onRespond, onAnswerNow, onAnswerDebounced, onBlurAnswer, onSubmit, onUnsubmit,
}: {
  partnerA: string; partnerB: string; guestName: string;
  eventRows: RsvpEventRow[]; questions: RsvpQuestionRow[];
  attendanceQuestionText: string; allowMaybe: boolean;
  acceptLabel?: string; declineLabel?: string; maybeLabel?: string;
  answers: Record<string, string>; saveStatus: Record<string, RsvpSaveStatus>; rsvpSaveStatus: Record<string, RsvpSaveStatus>;
  submitted: boolean; submitting: boolean; submitError?: string | null;
  onRespond: (eventId: string, status: string, plusOnes: number) => void;
  onAnswerNow: (q: RsvpQuestionRow, value: string) => void;
  onAnswerDebounced: (q: RsvpQuestionRow, value: string) => void;
  onBlurAnswer: (q: RsvpQuestionRow) => void;
  onSubmit: () => void;
  onUnsubmit: () => void;
}) {
  // Most recently given answer per question, regardless of which event
  // instance it came from — used to evaluate depends_on_question_id, which
  // references a question, not a specific per-event instance of it.
  const answerByQuestionId = useMemo(() => {
    const m: Record<string, string> = {};
    questions.forEach((q) => {
      const val = answers[rsvpAnswerKey(q)];
      if (val) m[q.question_id] = val;
    });
    return m;
  }, [answers, questions]);

  const isVisible = (q: RsvpQuestionRow) => {
    if (!q.depends_on_question_id) return true;
    return answerByQuestionId[q.depends_on_question_id] === q.depends_on_value;
  };

  const globalQuestions = questions.filter((q) => q.event_id === null && isVisible(q));
  const hasRequiredQuestion = questions.some((q) => q.is_required && isVisible(q));

  const isAnswered = (q: RsvpQuestionRow) => (answers[rsvpAnswerKey(q)] ?? "").trim() !== "";
  const allRequiredAnswered = (qs: RsvpQuestionRow[]) => qs.every((q) => !q.is_required || isAnswered(q));

  // Ready to submit once the guest has responded to every event they're
  // invited to (accept/maybe/decline all count — declining is a valid
  // response) and answered every required question that's actually visible
  // to them right now (skips questions under a declined event, or hidden by
  // a depends_on condition that hasn't been met).
  const allEventsResponded = eventRows.every((r) => r.current_status !== "pending");
  const allEventQuestionsAnswered = eventRows.every((r) => {
    if (r.current_status !== "attending" && r.current_status !== "maybe") return true;
    return allRequiredAnswered(questions.filter((q) => q.event_id === r.event_id && isVisible(q)));
  });
  const hasAnythingToDo = eventRows.length > 0 || globalQuestions.length > 0;
  const readyToSubmit = allEventsResponded && allEventQuestionsAnswered && allRequiredAnswered(globalQuestions);

  const toggleStatus = (r: RsvpEventRow, status: string, plusOnes: number) =>
    onRespond(r.event_id, r.current_status === status ? "pending" : status, r.current_status === status ? 0 : plusOnes);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 justify-center mb-8">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-3.5 w-3.5" /></span>
        <Logo sizeClassName="text-xl" />
      </div>
      <p className="text-center text-sm uppercase tracking-[0.25em] text-clay">You are invited to celebrate</p>
      <h1 className="mt-4 text-center font-serif text-4xl md:text-6xl leading-tight">{partnerA} <span className="text-clay">&</span> {partnerB}</h1>
      <p className="mt-4 text-center text-muted-foreground">
        Dear <span className="text-ink">{guestName}</span>, {eventRows.length > 0 ? "please respond to each event below." : "we're finalizing your invitation details."}
      </p>
      {hasRequiredQuestion && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <span className="text-cherry">*</span> Required — everything else is optional
        </p>
      )}

      {eventRows.length === 0 ? (
        <div className="mt-10 warm-wash rounded-[28px] border border-line/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">No events are assigned to you yet. Check back soon, or reach out to the couple if you think this is a mistake.</p>
        </div>
      ) : (
      <div className="mt-10 space-y-4">
        {eventRows.map((r) => {
          const eventQuestions = questions.filter((q) => q.event_id === r.event_id && isVisible(q));
          const showQuestions = r.current_status === "attending" || r.current_status === "maybe";
          return (
            <div key={r.event_id} className="warm-wash rounded-[28px] border border-line/60 p-6">
              <p className="text-[10px] uppercase tracking-widest text-clay">Event</p>
              <h3 className="font-serif text-2xl mt-1">{r.event_name}</h3>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {r.event_date ? new Date(r.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                {r.event_time ? ` · ${r.event_time.slice(0,5)}` : ""}
              </p>
              {(r.venue_name || r.city) && <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {[r.venue_name, r.city].filter(Boolean).join(" · ")}</p>}

              <p className="mt-5 text-sm text-ink">{renderAttendanceText(attendanceQuestionText, r.event_name)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RsvpBtn active={r.current_status === "attending"} activeClass="bg-sage-deep text-pearl border-sage-deep"
                  disabled={submitted} onClick={() => toggleStatus(r, "attending", r.current_plus_ones)} icon={Check} label={acceptLabel} />
                {allowMaybe && (
                  <RsvpBtn active={r.current_status === "maybe"} activeClass="bg-ink text-paper border-ink"
                    disabled={submitted} onClick={() => toggleStatus(r, "maybe", 0)} icon={HelpCircle} label={maybeLabel} />
                )}
                <RsvpBtn active={r.current_status === "declined"} activeClass="bg-cherry text-pearl border-cherry"
                  disabled={submitted} onClick={() => toggleStatus(r, "declined", 0)} icon={XIcon} label={declineLabel} />
                <SaveIndicator status={rsvpSaveStatus[r.event_id] ?? "idle"} />
              </div>

              {r.current_status === "attending" && (
                <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                  Bringing:
                  <PlusOnesPicker value={r.current_plus_ones} disabled={submitted} onChange={(n) => onRespond(r.event_id, "attending", n)} />
                </div>
              )}

              {showQuestions && eventQuestions.length > 0 && (
                <div className="mt-6 pt-5 border-t border-line/60 space-y-5">
                  {eventQuestions.map((q) => (
                    <RsvpQuestionField key={rsvpAnswerKey(q)} question={q}
                      value={answers[rsvpAnswerKey(q)]}
                      status={saveStatus[rsvpAnswerKey(q)] ?? "idle"}
                      disabled={submitted}
                      onAnswerNow={(v) => onAnswerNow(q, v)}
                      onAnswerDebounced={(v) => onAnswerDebounced(q, v)}
                      onBlur={() => onBlurAnswer(q)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {globalQuestions.length > 0 && (
        <div className="warm-wash rounded-[28px] border border-line/60 p-6 mt-4">
          <p className="text-[10px] uppercase tracking-widest text-clay">A few more things</p>
          <h3 className="font-serif text-2xl mt-1">Help us plan</h3>
          <div className="mt-5 space-y-5">
            {globalQuestions.map((q) => (
              <RsvpQuestionField key={rsvpAnswerKey(q)} question={q}
                value={answers[rsvpAnswerKey(q)]}
                status={saveStatus[rsvpAnswerKey(q)] ?? "idle"}
                disabled={submitted}
                onAnswerNow={(v) => onAnswerNow(q, v)}
                onAnswerDebounced={(v) => onAnswerDebounced(q, v)}
                onBlur={() => onBlurAnswer(q)} />
            ))}
          </div>
        </div>
      )}

      {hasAnythingToDo && (
        submitted ? (
          <div className="mt-4 warm-wash rounded-[28px] border border-sage-deep/40 bg-sage-soft/30 p-6 text-center">
            <span className="grid h-10 w-10 mx-auto place-items-center rounded-full bg-sage-deep text-pearl">
              <Check className="h-5 w-5" />
            </span>
            <h3 className="font-serif text-2xl mt-3">You're all set!</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Thank you, {guestName}. Your responses are saved, the couple will see them right away.
            </p>
            <button type="button" onClick={onUnsubmit} className="mt-4 text-sm text-muted-foreground underline hover:text-ink cursor-pointer">
              Edit my responses
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <button type="button" disabled={!readyToSubmit || submitting} onClick={onSubmit}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm transition-colors",
                readyToSubmit ? "bg-ink text-paper hover:bg-clay cursor-pointer" : "bg-stone text-muted-foreground cursor-not-allowed",
              )}>
              {submitting ? "Submitting…" : "Submit RSVP"}
            </button>
            {!readyToSubmit && (
              <p className="mt-2 text-sm text-muted-foreground">
                {!allEventsResponded ? "Please respond to each event above to finish your RSVP." : "A few required questions above still need an answer."}
              </p>
            )}
            {submitError && <p className="mt-2 text-sm text-cherry">{submitError}</p>}
          </div>
        )
      )}

      <p className="mt-10 text-center text-sm uppercase tracking-widest text-muted-foreground">Powered by WedThread</p>
    </div>
  );
}

function RsvpBtn({ active, activeClass, disabled, onClick, icon: Icon, label }: {
  active: boolean; activeClass: string; disabled?: boolean; onClick: () => void; icon: any; label: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition-colors",
        active ? activeClass : "border-line hover:bg-stone",
        disabled && "opacity-60 cursor-not-allowed hover:bg-transparent",
        !disabled && "cursor-pointer",
      )}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function PlusOnesPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = (n: number) => (n === 0 ? "just me" : `+${n} guest${n === 1 ? "" : "s"}`);

  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 bg-paper text-sm transition-colors",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-stone cursor-pointer",
        )}>
        {label(value)}
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 min-w-[8rem] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {[0, 1, 2, 3, 4].map((n) => (
              <button key={n} type="button" onClick={() => { onChange(n); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", value === n && "font-medium")}>
                {label(n)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: RsvpSaveStatus }) {
  if (status === "saving" || status === "typing") return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (status === "saved") return <Check className="h-3 w-3 text-sage-deep" />;
  if (status === "error") return <span className="text-[10px] text-cherry">Couldn't save</span>;
  return null;
}

function RsvpQuestionField({ question: q, value, status, disabled, onAnswerNow, onAnswerDebounced, onBlur }: {
  question: RsvpQuestionRow; value: string | undefined; status: RsvpSaveStatus; disabled?: boolean;
  onAnswerNow: (v: string) => void; onAnswerDebounced: (v: string) => void; onBlur: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-ink flex items-center gap-1.5">
        {q.question_text}
        {q.is_required && <span className="text-cherry">*</span>}
        <SaveIndicator status={status} />
      </p>

      {q.question_type === "yes_no" && (
        <div className="mt-2 flex gap-2">
          {/* Falls back to Yes/No for questions saved before options became
              customizable (empty options array from that era). */}
          {(q.options.length ? q.options : ["Yes", "No"]).map((opt) => (
            <button key={opt} type="button" disabled={disabled} onClick={() => onAnswerNow(opt)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
                value === opt ? "bg-sage-deep text-pearl border-sage-deep" : "border-line hover:bg-sage-soft/50 bg-pearl",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              )}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.question_type === "multiple_choice" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {q.options.map((opt) => (
            <button key={opt} type="button" disabled={disabled} onClick={() => onAnswerNow(opt)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
                value === opt ? "bg-sage-deep text-pearl border-sage-deep" : "border-line hover:bg-sage-soft/50 bg-pearl",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              )}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.question_type === "short_text" && (
        <input value={value ?? ""} disabled={disabled} onChange={(e) => onAnswerDebounced(e.target.value)} onBlur={onBlur}
          placeholder="Your answer"
          className="mt-2 w-full rounded-lg border border-line/70 px-4 py-2.5 text-sm bg-pearl focus:outline-none focus:ring-2 focus:ring-sage-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed" />
      )}
    </div>
  );
}
