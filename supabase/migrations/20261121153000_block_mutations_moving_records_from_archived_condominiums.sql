-- Prevent updates from moving records out of an archived condominium.
-- Existing archived records must remain immutable until the condominium is restored.
CREATE OR REPLACE FUNCTION public.prevent_archived_condominium_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_condominium_id uuid;
begin
  if tg_op = 'DELETE' then
    v_condominium_id := old.condominium_id;
    if v_condominium_id is not null and exists (
      select 1
      from public.condominiums c
      where c.id = v_condominium_id
        and c.archived_at is not null
    ) then
      raise exception 'Il condominio è archiviato: eliminazione non consentita';
    end if;
    return old;
  end if;

  -- On UPDATE, check the original parent as well as the destination.
  -- Otherwise a record could be moved from an archived condominium to an active
  -- one and evade the archived-record guard.
  if tg_op = 'UPDATE' then
    v_condominium_id := old.condominium_id;
    if v_condominium_id is not null and exists (
      select 1
      from public.condominiums c
      where c.id = v_condominium_id
        and c.archived_at is not null
    ) then
      raise exception 'Il condominio di origine è archiviato: modifica non consentita';
    end if;
  end if;

  v_condominium_id := new.condominium_id;
  if v_condominium_id is not null and exists (
    select 1
    from public.condominiums c
    where c.id = v_condominium_id
      and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;

  return new;
end;
$function$;
