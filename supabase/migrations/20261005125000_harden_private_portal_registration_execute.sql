-- Close the remaining direct execution path to the privileged portal-registration implementation.
revoke execute on function private.complete_portal_registration(text,text,text) from public, anon, authenticated;
