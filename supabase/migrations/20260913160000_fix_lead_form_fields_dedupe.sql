-- Follow-up to 20260913140000: that migration de-duplicates lead_forms rows
-- (multiple forms for one service), but testing surfaced a second symptom
-- of the same race — a single lead_forms row ending up with its suggested
-- fields seeded twice (e.g. "Event date" appearing twice under the same
-- lead_form_id). This removes exact duplicate lead_form_fields rows
-- (same lead_form_id + label + field_type), keeping the oldest of each
-- group. Safe to run whether or not 20260913140000 has already run, and
-- safe to re-run.
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
BEGIN
  FOR dup IN
    SELECT lead_form_id, label, field_type, array_agg(id ORDER BY sort_order, id) AS ids
    FROM public.lead_form_fields
    GROUP BY lead_form_id, label, field_type
    HAVING count(*) > 1
  LOOP
    keep_id := dup.ids[1];
    -- Repoint any submissions' responses aren't tied to field ids (they key
    -- by label text, per lead_form_submissions.responses), so nothing else
    -- references these rows — safe to just drop the extras.
    DELETE FROM public.lead_form_fields WHERE id = ANY(dup.ids[2:]);
  END LOOP;
END $$;
