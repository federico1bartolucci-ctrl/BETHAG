-- Link ledger expenses to funds/reserves and maintain used_amount automatically.
alter table public.condominium_ledger_entries add column if not exists fund_id uuid references public.condominium_funds(id) on delete set null;
create index if not exists condominium_ledger_entries_fund_idx on public.condominium_ledger_entries(fund_id);

create or replace function public.validate_condominium_ledger_fund_scope()
returns trigger language plpgsql set search_path to public as $$
declare v_ws uuid; v_cond uuid;
begin
 if new.fund_id is null then return new; end if;
 if new.direction<>'Uscita' then raise exception 'Un fondo può essere collegato solo a un movimento di uscita'; end if;
 select workspace_id,condominium_id into v_ws,v_cond from public.condominium_funds where id=new.fund_id;
 if v_ws is null then raise exception 'Fondo non trovato'; end if;
 if v_ws<>new.workspace_id or v_cond<>new.condominium_id then raise exception 'Fondo e movimento contabile devono appartenere allo stesso workspace e condominio'; end if;
 return new;
end $$;
drop trigger if exists trg_validate_ledger_fund_scope on public.condominium_ledger_entries;
create trigger trg_validate_ledger_fund_scope before insert or update on public.condominium_ledger_entries for each row execute function public.validate_condominium_ledger_fund_scope();

create or replace function public.sync_condominium_fund_usage()
returns trigger language plpgsql security definer set search_path to public,pg_catalog as $$
declare v_fund_old uuid; v_fund_new uuid; v_used numeric;
begin
 v_fund_old:=case when tg_op in ('UPDATE','DELETE') then old.fund_id else null end;
 v_fund_new:=case when tg_op in ('INSERT','UPDATE') then new.fund_id else null end;
 if v_fund_old is not null and v_fund_old is distinct from v_fund_new then
   select coalesce(sum(amount),0) into v_used from public.condominium_ledger_entries where fund_id=v_fund_old and direction='Uscita';
   update public.condominium_funds set used_amount=v_used where id=v_fund_old;
 end if;
 if v_fund_new is not null then
   select coalesce(sum(amount),0) into v_used from public.condominium_ledger_entries where fund_id=v_fund_new and direction='Uscita';
   if v_used > (select allocated_amount from public.condominium_funds where id=v_fund_new) then raise exception 'L''utilizzo del fondo supera l''importo allocato'; end if;
   update public.condominium_funds set used_amount=v_used where id=v_fund_new;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists trg_sync_condominium_fund_usage on public.condominium_ledger_entries;
create trigger trg_sync_condominium_fund_usage after insert or update of fund_id,amount,direction or delete on public.condominium_ledger_entries for each row execute function public.sync_condominium_fund_usage();