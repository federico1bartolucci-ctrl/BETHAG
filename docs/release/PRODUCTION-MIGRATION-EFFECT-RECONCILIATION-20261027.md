# BETHAG — Live effect-by-effect migration reconciliation

**Captured:** 2026-10-27, read-only Supabase catalog/ledger queries  
**Status:** RECONCILED FOR REVIEW; NOT APPROVED FOR PRODUCTION EXECUTION  
**Production:** `tctcgptrsmvgajqjgnev`  
**Observed Production migration ledger:** 244 rows; head `20261022202747_harden_close_member_transfer_search_path`  
**Safety:** no Production migration was applied and no ledger row was changed during this review.

## Executive result

The ten canonical incremental migrations originally listed after the Production head were compared with their SQL bodies and the current effective catalog. The review found one further defect: the service-role path for the `SECURITY INVOKER` close-transfer wrapper is not actually complete in Production or QA, despite the intent recorded in `20261023000733_use_invoker_for_close_transfer_rpc.sql`. A new idempotent forward-only correction was added as migration **11**: `20261027110000_repair_service_role_transfer_invoker_path.sql`. Do not edit or replay the already-recorded migration 9 to repair its history.

The new file is an additional candidate release migration, not applied anywhere. Therefore the current release candidate has **11 pending incremental migrations** after the observed Production head, subject to the gates below.

## Live baseline and decisive differences

| Check | Production before cutover | QA evidence / required target |
|---|---|---|
| Public tables/partition relations | 47 | All four non-Production environments also have 47 |
| Effective `authenticated` privileges | SELECT 47, INSERT 41, UPDATE 41, DELETE 42; MAINTAIN 33; TRUNCATE/REFERENCES/TRIGGER 0 | Three full-schema QA environments match the CRUD counts and have MAINTAIN 0 |
| Effective `service_role` privileges | CRUD and TRUNCATE/REFERENCES/TRIGGER on 47; MAINTAIN 47 | QA has CRUD and structural privileges on 47; MAINTAIN 0 |
| Effective `anon` table privileges | 0 on all 47 | 0 on all 47 |
| `postgres` owner, `public` table defaults | anon CRUD + MAINTAIN; authenticated CRUD + MAINTAIN; service_role CRUD + structural + MAINTAIN | QA defaults give authenticated CRUD and service_role CRUD + structural privileges, without MAINTAIN or anon table defaults |
| Supabase-managed defaults | `supabase_admin`-owned defaults include MAINTAIN entries | Platform-managed; document only; never alter them in app migrations |
| Public routines executable by PUBLIC in `public`/`private` | Exactly four: private and public closure-check helpers plus the two named trigger routines | Exactly two in QA: `public.normalize_zero_ownership_owner()` and `public.preserve_closing_condominium_member_history()` |
| Public close-transfer wrapper | EXECUTE for authenticated/service_role, denied to anon, but still SECURITY DEFINER | QA wrapper is SECURITY INVOKER |
| Private close-transfer path | authenticated can use schema, but service_role has neither private schema USAGE nor function EXECUTE | QA is inconsistent: service_role schema USAGE differs by environment and function EXECUTE is absent in all queried QA environments |
| Migration history | 244 rows, head `20261022202747`; no pending canonical migration version is recorded | Histories have environment-specific aliases, duplicate/QA-only entries and must be preserved |

The current Production CRUD counts are a baseline to preserve. Do not use the default-privilege migration to rewrite current table grants. Six relations have at least one ordinary CRUD privilege missing for `authenticated`; review those current-table exceptions against RLS and application call paths rather than applying blanket GRANTs.

## Effect-by-effect matrix

Each migration's GitHub blob SHA identifies the reviewed repository file at the time of capture. It is a Git blob identifier, not a SHA-256 digest. All steps are to be applied one migration at a time in ascending version order, only after a fresh preflight. Save pre- and postflight output for every step. Any unexpected state means STOP.

