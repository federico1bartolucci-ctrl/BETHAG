# Isolated QA environment availability check

Date: 2026-10-01

## Scope and safety

This is a read-only environment inventory. No SQL was executed against either Supabase branch, no migration was applied, no reset or rebase was run, no Edge Function was invoked or deployed, and production was not modified.

Production project: `tctcgptrsmvgajqjgnev`.

## Supabase branch inventory

The Supabase branch listing returned:

| Branch | Project ref | Reported status | Data copied from production |
|---|---|---|---|
| `bethag-continuity-qa` | `srkucrdcoswlozifvztr` | `MIGRATIONS_FAILED` | No (`with_data: false`) |
| `bethag-develop` | `wvokvcfglduxmjxlnfeh` | `FUNCTIONS_DEPLOYED` | No (`with_data: false`) |

The project-detail lookup returned `Project not found` for both branch refs, so project metadata and precise failure diagnostics could not be retrieved through that action in this check. Migration, table, and Edge Function inventory actions did return results for both refs.

## Read-only comparison

### `bethag-continuity-qa`

- 16 migration-history records were returned.
- 12 public tables were listed, including core workspace/profile/condominium and communications tables.
- The seven deployed Edge Functions were listed as active; `bethag-send-email` was version 7.
- The branch is explicitly marked `MIGRATIONS_FAILED`; do not treat it as a validated replay baseline.

### `bethag-develop`

- 36 migration-history records were returned.
- 20 public tables were listed, including portal access/registration, insurance, unit and transformation tables.
- The seven deployed Edge Functions were listed as active; `bethag-send-email` was version 8.
- The branch has a broader object inventory than continuity QA, but this alone does not certify schema completeness, migration reproducibility, or frontend/backend contract compatibility.

## Decision

Neither existing branch is currently certified as a disposable QA environment for the pending communication-persistence/email workflow. The production database remains read-only and is not a fallback test target.

Do not reset, rebase, replay migrations, or delete either branch as a speculative repair. First retrieve the failed migration's exact error and reconcile the complete intended migration baseline with production and repository snapshots. If an entirely new Supabase project is required, obtain the organization choice and present the current creation cost for explicit user confirmation before creating it.

## QA exit conditions

Before functional email-flow testing:

1. Establish an isolated, reproducible schema baseline from reconciled source migrations and snapshots.
2. Confirm the application build and type checks against that baseline.
3. Use synthetic workspace, administrator, collaborator, condominium, member, and communication records.
4. Replace email delivery with a mock/provider test mode; no real recipients.
5. Verify communication persistence returns the actual database primary key and that the frontend passes that key to the deployed-compatible Edge Function.
6. Test full success, partial delivery, provider failure, retry/idempotency, duplicate submission, authorization denial, recipient scoping, and status refresh.
7. Record results and only then consider a narrowly scoped branch code correction and review.

**Status: QA baseline blocked; no runtime certification; production unchanged.**
