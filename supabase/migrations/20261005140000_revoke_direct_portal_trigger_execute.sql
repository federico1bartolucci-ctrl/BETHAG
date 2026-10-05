begin;

-- Trigger implementation: callable only by PostgreSQL trigger execution.
-- Direct RPC execution is never part of the public application contract.
revoke execute on function private.apply_portal_member_permissions() from public;
revoke execute on function private.apply_portal_member_permissions() from anon;
revoke execute on function private.apply_portal_member_permissions() from authenticated;

grant execute on function private.apply_portal_member_permissions() to postgres;

commit;
