-- BETHAG baseline: RLS policies and triggers.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

CREATE POLICY "authorized managers manage activities" ON "public"."activities" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized users read activities" ON "public"."activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized managers manage assemblies" ON "public"."assemblies" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'assemblee'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'assemblee'::text));

CREATE POLICY "authorized users read assemblies" ON "public"."assemblies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'assemblee'::text) OR (((data ->> 'publishedToPortal'::text) = 'true'::text) AND (private.can_access_resident_condominium_module(condominium_id, 'assemblee'::text) OR private.can_access_resident_condominium_module(condominium_id, 'verbali'::text)))));

CREATE POLICY "authorized managers manage communication recipients" ON "public"."communication_recipients" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text));

CREATE POLICY "recipients read own communication delivery" ON "public"."communication_recipients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "authorized managers manage communications" ON "public"."communications" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text));

CREATE POLICY "authorized users read communications" ON "public"."communications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'comunicazioni'::text) OR ((published = true) AND private.can_access_resident_condominium_module(condominium_id, 'comunicazioni'::text))));

CREATE POLICY "authorized users read accounting settings" ON "public"."condominium_accounting_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage accounting settings" ON "public"."condominium_accounting_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read allocation intakes" ON "public"."condominium_allocation_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage allocation intakes" ON "public"."condominium_allocation_intakes" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read allocation rules" ON "public"."condominium_allocation_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT private.can_access_workspace_module(condominium_allocation_rules.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

CREATE POLICY "managers manage allocation rules" ON "public"."condominium_allocation_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_audit_log_read_manager" ON "public"."condominium_audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_workspace_admin(workspace_id));

CREATE POLICY "condominium_budgets_manager_all" ON "public"."condominium_budgets" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read consumption readings" ON "public"."condominium_consumption_readings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT private.can_access_workspace_module(condominium_consumption_readings.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

CREATE POLICY "managers manage consumption readings" ON "public"."condominium_consumption_readings" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read condominium creation intakes" ON "public"."condominium_creation_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "managers manage condominium creation intakes" ON "public"."condominium_creation_intakes" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "Managers can delete condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "carryover compensations managers select" ON "public"."condominium_fiscal_carryover_compensations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read fiscal carryovers" ON "public"."condominium_fiscal_carryovers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage fiscal carryovers" ON "public"."condominium_fiscal_carryovers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized managers manage insurance policies" ON "public"."condominium_insurance_policies" AS PERMISSIVE FOR ALL TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "authorized users read insurance policies" ON "public"."condominium_insurance_policies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'condomini'::text) OR private.can_access_resident_condominium_module(condominium_id, 'documenti'::text)));

CREATE POLICY "Managers can delete condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_member_transfers_manager_all" ON "public"."condominium_member_transfers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "authorized managers manage condominium members" ON "public"."condominium_members" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND private.can_manage_workspace_module(c.workspace_id, 'condomini'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND private.can_manage_workspace_module(c.workspace_id, 'condomini'::text)))));

CREATE POLICY "authorized users read condominium members" ON "public"."condominium_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(( SELECT c.workspace_id
           FROM condominiums c
          WHERE (c.id = condominium_members.condominium_id)), 'condomini'::text) AS can_access_workspace_module) OR ((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL))))) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))) AND (active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL)))))));

CREATE POLICY "Managers can delete condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read payment reversal audit" ON "public"."condominium_payment_reversal_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_register_items_manager_all" ON "public"."condominium_register_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(workspace_id)) WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "authorized managers manage requests" ON "public"."condominium_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "authorized users read requests" ON "public"."condominium_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(condominium_requests.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR (requester_user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "residents create own requests" ON "public"."condominium_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.can_manage_workspace_module(workspace_id, 'condomini'::text) OR ((requester_user_id = ( SELECT auth.uid() AS uid)) AND private.can_access_condominium(condominium_id) AND ((member_id IS NULL) OR (EXISTS ( SELECT 1
   FROM condominium_members cm
  WHERE ((cm.id = condominium_requests.member_id) AND (cm.condominium_id = condominium_requests.condominium_id) AND (cm.active = true) AND ((cm.user_id = ( SELECT auth.uid() AS uid)) OR (lower(cm.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))))))));

