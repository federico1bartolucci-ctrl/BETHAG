create or replace function public.normalize_zero_ownership_owner()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_share numeric;
begin
  v_share := nullif(trim(coalesce(new.data->>'ownership_share','')), '')::numeric;
  if v_share is not null and v_share <= 0 then
    new.data := coalesce(new.data,'{}'::jsonb)
      || jsonb_build_object('ownership_share',0,'current_owner',false,'position_status','In chiusura');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_zero_ownership_owner on public.condominium_members;

create trigger trg_normalize_zero_ownership_owner
before insert or update of data on public.condominium_members
for each row
execute function public.normalize_zero_ownership_owner();

update public.condominium_members
set data = coalesce(data,'{}'::jsonb)
  || jsonb_build_object('ownership_share',0,'current_owner',false,'position_status','In chiusura'),
    updated_at = now()
where id = 'b972e26e-c213-4d0c-a357-b31b2bedfebf'
  and coalesce(nullif(trim(data->>'ownership_share'),'')::numeric,0) <= 0
  and data->>'current_owner' = 'true';