| # | Canonical migration | Reviewed blob SHA | Production effect observed before | QA comparison | Required precheck and postcheck |
|---:|---|---|---|---|---|
| 1 | `20261022210629_restrict_private_function_public_execute.sql` | `1476e921de9a43e3c046ef448a91c28d3515fd8c` | Not complete: `private.check_condominium_member_transfer_closure(uuid)` remains PUBLIC-executable | PUBLIC is absent from the helper ACLs in QA | Before: inventory every private routine with PUBLIC EXECUTE and confirm no intended anonymous entrypoint. After: zero PUBLIC EXECUTE on private routines; the two closure helpers remain explicitly executable by authenticated/service_role as needed. |
| 2 | `20261022210630_harden_default_privileges_and_private_execute.sql` | `09751ed091c507d1db13ac48deba5f336e835a13` | Public-table defaults still contain anon/authenticated/service_role MAINTAIN; current private PUBLIC execution also remains | QA has no app-role MAINTAIN defaults and no PUBLIC-executable private helper | Before: capture global and schema-specific defaults separately for owner postgres; inspect private routine defaults. After: schema-specific public table defaults for anon/authenticated are revoked and private routine PUBLIC defaults/existing grants are revoked. Migration 6 separately removes global table defaults; do not treat step 2 alone as sufficient. Never alter supabase_admin defaults. |
| 3 | `20261022213544_restrict_close_member_transfer_execute.sql` | `7cf291acd1c1734959c5fef6c6f0477bbe0e24bf` | Desired wrapper ACL already effective: authenticated/service_role EXECUTE; anon/PUBLIC denied. This is an observed effect, not proof this canonical migration ran | Wrapper ACL matches in QA | Before: capture exact function identity and grants. After: same allowlist. Apply only as the idempotent canonical migration in the reviewed forward sequence; do not claim it was previously applied based on catalog state alone. |
| 4 | `20261022233440_align_public_function_execute.sql` | `6987025124872b7f98c53c689bb014262624cba6` | Not complete: both closure-check helpers remain PUBLIC-executable; two named trigger functions are intended exceptions | QA has only the two trigger exceptions PUBLIC-executable | Before: capture full public/private routine ACL inventory, defaults, routine owners and SECURITY DEFINER flags. After: PUBLIC EXECUTE allowlist must be exactly the two named trigger functions; closure helpers granted to authenticated/service_role; routine defaults tightened. This broad revoke has the largest function-compatibility blast radius; stop if any additional PUBLIC entrypoint is required. |
| 5 | `20261023000001_revoke_authenticated_maintain.sql` | `b5c1cab798c61eeb63794400f6087767596c7372` | Partially satisfied: authenticated has no TRUNCATE/REFERENCES/TRIGGER, but still has MAINTAIN on 33 relations | QA has zero MAINTAIN and zero structural grants for authenticated | Before: save exact relation/ACL snapshot. After: authenticated/anon MAINTAIN 0; authenticated TRUNCATE/REFERENCES/TRIGGER 0; preserve current authenticated CRUD counts (47/41/41/42). |
| 6 | `20261023000002_revoke_default_maintain.sql` | `8e55313ed2c9f6009f53c8f0ca1eb9dfbd042f79` | Not complete: postgres-owned public defaults grant anon CRUD+MAINTAIN, authenticated CRUD+MAINTAIN, service_role CRUD+structural+MAINTAIN | QA has no anon table defaults and no app-role MAINTAIN defaults | Before: capture owner + schema + object type + grantee + privilege for both global and public-schema ACLs. After: no anon table defaults; no authenticated MAINTAIN/TRUNCATE/REFERENCES/TRIGGER defaults; no service_role MAINTAIN defaults. Leave postgres-owner privileges and all supabase_admin-owned defaults unchanged. |
| 7 | `20261023000003_revoke_service_role_maintain.sql` | `ca2115dbbbb64fd3868b54d9651f65e299a62edb` | Not complete: service_role has MAINTAIN on 47 relations | QA has zero service_role MAINTAIN | Before: compare live sorted relation names and relkinds against the explicit 47-table list in the file; stop on any missing/extra relation. After: service_role MAINTAIN 0; its CRUD and structural privileges remain on all 47. |
| 8 | `20261023000004_application_default_table_privileges.sql` | `20ebaed750f028e6e10172c7a85e67356a2ef21d` | Desired public-schema defaults are already present for authenticated CRUD and service_role CRUD+structural, but must be verified again after step 6 | QA defaults match the intended roles/privileges | Before: capture default ACLs after step 6. After: authenticated defaults exactly CRUD; service_role defaults CRUD+REFERENCES/TRIGGER/TRUNCATE; neither gets MAINTAIN. This affects future tables, not current table ACLs. |
| 9 | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | `bcbde9f82db1c931b5d2503987fa1da2b2b13b0a` | Not complete: public wrapper is SECURITY DEFINER; service_role lacks private schema USAGE and private implementation EXECUTE | QA wrapper is SECURITY INVOKER, but service_role private EXECUTE is missing in all queried QA environments; schema USAGE is inconsistent | Before: verify private implementation auth/workspace/accounting guards and capture wrapper/function ACLs. After: wrapper SECURITY INVOKER; authenticated/service_role schema USAGE and implementation EXECUTE; PUBLIC/anon denied. Run authenticated, unauthorized, no-user-JWT backend, open-balance and rollback tests. |
| 10 | `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql` | `5b7a34ee56f4a1cb1b1a145760aff5880e84e5f7` | Not complete: the two closure helpers remain PUBLIC-executable | QA effect is present under environment-specific versions `20261027093101`, `20261027093117`, `20261027093126`, `20261027093119` respectively | Before: confirm the helper identity/ACL and preserve both trigger exceptions. After: PUBLIC/anon cannot execute either closure helper; authenticated/service_role can. Preserve the two trigger PUBLIC exceptions. |
| 11 | `20261027110000_repair_service_role_transfer_invoker_path.sql` | Added as a forward-only correction after live comparison | Not complete: service_role lacks private schema USAGE and private implementation EXECUTE | Same function EXECUTE gap across QA; schema USAGE varies | Before: run effective privilege checks, not only raw ACL inspection. After: `has_schema_privilege('service_role','private','USAGE')` and `has_function_privilege('service_role','private.close_condominium_member_transfer(uuid)','EXECUTE')` both true; anon remains denied; authenticated remains permitted. Do not edit or replay migration 9. |

