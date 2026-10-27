-- BETHAG local restore audit (read-only).
-- Run against the restored local PostgreSQL database:
--   psql -X -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f scripts/audit-local-restore.sql
-- This script does not change schema, data, grants, or owners.

\echo '=== 1. DATABASE / SERVER ==='
SELECT current_database() AS database_name,
       current_user AS audit_role,
       version() AS postgres_version;

\echo '=== 2. APPLICATION RELATION COUNTS ==='
SELECT n.nspname AS schema_name,
       c.relkind,
       count(*) AS object_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'private')
  AND c.relkind IN ('r','p','v','m','f')
GROUP BY n.nspname, c.relkind
ORDER BY n.nspname, c.relkind;

\echo '=== 3. TABLE DATA COUNTS (public tables) ==='
SELECT format(
  'SELECT %L AS table_name, count(*) AS row_count FROM %I.%I;',
  schemaname || '.' || tablename, schemaname, tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

\echo '=== 4. CONSTRAINTS: COUNTS AND VALIDATION ==='
SELECT con.contype,
       count(*) AS total,
       count(*) FILTER (WHERE NOT con.convalidated) AS not_validated
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
WHERE n.nspname IN ('public','private')
GROUP BY con.contype
ORDER BY con.contype;

\echo '=== 5. INVALID / NOT-READY INDEXES ==='
SELECT n.nspname AS schema_name, tbl.relname AS table_name, idx.relname AS index_name,
       i.indisvalid, i.indisready
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class tbl ON tbl.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tbl.relnamespace
WHERE n.nspname IN ('public','private')
  AND (NOT i.indisvalid OR NOT i.indisready)
ORDER BY 1,2,3;

\echo '=== 6. OBJECT OWNERS ==='
SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','private')
  AND c.relkind IN ('r','p','v','m','S','f')
ORDER BY 1,2;

\echo '=== 7. DIRECT TABLE ACLS (not effective privilege checks) ==='
SELECT n.nspname AS schema_name, c.relname AS object_name,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) x
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p','v','m')
  AND x.grantee IN (0, (SELECT oid FROM pg_roles WHERE rolname='anon'),
                       (SELECT oid FROM pg_roles WHERE rolname='authenticated'),
                       (SELECT oid FROM pg_roles WHERE rolname='service_role'))
ORDER BY 1,2,3,4;

\echo '=== 8. DEFAULT PRIVILEGES ==='
SELECT pg_get_userbyid(d.defaclrole) AS owner_role,
       n.nspname AS schema_name,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       d.defaclobjtype AS object_type, x.privilege_type, x.is_grantable
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) x
WHERE d.defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
  AND x.grantee IN (0, (SELECT oid FROM pg_roles WHERE rolname='anon'),
                       (SELECT oid FROM pg_roles WHERE rolname='authenticated'),
                       (SELECT oid FROM pg_roles WHERE rolname='service_role'))
ORDER BY 1,2,3,4,5;

\echo '=== 9. RLS STATUS AND POLICY COUNTS ==='
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       count(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public' AND c.relkind IN ('r','p')
GROUP BY n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
ORDER BY c.relname;

\echo '=== 10. SEQUENCE OWNERS AND ACLS ==='
SELECT n.nspname AS schema_name, c.relname AS sequence_name,
       pg_get_userbyid(c.relowner) AS owner,
       c.relacl AS acl
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='S' AND n.nspname IN ('public','private')
ORDER BY 1,2;

\echo '=== END: read-only audit; empty invalid-index and unvalidated-constraint sections are expected ==='
