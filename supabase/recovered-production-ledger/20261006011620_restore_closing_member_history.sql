begin;
update public.condominium_members
set active = true,
    data = coalesce(data, '{}'::jsonb) || jsonb_build_object('current_owner', false)
where coalesce(data->>'position_status', '') = 'In chiusura';
commit;