CREATE POLICY "condominium_suppliers_manager_all" ON "public"."condominium_suppliers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'fornitori'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "Managers can delete condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "unit transformation items manager access" ON "public"."condominium_unit_transformation_items" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module)))));

CREATE POLICY "unit transformations manager access" ON "public"."condominium_unit_transformations" AS PERMISSIVE FOR ALL TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can delete units" ON "public"."condominium_units" AS PERMISSIVE FOR DELETE TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can insert units" ON "public"."condominium_units" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can read units" ON "public"."condominium_units" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_units.condominium_id) AND (c.archived_at IS NULL)))) AND (EXISTS ( SELECT 1
   FROM (portal_access pa
     JOIN condominium_members cm ON (((cm.condominium_id = pa.condominium_id) AND (cm.unit_id = condominium_units.id) AND (cm.active = true) AND (((pa.user_id IS NOT NULL) AND (cm.user_id = ( SELECT auth.uid() AS uid))) OR (lower(cm.email) = lower(pa.email))))))
  WHERE ((pa.condominium_id = condominium_units.condominium_id) AND (pa.active = true) AND (pa.role = ANY (ARRAY['resident'::text, 'council'::text])) AND ((pa.user_id = ( SELECT auth.uid() AS uid)) OR (lower(pa.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))))))));

CREATE POLICY "Authorized condominium managers can update units" ON "public"."condominium_units" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "condominium_work_documents_manager_all" ON "public"."condominium_work_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_work_events_manager_all" ON "public"."condominium_work_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_work_progress_manager_all" ON "public"."condominium_work_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_works_manager_all" ON "public"."condominium_works" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized managers manage condominiums" ON "public"."condominiums" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "workspace members can read active condominiums" ON "public"."condominiums" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((archived_at IS NULL) AND (private.can_access_workspace_module(workspace_id, 'condomini'::text) OR private.can_access_resident_condominium(id))));

CREATE POLICY "authorized managers manage deadlines" ON "public"."deadlines" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'scadenze'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'scadenze'::text));

CREATE POLICY "authorized users read deadlines" ON "public"."deadlines" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'scadenze'::text));

CREATE POLICY "authorized managers manage documents" ON "public"."documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'documenti'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'documenti'::text));

CREATE POLICY "authorized users read documents" ON "public"."documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'documenti'::text) OR (private.can_access_resident_condominium_module(condominium_id, 'documenti'::text) AND (COALESCE((data ->> 'publication'::text), ''::text) = 'Condiviso'::text))));

CREATE POLICY "authorized managers manage portal access" ON "public"."portal_access" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "residents read own portal access" ON "public"."portal_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = portal_access.condominium_id) AND (c.archived_at IS NULL)))) AND ((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))));

CREATE POLICY "managers read portal registration requests" ON "public"."portal_registration_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "managers update portal registration requests" ON "public"."portal_registration_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "users can read own profile" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users can update own profile" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "authorized managers manage suppliers" ON "public"."suppliers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'fornitori'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "authorized users read suppliers" ON "public"."suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "Users can read own security settings" ON "public"."user_security_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "admins manage memberships" ON "public"."workspace_members" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(workspace_id)) WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "members can read memberships" ON "public"."workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_workspace_admin(workspace_members.workspace_id) AS is_workspace_admin)));

CREATE POLICY "admins can manage workspaces" ON "public"."workspaces" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(id)) WITH CHECK (private.is_workspace_admin(id));

