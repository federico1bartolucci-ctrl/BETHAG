begin;

-- Reconcile the production member-to-portal lifecycle trigger.
drop trigger if exists trg_sync_portal_after_member_change on public.condominium_members;

create trigger trg_sync_portal_after_member_change
after delete or update of active, user_id, name, email, data, unit_id, condominium_id
on public.condominium_members
for each row
execute function private.sync_portal_after_member_change();

revoke execute on function private.sync_portal_after_member_change() from public;
revoke execute on function private.sync_portal_after_member_change() from anon;
revoke execute on function private.sync_portal_after_member_change() from authenticated;

grant execute on function private.sync_portal_after_member_change() to postgres;

commit;
