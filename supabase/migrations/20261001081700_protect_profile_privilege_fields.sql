create or replace function public.prevent_profile_privilege_self_change()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if auth.uid() is not null
    and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'I campi role e active del profilo non sono modificabili dall utente';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_profile_privilege_self_change() from anon;
revoke execute on function public.prevent_profile_privilege_self_change() from public;

drop trigger if exists trg_prevent_profile_privilege_self_change on public.profiles;

create trigger trg_prevent_profile_privilege_self_change
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_self_change();
