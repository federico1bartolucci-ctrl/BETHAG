-- Protect fiscal-year deletion from orphaning accounting data.
-- Closed-year immutability is enforced by the existing
-- prevent_closed_fiscal_year_record_mutation / prevent_closed_condominium_accounting
-- triggers already used by the accounting schema.

create or replace function public.prevent_closed_fiscal_year_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere eliminato';
  end if;

  if exists (select 1 from public.condominium_ledger_entries where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_installments where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_budgets where fiscal_year_id=old.id) then
    raise exception 'L''esercizio ha dati contabili collegati e non può essere eliminato';
  end if;

  return old;
end;
$function$;

drop trigger if exists trg_prevent_closed_fiscal_year_delete on public.condominium_fiscal_years;
create trigger trg_prevent_closed_fiscal_year_delete
before delete on public.condominium_fiscal_years
for each row execute function public.prevent_closed_fiscal_year_delete();


drop trigger if exists trg_block_closed_budgets on public.condominium_budgets;
create trigger trg_block_closed_budgets
before insert or update or delete on public.condominium_budgets
for each row execute function public.prevent_closed_condominium_accounting();


-- Keep fiscal-year validation aligned with the UI and prevent overlapping periods.
create or replace function public.validate_condominium_fiscal_year_scope()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare v_workspace uuid;
begin
  select c.workspace_id into v_workspace from public.condominiums c where c.id=new.condominium_id;
  if v_workspace is null then raise exception 'Il condominio indicato non esiste'; end if;
  if new.workspace_id<>v_workspace then raise exception 'L''esercizio contabile e il condominio devono appartenere allo stesso workspace'; end if;
  if new.start_date>new.end_date then raise exception 'La data iniziale dell''esercizio non può essere successiva alla data finale'; end if;
  if nullif(btrim(new.name),'') is null then raise exception 'Il nome dell''esercizio contabile è obbligatorio'; end if;
  if new.status not in ('Aperto','Provvisorio','Chiuso') then raise exception 'Stato dell''esercizio contabile non valido'; end if;
  if exists (
    select 1 from public.condominium_fiscal_years fy
    where fy.condominium_id=new.condominium_id
      and fy.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
      and new.start_date<=fy.end_date and fy.start_date<=new.end_date
  ) then
    raise exception 'Le date dell''esercizio contabile si sovrappongono a un altro esercizio dello stesso condominio';
  end if;
  return new;
end;
$function$;
