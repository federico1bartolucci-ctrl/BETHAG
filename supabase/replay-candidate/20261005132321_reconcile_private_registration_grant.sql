-- Restore production-equivalent authenticated execution for the private registration implementation.
grant execute on function private.complete_portal_registration(text,text,text) to authenticated;