CREATE POLICY "workspace members can read workspaces" ON "public"."workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_workspace_member(id));

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_activities BEFORE INSERT OR UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."assemblies" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_assemblies BEFORE INSERT OR UPDATE ON "public"."assemblies" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."communication_recipients" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_communication_recipient_scope BEFORE INSERT OR UPDATE ON "public"."communication_recipients" FOR EACH ROW EXECUTE FUNCTION validate_communication_recipient_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."communications" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_communication_scope BEFORE INSERT OR UPDATE ON "public"."communications" FOR EACH ROW EXECUTE FUNCTION validate_communication_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_accounting_settings" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_guard_confirmed_allocation_intake BEFORE DELETE OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_allocation_intake_scope BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION validate_condominium_allocation_intake_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_rules" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_allocation_rule_scope BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_rules" FOR EACH ROW EXECUTE FUNCTION validate_allocation_rule_scope();

CREATE TRIGGER trg_validate_audit_scope BEFORE INSERT OR UPDATE ON "public"."condominium_audit_log" FOR EACH ROW EXECUTE FUNCTION validate_audit_scope();

CREATE TRIGGER trg_block_closed_budgets BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_budget_scope BEFORE INSERT OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION validate_condominium_budget_scope();

CREATE TRIGGER trg_guard_consumption_reading_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION guard_consumption_reading_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_consumption_reading_scope BEFORE INSERT OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION validate_condominium_consumption_reading_scope();

CREATE TRIGGER trg_guard_confirmed_creation_intake BEFORE DELETE OR UPDATE ON "public"."condominium_creation_intakes" FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

CREATE TRIGGER trg_validate_creation_intake_scope BEFORE INSERT OR UPDATE ON "public"."condominium_creation_intakes" FOR EACH ROW EXECUTE FUNCTION validate_condominium_creation_intake_scope();

CREATE TRIGGER trg_block_closed_allocations BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_condominium_expense_allocation_total BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION guard_condominium_expense_allocation_total();

CREATE TRIGGER trg_guard_expense_allocation_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION guard_expense_allocation_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_paid_allocation_delete BEFORE DELETE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_paid_allocation_delete();

CREATE TRIGGER trg_validate_expense_allocation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_allocation_scope();

CREATE TRIGGER trg_guard_fiscal_carryover_compensation_total BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION guard_fiscal_carryover_compensation_total();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fiscal_carryover_compensation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_compensation_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryovers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fiscal_carryover_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryovers" FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_scope();

CREATE TRIGGER trg_guard_fiscal_year_opening_balance BEFORE UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION guard_fiscal_year_opening_balance();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_closed_fiscal_year_delete BEFORE DELETE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_delete();

CREATE TRIGGER trg_prevent_closed_fiscal_year_record_mutation BEFORE DELETE OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_record_mutation();

CREATE TRIGGER trg_prevent_closed_fiscal_year_reopen BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_reopen();

CREATE TRIGGER trg_prevent_fiscal_year_delete BEFORE DELETE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_year_delete();

CREATE TRIGGER trg_validate_fiscal_year_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION validate_condominium_fiscal_year_scope();

CREATE TRIGGER trg_guard_fund_integrity BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION guard_fund_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fund_scope BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION validate_condominium_fund_scope();

CREATE TRIGGER trg_block_closed_installments BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_installment_paid_amount BEFORE UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION guard_installment_paid_amount_update();

CREATE TRIGGER trg_guard_installment_parent_delete BEFORE DELETE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION guard_installment_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_new_installment_for_closing_member BEFORE INSERT ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION private.prevent_new_installment_for_closing_member();

CREATE TRIGGER trg_prevent_paid_installment_delete BEFORE DELETE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_paid_installment_delete();

CREATE TRIGGER trg_sync_expense_payment_status AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION sync_condominium_expense_payment_status();

CREATE TRIGGER trg_validate_installment_paid_amount BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_paid_amount();

CREATE TRIGGER trg_validate_installment_scope BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_scope();

