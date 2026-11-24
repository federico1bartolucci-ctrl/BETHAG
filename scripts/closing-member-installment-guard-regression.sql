-- Runtime regression: the closing-member guard must use the same
-- case/whitespace normalization as the member-history trigger.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.condominium_members (
  id uuid PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.condominium_installments
  ADD COLUMN IF NOT EXISTS member_id uuid;

CREATE OR REPLACE FUNCTION public.preserve_closing_condominium_member_history()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF lower(trim(coalesce(NEW.data->>'position_status', ''))) = 'in chiusura' THEN
    NEW.active := true;
    NEW.data := coalesce(NEW.data, '{}'::jsonb) || jsonb_build_object('current_owner', false);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_preserve_closing_member
BEFORE INSERT OR UPDATE OF active, data ON public.condominium_members
FOR EACH ROW EXECUTE FUNCTION public.preserve_closing_condominium_member_history();

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124240100_normalize_closing_member_installment_guard.sql

CREATE TRIGGER trg_prevent_new_installment_for_closing_member
BEFORE INSERT ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION private.prevent_new_installment_for_closing_member();

INSERT INTO public.condominium_members(id, active, data) VALUES
 ('00000000-0000-0000-0000-000000000021', false, '{"position_status":"in chiusura"}'),
 ('00000000-0000-0000-0000-000000000022', false, '{"position_status":"  IN CHIUSURA  "}');

DO $$
DECLARE
  member_id uuid;
BEGIN
  FOR member_id IN
    SELECT id FROM public.condominium_members
    ORDER BY id
  LOOP
    IF NOT (SELECT active FROM public.condominium_members WHERE id = member_id) THEN
      RAISE EXCEPTION 'Setup failed: closing member must remain active for history';
    END IF;

    BEGIN
      INSERT INTO public.condominium_installments(id, member_id)
      VALUES (gen_random_uuid(), member_id);
      RAISE EXCEPTION 'Regression: installment was accepted for closing member %', member_id;
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM NOT LIKE 'MEMBER_POSITION_CLOSING:%' THEN
          RAISE;
        END IF;
    END;
  END LOOP;
END $$;
