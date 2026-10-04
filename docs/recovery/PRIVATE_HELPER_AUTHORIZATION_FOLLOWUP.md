# Private helper authorization boundary — follow-up (2026-10-04)

## Verified catalog state

Read-only inspection of production project `tctcgptrsmvgajqjgnev` returned:

| Schema | authenticated USAGE | anon USAGE | service_role USAGE |
|---|---:|---:|---:|
| `private` | yes | no | no |
| `public` | yes | yes | yes |

Selected private SECURITY DEFINER helper ACLs observed:

| Function | EXECUTE roles observed |
|---|---|
| `private.claim_first_workspace_admin(uuid)` | authenticated, postgres |
| `private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)` | authenticated, postgres, service_role |
| `private.complete_portal_registration(text,text,text)` | authenticated, postgres, service_role |
| `private.delete_condominium(uuid,bigint,text)` | authenticated, postgres, service_role |
| `private.admin_approve_portal_registration(uuid,uuid)` | postgres only |
| `private.confirm_condominium_member_transfer(...)` | postgres only |
| `private.close_condominium_member_transfer(uuid)` | postgres only |

## Assessment

The private schema's USAGE grant to `authenticated`, combined with EXECUTE grants on selected helpers, means those functions are not protected from SQL-level name resolution solely by residing in a schema named `private`. Whether a client can invoke them through PostgREST depends on the project's API exposed-schema configuration and API role behavior; the database catalog does not establish that configuration.

The repository branch does not contain `supabase/config.toml` at the expected path, so the exposed-schema list could not be verified from version-controlled configuration in this pass. No assertion is made that `private` is exposed by the API, and no direct REST invocation was attempted. Public wrappers remain the intended client entry points based on the source reviewed.

## Safe next action

Recover or explicitly record the active Supabase API exposed-schema configuration, then compare it with the private helper ACLs. If `private` is exposed, prepare a forward-only migration to revoke client EXECUTE from helpers that are only meant to be called by trusted public SECURITY DEFINER wrappers, preserving any helper deliberately called by authenticated SQL. Before changing grants, inspect every function body and caller, and validate behavior in an isolated database.

No production DDL, ACL, data, or migration-history changes were performed. This is a focused authorization review, not a full replay or comprehensive QA/collaudo.
