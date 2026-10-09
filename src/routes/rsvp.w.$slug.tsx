import { createFileRoute } from "@tanstack/react-router";
import { noindexMeta } from "@/lib/seo";
import { partnerOne, partnerTwo } from "@/lib/partner-names";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { RsvpPageBody, DEFAULT_ATTENDANCE_TEXT, type RsvpEventRow, type RsvpQuestionRow, type RsvpMode } from "@/components/rsvp-form";

// The general, wedding-wide RSVP link (as opposed to /rsvp/$token, which goes straight to
// one guest's pre-filled invite). Anyone who opens this sees every event in the wedding —
// not filtered to any existing invite — and enters their name before responding. On
// submit we try to match them to an existing guest (creating one if nobody matches), then
// persist through the same submit_rsvp/submit_rsvp_answer functions the per-guest page
// uses, via a token resolved for that guest.
export const Route = createFileRoute("/rsvp/w/$slug")({ head: () => ({ meta: noindexMeta }), component: RsvpOpenPage });

type ContextRow = {
  wedding_id: string; partner_a: string; partner_b: string;
  attendance_question_text: string; attendance_allow_maybe: boolean;
  attendance_accept_label: string; attendance_decline_label: string; attendance_maybe_label: string;
  rsvp_mode: string;
  event_id: string | null; event_name: string | null; event_date: string | null; event_time: string | null;
  venue_name: string | null; city: string | null;
};

type GuestMatch = { guest_id: string; full_name: string; household_group: string | null };

