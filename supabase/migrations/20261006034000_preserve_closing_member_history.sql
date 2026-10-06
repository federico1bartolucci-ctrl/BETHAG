begin;

-- Una posizione "In chiusura" è storico anagrafico attivo fino alla
-- chiusura contabile esplicita. Il database deve impedire che una
-- sincronizzazione proveniente da uno stato frontend legacy la disattivi.
create or replace function public.preserve_closing_condominium_member_history()
returns trigger
language plpgsql
as $$
begin
  if lower(trim(coalesce(new.data->>'position_status', ''))) = 'in chiusura' then
    new.active := true;
    new.data := coalesce(new.data, '{}'::jsonb)
      || jsonb_build_object('current_owner', false);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preserve_closing_condominium_member_history
  on public.condominium_members;

create trigger trg_preserve_closing_condominium_member_history
before insert or update of active, data
on public.condominium_members
for each row
execute function public.preserve_closing_condominium_member_history();

update public.condominium_members
set active = true,
    data = coalesce(data, '{}'::jsonb)
      || jsonb_build_object('current_owner', false)
where lower(trim(coalesce(data->>'position_status', ''))) = 'in chiusura';

commit;
