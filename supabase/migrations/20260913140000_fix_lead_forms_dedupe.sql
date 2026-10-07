-- Bug found via live testing: VendorLeadFormBuilder's auto-create-on-first-
-- open logic ("check if a lead_forms row exists, else insert one") has no DB
-- guard against two near-simultaneous opens both passing the check before
-- either insert lands — observed in practice as two `lead_forms` rows for
-- the same vendor_service_id (React re-invoking the effect). This silently
-- broke VendorEnquireDialog's `.maybeSingle()` read (errors on 2+ rows),
-- which fell back to the generic two-field form instead of the vendor's
-- real one — no crash, just quietly wrong behavior for the couple.
--
-- First, de-duplicate any rows this bug already created on the live
-- database: for each vendor_service_id/business_id group with more than one
-- lead_forms row, keep the OLDEST (first genuinely created) and move any
-- lead_form_fields on the newer duplicates onto the keeper, then delete the
-- duplicates — no couple-entered data (lead_form_submissions already
-- reference the surviving lead_form_id via foreign key, or NULL) is lost.
DO $$
DECLARE
  dup RECORD;
  keeper_id UUID;
BEGIN
  FOR dup IN
    SELECT vendor_service_id, business_id, array_agg(id ORDER BY created_at) AS ids
    FROM public.lead_forms
    GROUP BY vendor_service_id, business_id
    HAVING count(*) > 1
  LOOP
    keeper_id := dup.ids[1];
    UPDATE public.lead_form_fields SET lead_form_id = keeper_id
      WHERE lead_form_id = ANY(dup.ids[2:]);
    UPDATE public.lead_form_submissions SET lead_form_id = keeper_id
      WHERE lead_form_id = ANY(dup.ids[2:]);
    DELETE FROM public.lead_forms WHERE id = ANY(dup.ids[2:]);
  END LOOP;
END $$;

-- Then close the gap: at most one lead_forms row per vendor_service_id (the
-- vendor case), and at most one per business_id among rows with no
-- vendor_service_id (the venue case, vendor_service_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_forms_one_per_service
  ON public.lead_forms (vendor_service_id) WHERE vendor_service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_forms_one_per_business
  ON public.lead_forms (business_id) WHERE vendor_service_id IS NULL;
