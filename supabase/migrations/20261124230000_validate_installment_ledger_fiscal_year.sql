-- A ledger-linked installment must belong to the same fiscal year as
-- its expense ledger entry; matching workspace/condominium alone is not enough.
CREATE OR REPLACE FUNCTION public.validate_condominium_installment_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger record;
  v_unit record;
  v_year record;
  v_member record;
BEGIN
  IF NEW.ledger_entry_id IS NOT NULL THEN
    SELECT workspace_id, condominium_id, direction, fiscal_year_id
      INTO v_ledger
    FROM public.condominium_ledger_entries
    WHERE id = NEW.ledger_entry_id;

    IF NOT FOUND
       OR v_ledger.workspace_id <> NEW.workspace_id
       OR v_ledger.condominium_id <> NEW.condominium_id THEN
      RAISE EXCEPTION 'La rata e il movimento contabile devono appartenere allo stesso condominio e workspace';
    END IF;

    IF v_ledger.direction <> 'Uscita' THEN
      RAISE EXCEPTION 'Una rata contabile può essere collegata solo a una spesa di uscita';
    END IF;

    IF v_ledger.fiscal_year_id IS DISTINCT FROM NEW.fiscal_year_id THEN
      RAISE EXCEPTION 'L''esercizio della rata deve coincidere con quello della spesa collegata';
    END IF;
  END IF;

  IF NEW.unit_id IS NOT NULL THEN
    SELECT workspace_id, condominium_id
      INTO v_unit
    FROM public.condominium_units
    WHERE id = NEW.unit_id;

    IF NOT FOUND
       OR v_unit.workspace_id <> NEW.workspace_id
       OR v_unit.condominium_id <> NEW.condominium_id THEN
      RAISE EXCEPTION 'L''unità della rata deve appartenere allo stesso condominio e workspace';
    END IF;
  END IF;

  IF NEW.fiscal_year_id IS NOT NULL THEN
    SELECT workspace_id, condominium_id
      INTO v_year
    FROM public.condominium_fiscal_years
    WHERE id = NEW.fiscal_year_id;

    IF NOT FOUND
       OR v_year.workspace_id <> NEW.workspace_id
       OR v_year.condominium_id <> NEW.condominium_id THEN
      RAISE EXCEPTION 'L''esercizio della rata deve appartenere allo stesso condominio e workspace';
    END IF;
  END IF;

  IF NEW.member_id IS NOT NULL THEN
    SELECT c.workspace_id, m.condominium_id
      INTO v_member
    FROM public.condominium_members m
    JOIN public.condominiums c ON c.id = m.condominium_id
    WHERE m.id = NEW.member_id;

    IF NOT FOUND
       OR v_member.workspace_id <> NEW.workspace_id
       OR v_member.condominium_id <> NEW.condominium_id THEN
      RAISE EXCEPTION 'Il condomino della rata deve appartenere allo stesso condominio e workspace';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