CREATE TRIGGER trg_validate_installment_total BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_total();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_insurance_policies" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_insurance_policies BEFORE INSERT OR UPDATE ON "public"."condominium_insurance_policies" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_block_closed_ledger BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_ledger_entry_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION guard_ledger_entry_integrity();

CREATE TRIGGER trg_guard_ledger_parent_delete BEFORE DELETE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION guard_ledger_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_sync_condominium_fund_usage AFTER INSERT OR DELETE OR UPDATE OF fund_id, amount, direction ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION sync_condominium_fund_usage();

CREATE TRIGGER trg_validate_expense_payment_status BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_payment_status();

CREATE TRIGGER trg_validate_ledger_entry_deliberation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_deliberation_scope();

CREATE TRIGGER trg_validate_ledger_fund_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_fund_scope();

CREATE TRIGGER trg_validate_ledger_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_legal_cases" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_legal_case_scope BEFORE INSERT OR UPDATE ON "public"."condominium_legal_cases" FOR EACH ROW EXECUTE FUNCTION validate_condominium_legal_case_scope();

CREATE TRIGGER trg_assign_condominium_member_legacy_id BEFORE INSERT ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION assign_condominium_member_legacy_id();

CREATE TRIGGER trg_clean_deleted_member_owner_references AFTER DELETE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION clean_deleted_member_owner_references();

CREATE TRIGGER trg_normalize_condominium_member_contact BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_condominium_member_contact();

CREATE TRIGGER trg_normalize_condominium_member_names BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_condominium_member_names();

CREATE TRIGGER trg_normalize_zero_ownership_owner BEFORE INSERT OR UPDATE OF data ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_zero_ownership_owner();

CREATE TRIGGER trg_preserve_closing_condominium_member_history BEFORE INSERT OR UPDATE OF active, data ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION preserve_closing_condominium_member_history();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_member_delete_with_financial_history BEFORE DELETE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_member_delete_with_financial_history();

CREATE TRIGGER trg_prevent_member_unit_reassignment_with_financial_history BEFORE UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_member_unit_reassignment_with_financial_history();

CREATE TRIGGER trg_sync_member_unit_legacy_fields BEFORE INSERT OR UPDATE OF unit_id ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION sync_condominium_member_unit_legacy_fields();

CREATE TRIGGER trg_sync_portal_after_member_change AFTER DELETE OR UPDATE OF active, user_id, name, email, data, unit_id, condominium_id ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION private.sync_portal_after_member_change();

CREATE TRIGGER trg_validate_member_unit_scope BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION validate_condominium_member_unit_scope();

CREATE TRIGGER trg_ensure_table_millesimal_values AFTER INSERT ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION ensure_table_millesimal_values();

CREATE TRIGGER trg_guard_millesimal_table_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_integrity();

CREATE TRIGGER trg_guard_millesimal_table_parent_delete BEFORE DELETE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_millesimal_table_scope BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_table_scope();

CREATE TRIGGER trg_guard_millesimal_value_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_value_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_millesimal_value_scope BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_value_scope();

CREATE TRIGGER trg_block_closed_payments BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_payment_core_mutation BEFORE UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_payment_core_mutation();

CREATE TRIGGER trg_sync_installment_from_payments AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION sync_condominium_installment_from_payments();

CREATE TRIGGER trg_validate_payment_scope BEFORE INSERT OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION validate_condominium_payment_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_register_items" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_touch_condominium_request_updated_at BEFORE UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION private.touch_condominium_request_updated_at();

CREATE TRIGGER trg_validate_request_scope BEFORE INSERT OR UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_scope();

CREATE TRIGGER trg_validate_request_status BEFORE UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_status();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_suppliers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_tax_obligations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_tax_scope BEFORE INSERT OR UPDATE ON "public"."condominium_tax_obligations" FOR EACH ROW EXECUTE FUNCTION validate_condominium_tax_scope();

