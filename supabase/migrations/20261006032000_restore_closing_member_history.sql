begin;

-- Le posizioni in chiusura restano attive nell'anagrafica fino alla
-- chiusura contabile esplicita. Il vecchio flag data.active non deve
-- trasformarle in record invisibili.
update public.condominium_members
set active = true,
    data = coalesce(data, '{}'::jsonb)
      || jsonb_build_object('current_owner', false)
where coalesce(data->>'position_status', '') = 'In chiusura';

commit;
