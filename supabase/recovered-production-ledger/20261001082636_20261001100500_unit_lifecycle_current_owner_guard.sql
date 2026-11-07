create or replace function private.prevent_new_installment_for_closing_member()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.member_id is not null
     and exists (
       select 1 from public.condominium_members cm
       where cm.id=new.member_id
         and cm.active
         and coalesce(cm.data->>'position_status','')='In chiusura'
     )
  then
    raise exception 'MEMBER_POSITION_CLOSING: il titolare è in chiusura e non può ricevere nuove rate';
  end if;
  return new;
end;
$$;
revoke execute on function private.prevent_new_installment_for_closing_member() from public,anon,authenticated;
drop trigger if exists trg_prevent_new_installment_for_closing_member on public.condominium_installments;
create trigger trg_prevent_new_installment_for_closing_member
before insert on public.condominium_installments
for each row execute function private.prevent_new_installment_for_closing_member();