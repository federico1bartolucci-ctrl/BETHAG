-- BETHAG read-only ACL audit for a restored Supabase/PostgreSQL database.
-- Run separately on the restored local DB and on Production; compare the result sets.
-- This script performs SELECTs only. It does not alter grants, ownership, or defaults.

\echo '=== DATABASE / ROLE CONTEXT ==='
SELECT current_database() AS database_name,
       current_user AS audit_role,
       current_setting('server_version') AS postgres_version;

\echo '=== EFFECTIVE TABLE PRIVILEGES (public) ==='
WITH rels AS (
  SELECT c.oid, c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r','p','v','m','f')
),
roles AS (
  SELECT unnest(ARRAY['anon','authenticated','service_role']) AS role_name
),
privileges AS (
  SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) AS privilege_name
)
SELECT r.role_name, p.privilege_name,
       count(*) FILTER (WHERE has_table_privilege(r.role_name, rels.oid, p.privilege_name)) AS granted_objects,
       count(*) AS objects_checked
FROM rels
CROSS JOIN roles r
CROSS JOIN privileges p
WHERE EXISTS (SELECT 1 FROM pg_roles pr WHERE pr.rolname = r.role_name)
  AND (p.privilege_name <> 'MAINTAIN' OR current_setting('server_version_num')::int >= 170000)
GROUP BY r.role_name, p.privilege_name
ORDER BY r.role_name, p.privilege_name;

\echo '=== DIRECT TABLE ACL EXCEPTIONS (structural privileges) ==='
WITH rels AS (
  SELECT c.oid, c.relname, c.relowner, c.relacl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r','p','v','m','f')
),
expanded AS (
  SELECT rels.relname,
         pg_get_userbyid(a.grantee) AS grantee,
         a.privilege_type
  FROM rels
  CROSS JOIN LATERAL aclexplode(COALESCE(rels.relacl, acldefault('r', rels.relowner))) a
  WHERE pg_get_userbyid(a.grantee) IN ('anon','authenticated','service_role')
)
SELECT grantee, privilege_type, count(DISTINCT relname) AS object_count,
       string_agg(DISTINCT relname, ', ' ORDER BY relname) AS objects
FROM expanded
WHERE privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;

\echo '=== DEFAULT TABLE ACLS (postgres and supabase_admin; do not mutate managed ACLs) ==='
SELECT pg_get_userbyid(d.defaclrole) AS owner_role,
       COALESCE(n.nspname, '<global>') AS schema_name,
       CASE d.defaclobjtype WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES'
            WHEN 'f' THEN 'FUNCTIONS' ELSE d.defaclobjtype::text END AS object_type,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
       string_agg(a.privilege_type, ',' ORDER BY a.privilege_type) AS privileges,
       bool_or(a.is_grantable) AS any_grant_option
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) a
WHERE (n.nspname = 'public' OR d.defaclnamespace = 0)
  AND pg_get_userbyid(d.defaclrole) IN ('postgres','supabase_admin')
  AND (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      IN ('PUBLIC','anon','authenticated','service_role','postgres','supabase_admin')
GROUP BY d.defaclrole, COALESCE(n.nspname, '<global>'), d.defaclobjtype,
         CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END
ORDER BY owner_role, schema_name, object_type, grantee;

\echo '=== OWNERSHIP SUMMARY (public relations) ==='
SELECT pg_get_userbyid(c.relowner) AS owner_role, count(*) AS relation_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p','v','m','f')
GROUP BY pg_get_userbyid(c.relowner)
ORDER BY owner_role;