## QA rehearsal of the new forward correction — 2026-10-27

The new correction was applied only to the four non-Production environments using the exact SQL in `20261027110000_repair_service_role_transfer_invoker_path.sql`. The Supabase migration API assigned environment-specific ledger versions; preserve these rows as observed and do not rewrite them to the repository version:

| Environment | Project ref | Ledger rows after correction | Generated version |
|---|---|---:|---|
| develop | `wvokvcfglduxmjxlnfeh` | 17 | `20261027101109` |
| continuity QA | `srkucrdcoswlozifvztr` | 19 | `20261027101123` |
| member-transfer QA | `gcorwfvnslnehcxmtixn` | 17 | `20261027101130` |
| migration-reconciliation QA | `mxhciszzpqzvsaqcnwhg` | 19 | `20261027100507` |

The Production postflight assertion script was also exercised read-only on the QA environments. Continuity, member-transfer, and migration-reconciliation QA passed every ACL/default-ACL/function assertion and stopped only at the expected Production-specific ledger count/head guard (their ledgers are not 255/head `20261027110000`). Develop stopped earlier on the intentional current-table CRUD divergence (authenticated has CRUD on 47 relations there versus Production's 41/41/42 writes); this confirms develop must not be treated as ACL-parity evidence. No Production SQL was executed. Post-application read-only checks **passed in all four**: service_role has private-schema USAGE and EXECUTE on the private implementation; authenticated retains EXECUTE; anon remains denied; the public wrapper remains SECURITY INVOKER; service_role can execute the public wrapper and anon cannot. This verifies the permission path, not the business operation itself. Transfer success/denial/rollback tests remain pending. Production was not changed.

## Definitive candidate execution order

1. Fresh preflight and freeze schema-changing activity.
2. Apply and check migrations 1 through 8 one at a time, saving output after each.
3. Apply migration 9 (`SECURITY INVOKER`) and immediately verify both positive and negative permission paths. Do not reopen traffic if the service-role path or user-authorized path fails.
4. Apply migration 10 (closure-helper PUBLIC EXECUTE correction).
5. Apply migration 11 (service-role private invocation-path correction).
6. Run the full postflight SQL, recapture the migration ledger and compare all original 244 rows to the saved preflight snapshot. Expected ledger count after all eleven approved migrations is 255, with exact canonical versions/names for the eleven new rows and no deletion/rewrite of historical rows.
7. Run application smoke tests APP-01–APP-15 against an isolated environment and record evidence.
8. Obtain named written approval for the exact commit, checksums, sequence, maintenance window, rollback criteria, and the documented physical-backup residual risk. Until then, NO-GO.

## Migration ledger mapping — preserve, do not normalize by deletion

- Production stays at 244 rows until cutover. Never insert the five clean-bootstrap baseline records into existing Production, delete old Production records, or rename historical entries.
- QA entries with equivalent-looking effects are not automatically interchangeable. Known aliases include continuity `20261022213540`, member-transfer `20261022213542`, and several `202610270120xx`/`202610270121xx` records; migration-reconciliation has historical `20261022230901`/`20261022230908` records and QA-only `20261023010544`/`20261023010548` tests. The helper correction is recorded as `20261027093101` (develop), `20261027093117` (continuity), `20261027093126` (member-transfer), and `20261027093119` (migration-reconciliation).
- Keep every row. For future maintenance, map each alias to exact SQL source/effect evidence and classify QA-only tests as such; do not rewrite live history to make version strings look canonical.

## Go/no-go and stop conditions

**No Production execution is authorized by this document.** Stop before the next migration if the relation inventory, migration head/count, any function owner/security flag, any expected ACL, or any default ACL differs from the captured preflight without a reviewed explanation. After each migration, run the corresponding postcondition; if it fails, stop and retain logs. Do not use an in-place restore as a test or modify supabase_admin defaults. The provider physical backup remains untested; retain it as a documented residual risk requiring explicit written acceptance by the named approver.
