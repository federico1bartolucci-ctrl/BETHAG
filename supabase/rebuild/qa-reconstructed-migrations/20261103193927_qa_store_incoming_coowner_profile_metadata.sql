-- RECONSTRUCTED from pg_get_functiondef + pg_get_triggerdef on live QA,
-- captured 2026-11-04. This is not the original historical payload.
-- Preserves incoming co-owner metadata while enforcing unique, non-empty
-- email addresses for multi-owner transfers.
CREATE OR REPLACE FUNCTION private.apply_incoming_transfer_member_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_members jsonb;
  v_record jsonb;
  v_missing_emails integer;
  v_distinct_emails integer;
BEGIN
  v_members := coalesce(NEW.data, '{}'::jsonb)->'incoming_members';
  IF pg_catalog.jsonb_typeof(v_members) IS DISTINCT FROM 'array' THEN
    RETURN NEW;
  END IF;

  IF pg_catalog.jsonb_array_length(v_members) > 1 THEN
    SELECT
      count(*) FILTER (
        WHERE nullif(pg_catalog.btrim(coalesce(value->>'email', '')), '') IS NULL
      ),
      count(DISTINCT pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'email', ''))))
    INTO v_missing_emails, v_distinct_emails
    FROM pg_catalog.jsonb_array_elements(v_members) AS entries(value);

    IF v_missing_emails > 0 THEN
      RAISE EXCEPTION 'INCOMING_COOWNER_EMAIL_REQUIRED';
    END IF;
    IF v_distinct_emails <> pg_catalog.jsonb_array_length(v_members) THEN
      RAISE EXCEPTION 'INCOMING_COOWNER_EMAIL_DUPLICATE';
    END IF;
  END IF;

  SELECT value
  INTO v_record
  FROM pg_catalog.jsonb_array_elements(v_members) AS entries(value)
  WHERE pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'name', ''))) =
        pg_catalog.lower(pg_catalog.btrim(coalesce(NEW.name, '')))
    AND pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'email', ''))) =
        pg_catalog.lower(pg_catalog.btrim(coalesce(NEW.email, '')))
    AND nullif(pg_catalog.btrim(coalesce(value->>'ownership_share', '')), '')::numeric =
        nullif(pg_catalog.btrim(coalesce(NEW.data->>'ownership_share', '')), '')::numeric
  LIMIT 1;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'INCOMING_MEMBER_METADATA_NOT_MATCHED';
  END IF;

  NEW.data :=
    (coalesce(NEW.data, '{}'::jsonb) - 'incoming_members')
    || pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'firstName', nullif(pg_catalog.btrim(v_record->>'firstName'), ''),
        'lastName', nullif(pg_catalog.btrim(v_record->>'lastName'), ''),
        'fiscalCode', nullif(pg_catalog.upper(pg_catalog.btrim(v_record->>'fiscalCode')), ''),
        'phone', nullif(pg_catalog.btrim(v_record->>'phone'), '')
      )
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_apply_incoming_transfer_member_metadata ON public.condominium_members;
CREATE TRIGGER trg_apply_incoming_transfer_member_metadata
BEFORE INSERT ON public.condominium_members
FOR EACH ROW EXECUTE FUNCTION private.apply_incoming_transfer_member_metadata();
