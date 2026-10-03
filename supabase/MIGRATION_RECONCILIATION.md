# Supabase migration reconciliation

Branch: `fix/portal-identity-flow-20261003`  
Production project: `tctcgptrsmvgajqjgnev`

This ledger distinguishes filename/version equality from functional equivalence. A matching behavior in the live catalog is not, by itself, permission to replay an old migration or rewrite production migration history.

## Verified functional correspondences

| Branch migration | Production migration history / live object | Reconciliation |
|---|---|---|
| `20260928070000_save_condominium_rpc.sql` | `20260928072127_add_save_condominium_rpc`, `20260928072401_lock_down_save_condominium_rpc`; live `private.save_condominium` plus `public.save_condominium` invoker wrapper | Superseded implementation. Preserve the live private implementation and wrapper; do not replay the branch's SECURITY DEFINER public function. |
| `20260928081000_delete_condominium_rpc.sql` | `20260928164852_complete_condominium_delete_rpc_and_rls_optimization`, `20260928164904_restrict_delete_condominium_rpc_execute`, `20260930080838_complete_condominium_hard_delete`; live `private.delete_condominium` plus `public.delete_condominium` invoker wrapper | Superseded and expanded implementation. Live deletion includes security-code and financial/history handling; do not replay the older delete body. |
| `20260928090000_collaborator_module_write_permissions.sql` | `20260928042328_enforce_collaborator_module_permissions`, `20260928042333_refine_collaborator_permission_scope` and later RLS/security migrations; live `private.can_manage_workspace_module` | Functional lineage exists, but not proven as a one-file/one-migration equivalent. Keep as historical source pending full policy-by-policy diff. |
| `20260928093000_align_portal_request_access.sql` | `20260928040840_allow_portal_residents_read_condominiums` and later portal identity/RLS hardening; live `private.can_access_resident_condominium` and `private.can_access_condominium` | Superseded access logic. Live checks active condominium/member and portal identity binding; do not replace with the older email-oriented predicate. |

## Counts and limits

The inspected branch contains 132 SQL migration files; production history contains 169 records. 66 branch files have exact version matches. The remaining 66 are not necessarily unapplied: production contains renamed, split, combined, and superseded migrations. Exact equivalence for those files requires comparing their DDL effects and dependencies against the live catalog and the production history.

No production migration history has been edited by this reconciliation. Do not apply any unmatched historical SQL solely to make version numbers agree. The remaining mismatches must be classified as: already represented by later live behavior; represented by multiple production migrations; genuinely missing; or unsafe/obsolete and requiring a forward corrective migration.