CREATE TRIGGER trg_guard_confirmed_unit_transformation_items_immutable BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_unit_transformation_items" FOR EACH ROW EXECUTE FUNCTION guard_confirmed_unit_transformation_items_immutable();

CREATE TRIGGER require_trusted_unit_transformation_confirmation_trg BEFORE INSERT OR UPDATE OF status ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION require_trusted_unit_transformation_confirmation();

CREATE TRIGGER trg_guard_confirmed_unit_transformation_immutable BEFORE DELETE OR UPDATE ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION guard_confirmed_unit_transformation_immutable();

CREATE TRIGGER validate_confirmed_unit_transformation_genealogy_trg BEFORE INSERT OR UPDATE OF status, source_unit_count, destination_unit_count ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION validate_confirmed_unit_transformation_genealogy();

CREATE TRIGGER prevent_condominium_unit_delete_with_financial_data BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_financial_data();

CREATE TRIGGER prevent_condominium_unit_delete_with_members BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_members();

CREATE TRIGGER require_confirmed_genealogy_for_unit_lifecycle_trg BEFORE UPDATE OF lifecycle_status, lifecycle_effective_date ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION require_confirmed_genealogy_for_unit_lifecycle();

CREATE TRIGGER trg_clear_member_unit_legacy_on_unit_delete AFTER DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION clear_condominium_member_unit_legacy_fields();

CREATE TRIGGER trg_ensure_unit_millesimal_values AFTER INSERT ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION ensure_unit_millesimal_values();

CREATE TRIGGER trg_guard_unit_scope_changes BEFORE UPDATE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION guard_unit_scope_changes();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_financial_unit_delete BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_financial_unit_delete();

CREATE TRIGGER trg_prevent_unsafe_condominium_unit_delete BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_condominium_unit_delete();

CREATE TRIGGER trg_validate_condominium_unit_relationship AFTER INSERT OR UPDATE OF condominium_id, data ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION validate_condominium_unit_relationship();

CREATE CONSTRAINT TRIGGER trg_validate_unit_owner_member_refs AFTER INSERT OR UPDATE OF condominium_id, data ON condominium_units DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_unit_owner_member_refs();

CREATE TRIGGER trg_validate_unit_workspace_scope BEFORE INSERT OR UPDATE OF workspace_id, condominium_id ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION validate_condominium_unit_workspace_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_documents" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_documents_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_documents" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_events" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_events_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_events" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER audit_condominium_work_progress_change AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_progress_change();

CREATE TRIGGER sync_condominium_work_financial_summary AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION sync_condominium_work_financial_summary_trigger();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_financial_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_financial_scope();

CREATE TRIGGER validate_condominium_work_progress_accounting_links BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_progress_accounting_links();

CREATE TRIGGER validate_condominium_work_progress_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER audit_condominium_work_change AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_reference_scope BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_reference_scope();

CREATE TRIGGER validate_condominium_work_scope BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."deadlines" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_deadlines BEFORE INSERT OR UPDATE ON "public"."deadlines" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_audit_document_ai_change AFTER UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION audit_document_ai_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_touch_documents_updated_at BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION touch_documents_updated_at();

CREATE TRIGGER trg_validate_document_ai_transition BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_document_ai_transition();

CREATE TRIGGER trg_validate_document_metadata BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_document_metadata();

CREATE TRIGGER trg_validate_scope_documents BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_portal_member_permissions BEFORE INSERT OR UPDATE OF email, user_id, member_id, condominium_id, data ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION private.apply_portal_member_permissions();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_portal_access_scope BEFORE INSERT OR UPDATE ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION validate_portal_access_scope();

CREATE TRIGGER trg_validate_portal_registration_request_scope BEFORE INSERT OR UPDATE ON "public"."portal_registration_requests" FOR EACH ROW EXECUTE FUNCTION validate_portal_registration_request_scope();

CREATE TRIGGER trg_prevent_profile_privilege_self_change BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_self_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_suppliers BEFORE INSERT OR UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();
