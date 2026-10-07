import { createFileRoute } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RsvpPageBody, rsvpAnswerKey, DEFAULT_ATTENDANCE_TEXT, type RsvpEventRow, type RsvpQuestionRow, type RsvpSaveStatus, type RsvpMode } from "@/components/rsvp-form";

export const Route = createFileRoute("/rsvp/$token")({ component: RsvpPage });

type ContextRow = {
  guest_id: string; guest_name: string; wedding_id: string;
  partner_a: string; partner_b: string;
  attendance_question_text: string; attendance_allow_maybe: boolean;
  attendance_accept_label: string; attendance_decline_label: string; attendance_maybe_label: string;
  rsvp_mode: string;
  rsvp_submitted_at: string | null;
  event_id: string | null; event_name: string | null; event_date: string | null; event_time: string | null;
  venue_name: string | null; city: string | null;
  current_status: string; current_plus_ones: number;
};

function RsvpPage() {
  const { token } = Route.useParams();
  const [rows, setRows] = useState<ContextRow[] | null>(null);
  const [questions, setQuestions] = useState<RsvpQuestionRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, RsvpSaveStatus>>({});
  const [rsvpSaveStatus, setRsvpSaveStatus] = useState<Record<string, RsvpSaveStatus>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: ctxData, error: ctxError }, { data: qData }] = await Promise.all([
      supabase.rpc("get_rsvp_context", { _token: token }),
      supabase.rpc("get_rsvp_questions", { _token: token }),
    ]);
    setLoading(false);
    if (ctxError || !ctxData || (ctxData as any).length === 0) { setRows([]); return; }
    setRows(ctxData as any);
    const qs = ((qData as any) ?? []) as RsvpQuestionRow[];
    setQuestions(qs);
    const initial: Record<string, string> = {};
    qs.forEach((q) => { if (q.existing_answer != null) initial[rsvpAnswerKey(q)] = q.existing_answer; });
    setAnswers(initial);
  };
  useEffect(() => { load(); }, [token]);

  const respond = async (event_id: string, status: string, plus_ones: number) => {
    setRsvpSaveStatus((prev) => ({ ...prev, [event_id]: "saving" }));
    const { error } = await supabase.rpc("submit_rsvp", { _token: token, _event_id: event_id, _status: status as any, _plus_ones: plus_ones });
    if (error) { setRsvpSaveStatus((prev) => ({ ...prev, [event_id]: "error" })); return; }
    setRsvpSaveStatus((prev) => ({ ...prev, [event_id]: "saved" }));
    track("rsvp_response", { response: status });
    setRows((prev) => prev && prev.map((r) => (r.event_id === event_id ? { ...r, current_status: status, current_plus_ones: plus_ones } : r)));
  };

  const persistAnswer = async (q: RsvpQuestionRow, value: string) => {
    const key = rsvpAnswerKey(q);
    setSaveStatus((prev) => ({ ...prev, [key]: "saving" }));
    const { error } = await supabase.rpc("submit_rsvp_answer", {
      _token: token, _question_id: q.question_id, _event_id: q.event_id, _answer_text: value,
    });
    setSaveStatus((prev) => ({ ...prev, [key]: error ? "error" : "saved" }));
  };

  const answerNow = (q: RsvpQuestionRow, value: string) => {
    setAnswers((prev) => ({ ...prev, [rsvpAnswerKey(q)]: value }));
    persistAnswer(q, value);
  };

  const answerDebounced = (q: RsvpQuestionRow, value: string) => {
    const key = rsvpAnswerKey(q);
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSaveStatus((prev) => ({ ...prev, [key]: "typing" }));
    clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(() => persistAnswer(q, value), 600);
  };

  const flushAnswer = (q: RsvpQuestionRow) => {
    const key = rsvpAnswerKey(q);
    clearTimeout(debounceRefs.current[key]);
    const value = answers[key];
    if (value !== undefined) persistAnswer(q, value);
  };

  const setSubmitted = (submittedAt: string | null) => {
    setRows((prev) => prev && prev.map((r) => ({ ...r, rsvp_submitted_at: submittedAt })));
  };

  const submitRsvp = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc("set_rsvp_submitted", { _token: token, _submitted: true });
    setSubmitting(false);
    if (error) return setSubmitError(error.message);
    setSubmitted(new Date().toISOString());
  };

  const unsubmitRsvp = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc("set_rsvp_submitted", { _token: token, _submitted: false });
    setSubmitting(false);
    if (error) return setSubmitError(error.message);
    setSubmitted(null);
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
  const eventRows: RsvpEventRow[] = rows
    .filter((r): r is ContextRow & { event_id: string; event_name: string } => r.event_id !== null)
    .map((r) => ({
      event_id: r.event_id, event_name: r.event_name, event_date: r.event_date, event_time: r.event_time,
      venue_name: r.venue_name, city: r.city,
      current_status: r.current_status, current_plus_ones: r.current_plus_ones,
    }));

  return (
    <div className="min-h-screen bg-paper py-14 px-6">
      <RsvpPageBody
        partnerA={first.partner_a} partnerB={first.partner_b} guestName={first.guest_name}
        attendanceQuestionText={first.attendance_question_text ?? DEFAULT_ATTENDANCE_TEXT}
        allowMaybe={first.attendance_allow_maybe ?? false}
        acceptLabel={first.attendance_accept_label} declineLabel={first.attendance_decline_label} maybeLabel={first.attendance_maybe_label}
        rsvpMode={(first.rsvp_mode as RsvpMode) ?? "per_event"}
        eventRows={eventRows} questions={questions}
        answers={answers} saveStatus={saveStatus} rsvpSaveStatus={rsvpSaveStatus}
        submitted={first.rsvp_submitted_at != null} submitting={submitting} submitError={submitError}
        onRespond={respond} onAnswerNow={answerNow} onAnswerDebounced={answerDebounced} onBlurAnswer={flushAnswer}
        onSubmit={submitRsvp} onUnsubmit={unsubmitRsvp}
      />
    </div>
  );
}
