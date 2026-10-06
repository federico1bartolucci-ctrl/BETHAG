begin;

-- Reconcile transfers already confirmed before the lifecycle fix.
-- The outgoing member remains active for historical/accounting purposes;
-- only the current-owner flag is closed.
update public.condominium_members m
set active = true,
    data = coalesce(m.data, '{}'::jsonb)
      || jsonb_build_object(
        'position_status','In chiusura',
        'current_owner',false,
        'subentro_date',t.transfer_date,
        'subentro_type',t.transfer_type
      )
from public.condominium_member_transfers t
where t.outgoing_member_id = m.id
  and t.status in ('Confermato','Chiuso');

commit;
