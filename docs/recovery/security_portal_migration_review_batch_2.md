# Security and portal migration review — batch 2

Branch: `bethag-migration-repair`  
Scope: static review of 12 migration files in `supabase/migrations`.  
Disposition: documentation only; no migration replay, runtime test, production write, reset, merge, or deploy.

## Files reviewed

- `20260930300000_harden_accounting_rls_permissions.sql`
- `20260930310000_harden_remaining_module_rls.sql`
- `20260930320000_harden_portal_approval_rpc.sql`
- `20260930360000_harden_resident_document_visibility.sql`
- `20260930380000_harden_resident_unit_visibility.sql`
- `20260930390000_harden_portal_registration_response.sql`
- `20260930400000_harden_portal_access_visibility.sql`
- `20260930410000_portal_publication_visibility.sql`
- `20260930430000_optimize_portal_rls_auth_initplan.sql`
- `20260930440000_optimize_portal_authorization_helpers.sql`
- `20260930450000_harden_resident_request_member_scope.sql`
- `20260930460000_harden_condominium_member_visibility.sql`

## Static findings

### Workspace and module authorization

- Accounting mutation policies are changed from generic workspace-manager checks to the explicit `contabilita` module permission. The migration intentionally leaves read policies unchanged; validate each command-specific policy and role combination in QA.
- Audit log and register management are restricted to workspace admins. Supplier mutations use `fornitori`; fiscal carryovers and portal registration reviews use `contabilita` and `portale` respectively.
- These changes depend on the exact behavior and grants of `private.can_manage_workspace_module` and on the pre-existing policy names. They must be checked against the full production policy inventory and a clean replay.

### Registration approval and response

- `admin_approve_portal_registration` locks a pending or email-mismatch request, validates an active matched member, derives its workspace, checks the portal module permission, then updates the member, portal access, workspace membership, profile, and request status in one function invocation.
- The approval RPC is a `SECURITY DEFINER` function with an empty search path and schema-qualified public objects. QA must verify owner privileges, function execute grants, workspace isolation, duplicate/conflicting identities, retry/idempotency, and rollback if any intermediate write fails.
- `complete_portal_registration` returns a reduced `email_mismatch` response without returning the matched member identifier or registered email. However, it still identifies a member using a name OR a normalized fiscal-code match; test duplicate names, malformed/blank fiscal codes, multiple matches, and identity collision cases.
- The registration function's no-match path can create a pending request with a workspace inferred from condominium name or a sole-workspace fallback. Verify behavior for zero/multiple workspaces, ambiguous condominium names, and whether all request fields remain scoped to the intended workspace.

### Resident and council visibility

- Document SELECT policy allows workspace document-module access or resident/council access to records explicitly marked `publication = 'Condiviso'`.
- Assembly and communication visibility is split between workspace module access and explicit portal publication flags.
- Portal self-read is restricted to active access rows, preferring `user_id` and using email only when `user_id` is null.
- Unit visibility permits authorized workspace module access or a resident/council portal record joined to an active member assigned to that unit. Test co-owners, tenants, council roles, inactive links, email changes, and mismatched linked user IDs.
- Member SELECT visibility grants managers workspace access and residents access to their linked identity. The email fallback requires an active member, while the direct `user_id = auth.uid()` branch does not explicitly require `active = true`; confirm whether inactive linked members should remain visible and ensure no private fields are exposed beyond the intended record.
- Resident-created requests require the requester user ID to match the authenticated user and any supplied member ID to resolve to an active member in the same condominium linked by user ID or email. Validate all insert fields and confirm the manager pathway cannot cross workspace/condominium boundaries.

### Performance optimization

- Two migrations wrap auth context calls in scalar SELECTs to encourage per-statement evaluation in RLS policies and helper functions.
- The comments describe these as performance-only changes, but semantic equivalence must be verified against the prior function and policy definitions. Compare both effective predicates and query plans; performance changes must not weaken tenant isolation.

## QA cases required

1. Admin, collaborator with each relevant module permission, collaborator without permission, resident, council, unauthenticated user, and inactive user.
2. Cross-workspace and cross-condominium reads/writes for documents, assemblies, communications, units, members, requests, suppliers, fiscal carryovers, and accounting records.
3. Published/unpublished and shared/unshared content; active/inactive portal access; linked and unlinked user identities; normalized and changed emails.
4. Registration with exact email, email mismatch, duplicate name, duplicate fiscal code, no match, ambiguous match, and retry after partial or completed approval.
5. RPC execute grants and security-definer ownership; verify all multi-table changes are atomic and failures leave no partial state.
6. Compare authorization behavior before/after performance optimizations and inspect query plans with representative data volumes.

## Conclusion

This batch provides useful static evidence of module-scoped authorization, publication-aware portal visibility, and registration identity handling. It does not certify the effective production permissions or establish runtime correctness. The broader migration baseline remains blocked by the previously documented history/source reconciliation and dependency gaps. Do not apply these migrations or infer launch readiness from this review alone.
