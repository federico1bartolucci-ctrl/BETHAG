-- Replay-only reconstruction of a pre-ledger audit-log SELECT policy.
-- The recovered ledger later alters this named policy at 20261003030800, but no earlier
-- CREATE POLICY payload exists in the 247 entries. The later migration's comment and
-- replacement expression establish the prior manager-scoped policy. Test-only; never deploy.
create policy "condominium_audit_log_read_manager"
  on public.condominium_audit_log
  for select
  to authenticated
  using (private.is_workspace_manager(workspace_id));
