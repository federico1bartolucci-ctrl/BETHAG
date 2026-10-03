-- Align audit-log visibility with the application authorization model.
-- Audit history is administrator-only; collaborators must not inherit access
-- merely from being workspace managers.
alter policy "condominium_audit_log_read_manager"
on public.condominium_audit_log
using (private.is_workspace_admin(workspace_id));