function RsvpOpenPage() {
  const { slug } = Route.useParams();
  // undefined = still loading, null = no wedding at this slug
  const [rows, setRows] = useState<ContextRow[] | null | undefined>(undefined);
  const [questions, setQuestions] = useState<RsvpQuestionRow[]>([]);
  const [step, setStep] = useState<"name" | "form" | "disambiguate">("name");
  const [name, setName] = useState("");
  const [eventRows, setEventRows] = useState<RsvpEventRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [matches, setMatches] = useState<GuestMatch[]>([]);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ctxData, error: ctxError }, { data: qData }] = await Promise.all([
        supabase.rpc("get_wedding_rsvp_context", { _slug: slug }),
        supabase.rpc("get_wedding_rsvp_questions", { _slug: slug }),
      ]);
      if (cancelled) return;
      if (ctxError || !ctxData || (ctxData as ContextRow[]).length === 0) { setRows(null); return; }
      const ctx = ctxData as ContextRow[];
      setRows(ctx);
      setEventRows(
        ctx
          .filter((r): r is ContextRow & { event_id: string; event_name: string } => r.event_id !== null)
          .map((r) => ({
            event_id: r.event_id, event_name: r.event_name, event_date: r.event_date, event_time: r.event_time,
            venue_name: r.venue_name, city: r.city,
            current_status: "pending", current_plus_ones: 0,
          })),
      );
      setQuestions(((qData as any) ?? []).map((q: any) => ({ ...q, existing_answer: null })));
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const respond = (event_id: string, status: string, plus_ones: number) =>
    setEventRows((prev) => prev.map((r) => (r.event_id === event_id ? { ...r, current_status: status, current_plus_ones: plus_ones } : r)));

  const answerNow = (q: RsvpQuestionRow, value: string) =>
    setAnswers((prev) => ({ ...prev, [`${q.question_id}:${q.event_id ?? "global"}`]: value }));

  const finalizePersist = async (token: string) => {
    for (const r of eventRows) {
      if (r.current_status === "pending") continue;
      const { error } = await supabase.rpc("submit_rsvp", {
        _token: token, _event_id: r.event_id, _status: r.current_status as any, _plus_ones: r.current_plus_ones,
      });
      if (error) { setSubmitError(error.message); setSubmitting(false); return false; }
    }
    for (const q of questions) {
      const value = answers[`${q.question_id}:${q.event_id ?? "global"}`];
      if (!value || !value.trim()) continue;
      const { error } = await supabase.rpc("submit_rsvp_answer", {
        _token: token, _question_id: q.question_id, _event_id: q.event_id, _answer_text: value,
      });
      if (error) { setSubmitError(error.message); setSubmitting(false); return false; }
    }
    const { error: submitErr } = await supabase.rpc("set_rsvp_submitted", { _token: token, _submitted: true });
    if (submitErr) { setSubmitError(submitErr.message); setSubmitting(false); return false; }
    track("rsvp_submitted");
    setResolvedToken(token);
    setSubmitting(false);
    setSubmitted(true);
    setStep("form");
    return true;
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setStep("name"); return; }
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await supabase.rpc("match_guests_by_name", { _slug: slug, _full_name: trimmedName });
    if (error) { setSubmitError(error.message); setSubmitting(false); return; }
    const found = (data as GuestMatch[] | null) ?? [];
    if (found.length === 1) {
      const { data: token, error: tokenError } = await supabase.rpc("get_guest_rsvp_token", { _guest_id: found[0].guest_id, _slug: slug });
      if (tokenError || !token) { setSubmitError(tokenError?.message ?? "Could not resolve your invite."); setSubmitting(false); return; }
      await finalizePersist(token as string);
      return;
    }
    if (found.length > 1) {
      setMatches(found);
      setStep("disambiguate");
      setSubmitting(false);
      return;
    }
    const { data: created, error: createError } = await supabase.rpc("create_guest_for_rsvp", { _slug: slug, _full_name: trimmedName });
    const row = (created as { guest_id: string; rsvp_token: string }[] | null)?.[0];
    if (createError || !row) { setSubmitError(createError?.message ?? "Could not save your RSVP."); setSubmitting(false); return; }
    await finalizePersist(row.rsvp_token);
  };

  const pickMatch = async (guestId: string) => {
    setSubmitting(true);
    setSubmitError(null);
    const { data: token, error } = await supabase.rpc("get_guest_rsvp_token", { _guest_id: guestId, _slug: slug });
    if (error || !token) { setSubmitError(error?.message ?? "Could not resolve your invite."); setSubmitting(false); return; }
    await finalizePersist(token as string);
  };

  const createInstead = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const trimmedName = name.trim();
    const { data: created, error } = await supabase.rpc("create_guest_for_rsvp", { _slug: slug, _full_name: trimmedName });
    const row = (created as { guest_id: string; rsvp_token: string }[] | null)?.[0];
    if (error || !row) { setSubmitError(error?.message ?? "Could not save your RSVP."); setSubmitting(false); return; }
    await finalizePersist(row.rsvp_token);
  };

  const unsubmit = async () => {
    if (!resolvedToken) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("set_rsvp_submitted", { _token: resolvedToken, _submitted: false });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(false);
  };

  if (rows === undefined) {
    return <div className="min-h-screen grid place-items-center bg-paper"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  }

  if (rows === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper text-center px-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-clay">Wedding not found</p>
          <h1 className="mt-2 font-serif text-3xl">This link may be wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please check the link or contact the couple.</p>
        </div>
      </div>
    );
  }

  const [first] = rows;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (step === "name") {
    return (
      <div className="min-h-screen bg-paper py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 justify-center mb-8">
            <Logo sizeClassName="text-xl" />
          </div>
          <p className="text-center text-sm uppercase tracking-[0.25em] text-clay">You are invited to celebrate</p>
          <h1 className="mt-4 text-center font-serif text-4xl md:text-5xl leading-tight">
            {partnerOne(first)} <span className="text-clay">&</span> {partnerTwo(first)}
          </h1>
          <p className="mt-4 text-center text-muted-foreground">What's your name?</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("form"); }}
            className="mt-4 w-full rounded-full border border-line bg-paper px-5 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-clay" />
          <button type="button" disabled={!name.trim()} onClick={() => setStep("form")}
            className="mt-4 w-full rounded-full bg-ink text-paper px-6 py-3 text-sm hover:bg-clay disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "disambiguate") {
    return (
      <div className="min-h-screen bg-paper py-14 px-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 justify-center mb-8">
            <Logo sizeClassName="text-xl" />
          </div>
          <p className="text-center text-muted-foreground">A few guests share that name. Which one is you?</p>
          <div className="mt-6 space-y-2">
            {matches.map((m) => (
              <button key={m.guest_id} onClick={() => pickMatch(m.guest_id)} disabled={submitting}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-left text-sm hover:border-clay hover:bg-cream transition-colors disabled:opacity-60 cursor-pointer">
                <span>
                  {m.full_name}
                  {m.household_group && <span className="block text-sm text-muted-foreground">{m.household_group}</span>}
                </span>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin text-clay" /> : <span className="text-sm text-clay shrink-0">This is me →</span>}
              </button>
            ))}
            <button onClick={createInstead} disabled={submitting}
              className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-center text-sm text-muted-foreground hover:border-clay hover:text-ink transition-colors disabled:opacity-60 cursor-pointer">
              None of these. I'm someone else
            </button>
          </div>
          {submitError && <p className="mt-3 text-sm text-cherry text-center">{submitError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-14 px-6">
      <RsvpPageBody
        partnerA={partnerOne(first)} partnerB={partnerTwo(first)} guestName={name.trim()}
        attendanceQuestionText={first.attendance_question_text ?? DEFAULT_ATTENDANCE_TEXT}
        allowMaybe={first.attendance_allow_maybe ?? false}
        acceptLabel={first.attendance_accept_label} declineLabel={first.attendance_decline_label} maybeLabel={first.attendance_maybe_label}
        rsvpMode={(first.rsvp_mode as RsvpMode) ?? "per_event"}
        eventRows={eventRows} questions={questions}
        answers={answers} saveStatus={{}} rsvpSaveStatus={{}}
        submitted={submitted} submitting={submitting} submitError={submitError}
        onRespond={respond} onAnswerNow={answerNow} onAnswerDebounced={answerNow} onBlurAnswer={() => {}}
        onSubmit={handleSubmit} onUnsubmit={unsubmit}
      />
      {submitted && resolvedToken && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Want to make changes later? Bookmark your personal link: <span className="text-ink">{origin}/rsvp/{resolvedToken}</span>
        </p>
      )}
    </div>
  );
}
