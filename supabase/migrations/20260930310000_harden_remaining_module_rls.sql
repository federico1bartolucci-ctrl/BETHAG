-- Harden remaining module RLS policies.
-- Audit log and registry are administrator-only in the current application model.
-- Suppliers, fiscal carryovers and portal registration reviews require their
-- dedicated collaborator module permission.

alter policy "condominium_audit_log_manager_all"
on public.condominium_audit_log
using (private.is_workspace_admin(workspace_id))
with check (private.is_workspace_admin(workspace_id));

alter policy "condominium_register_items_manager_all"
on public.condominium_register_items
using (private.is_workspace_admin(workspace_id))
with check (private.is_workspace_admin(workspace_id));

alter policy "condominium_suppliers_manager_all"
on public.condominium_suppliers
using (private.can_manage_workspace_module(workspace_id,'fornitori'))
with check (private.can_manage_workspace_module(workspace_id,'fornitori'));

alter policy "managers manage fiscal carryovers"
on public.condominium_fiscal_carryovers
using (private.can_manage_workspace_module(workspace_id,'contabilita'))
with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

alter policy "managers read portal registration requests"
on public.portal_registration_requests
using (private.can_manage_workspace_module(workspace_id,'portale'));

alter policy "managers update portal registration requests"
on public.portal_registration_requests
using (private.can_manage_workspace_module(workspace_id,'portale'))
with check (private.can_manage_workspace_module(workspace_id,'portale'));
