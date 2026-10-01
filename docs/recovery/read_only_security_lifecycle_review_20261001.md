# Read-only security and lifecycle review — 2026-10-01

## Scope
Read-only review of the production Supabase catalog and the GitHub `main` application source. No SQL, data, Auth settings, branch, or deployment changes were made.

## Findings

### Security advisor
- Supabase Security Advisor reports one warning: Auth leaked-password protection is disabled.
- The advisor's remediation guidance is https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- This is a configuration follow-up, not a finding that credentials have been exposed. Enable only after reviewing the Auth policy and communicating any signup/password-reset impact.

### Row-level security inventory
- The production catalog inspection reported RLS enabled on all observed public tables.
- The policy inventory returned 102 public-schema policies; none targets the `anon` role.
- One policy is declared for `public` on `condominium_audit_log`, but its read predicate requires `private.is_workspace_manager(workspace_id)`. This should still be included in the isolated multi-role RLS test matrix; policy inventory alone does not prove runtime isolation.
- This was a catalog-level inspection only. No cross-workspace authenticated-user tests were executed.

### Transfer lifecycle constraint conflict — confirmed in production catalog
The table `public.condominium_member_transfers` has two validated CHECK constraints:
- `condominium_member_transfers_status_check` allows `Bozza`, `Confermato`, `Chiuso`, `Annullato`.
- `condominium_member_transfers_status_ck` allows `Bozza`, `Confermato`, `Annullato`, excluding `Chiuso`.

Because both constraints apply, setting a transfer to `Chiuso` violates the second constraint. The lifecycle close operation can therefore fail even though another constraint permits the value. Correct only in an isolated QA database after the full baseline is replayable; consolidate to one canonical constraint and test accepted/rejected states before any production migration.

### Frontend lifecycle integration gap
Exact-string inspection of `src/main.tsx` on `main` found no calls to:
- `confirm_condominium_member_transfer`
- `close_condominium_member_transfer`
- `transform_condominium_units`

GitHub code search on the default branch also returned no matches for the transfer/transform RPC identifiers. The production database exposes public wrappers for transfer operations, but a direct UI workflow was not found in the inspected main-branch source. This is a static finding; other indirect mechanisms or uninspected source locations are not ruled out. Add explicit UI-to-RPC integration and runtime tests before claiming the transfer/transformation journeys are complete.

### Performance advisor
- Supabase Performance Advisor reports 70 unused-index findings (INFO).
- These are not sufficient grounds for automatic index removal: the observed usage window may not represent periodic workflows, and dropping indexes can harm query performance. Review against representative workload and query plans in QA.

## QA/release gate
- Build status previously observed green is not equivalent to functional or security certification.
- Still required: recover/reconcile the missing original migration sources; establish a complete isolated replayable baseline; test RLS with distinct roles and workspaces; exercise payment, fiscal carryover, transfer closure, portal revocation, and unit transformation workflows; then perform a reviewed release with explicit production approval.
- Production remains read-only for this review. No merge or deployment is authorized by this report.
