# Targeted RLS and trigger inventory: members, units, transfers

Date: 2026-10-01  
Source: read-only PostgreSQL catalog inspection of production project. This is a review note, not a migration.

## Row-level security observed

- `condominium_member_transfers`: authenticated users may perform all operations when `private.can_manage_workspace_module(workspace_id, 'condomini')` passes, for both USING and WITH CHECK.
- `condominium_unit_transformations`: authenticated users have manager-only all-operation policy using the same workspace module gate.
- `condominium_members`: manager read/write access is combined with self-user visibility and a fallback for active, unlinked records whose email matches the JWT email; resident self visibility also requires a non-archived condominium.
- `condominium_units`: managers can read, insert, update and delete subject to module access. Resident/council SELECT policy joins active portal access to active members and a non-archived condominium.

These predicates are catalog facts, not a security certification. In particular, the fallback email-linkage branches and combinations of permissive policies need runtime tests using distinct authenticated identities and workspaces. Review helper functions, grants, and JWT email normalization together before launch.

## Trigger protections observed

Production has triggers covering:
- member contact/name normalization;
- archived-condominium mutation prevention;
- member deletion or unit reassignment when financial history exists;
- member/unit scope validation and synchronization of legacy unit fields;
- portal synchronization after member changes;
- unit deletion guards for members and financial data;
- unit lifecycle genealogy validation;
- immutable confirmed unit transformations and trusted confirmation;
- unit/millesimal initialization and owner-reference validation.

Trigger presence confirms database-side safeguards are installed, but not that every business transition succeeds or that the guards cover all edge cases. Function bodies and execution behavior still need isolated tests.

## QA test matrix (synthetic identities/data only)

| Scenario | Expected security/integrity property | Status |
|---|---|---|
| Manager in workspace A reads/updates A transfer | Allowed only with condominium-module authorization | Not runtime-tested |
| Manager in workspace A accesses workspace B transfer | Denied | Not runtime-tested |
| Resident reads own active member/unit | Only own authorized condominium/unit data | Not runtime-tested |
| Resident attempts another resident's member/unit | Denied | Not runtime-tested |
| Unlinked member email matches JWT | Access follows verified invite/link policy, no cross-account disclosure | Not runtime-tested |
| Inactive/archived membership or portal access | No resident portal visibility | Not runtime-tested |
| Member unit reassignment with financial history | Rejected or routed through audited transfer flow | Not runtime-tested |
| Confirmed transformation modified/deleted | Rejected; genealogy and review requirements enforced | Not runtime-tested |
| Unit deleted with financial/member references | Rejected or archived through supported lifecycle | Not runtime-tested |

## Conclusion

The catalog shows several intentional database safeguards and role predicates. No runtime RLS test was performed, so isolation and privacy remain unverified. Keep production unchanged. Continue with function-body/source reconciliation and synthetic QA only after a clean, complete baseline is available.
