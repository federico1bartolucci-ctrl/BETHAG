-- Authenticated callers use the public invoker RPC wrappers from the browser.
-- The private SECURITY DEFINER implementations enforce workspace/module authorization
-- with auth.uid() and private.can_manage_workspace_module before any mutation.
-- Grant only the authenticated role; never grant PUBLIC.
GRANT EXECUTE ON FUNCTION private.close_condominium_fiscal_year(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) TO authenticated;
