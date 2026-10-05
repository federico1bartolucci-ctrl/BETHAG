begin;

-- Reconcile the production portal-permission trigger before hardening its direct execution path.
drop trigger if exists trg_portal_member_permissions on public.portal_access;

create trigger trg_portal_member_permissions
before insert or update of email, user_id, member_id, condominium_id, data
on public.portal_access
for each row
execute function private.apply_portal_member_permissions();

-- Trigger implementation: callable only through PostgreSQL trigger execution.
revoke execute on function private.apply_portal_member_permissions() from public;
revoke execute on function private.apply_portal_member_permissions() from anon;
revoke execute on function private.apply_portal_member_permissions() from authenticated;

grant execute on function private.apply_portal_member_permissions() to postgres;

commit;
