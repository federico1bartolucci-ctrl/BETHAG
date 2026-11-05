import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const url=process.env.DATABASE_URL;
assert.ok(url,'DATABASE_URL required');
const target=new URL(url);
assert.ok(['localhost','127.0.0.1','::1'].includes(target.hostname),'Only disposable local PostgreSQL is allowed');
assert.ok(!/supabase\\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url),'Remote Supabase URL refused');
const migration=await readFile('supabase/rebuild/drafts/20261105010000_reconcile_postgres_public_table_default_acl.sql','utf8');
const setup=`BEGIN;
DO $r$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $r$;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES,TRIGGER,TRUNCATE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT,INSERT,UPDATE ON TABLES FROM authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT ON TABLES TO service_role;
CREATE TEMP TABLE admin_acl_before AS SELECT defaclacl::text AS acl FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole AND defaclnamespace='public'::regnamespace AND defaclobjtype='r';`;
const verify=`
DO $v$ DECLARE a text[]; s text[]; n int; m int; BEGIN
 SELECT array_agg(x.privilege_type ORDER BY x.privilege_type) INTO a FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) x WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' AND x.grantee='authenticated'::regrole;
 SELECT array_agg(x.privilege_type ORDER BY x.privilege_type) INTO s FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) x WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' AND x.grantee='service_role'::regrole;
 SELECT count(*) INTO n FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) x WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' AND x.grantee='anon'::regrole;
 SELECT count(*) INTO m FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) x WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' AND x.privilege_type='MAINTAIN' AND x.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole);
 IF a IS DISTINCT FROM ARRAY['DELETE','INSERT','SELECT','UPDATE']::text[] THEN RAISE EXCEPTION 'authenticated defaults incorrect: %',a; END IF;
 IF s IS DISTINCT FROM ARRAY['DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']::text[] THEN RAISE EXCEPTION 'service_role defaults incorrect: %',s; END IF;
 IF n<>0 OR m<>0 THEN RAISE EXCEPTION 'anon or MAINTAIN default remains'; END IF;
 IF (SELECT count(*) FROM admin_acl_before)<>(SELECT count(*) FROM pg_default_acl d WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' AND d.defaclacl::text=(SELECT acl FROM admin_acl_before)) THEN RAISE EXCEPTION 'supabase_admin ACL changed'; END IF;
END $v$; ROLLBACK;`;
execFileSync('psql',['-X','--no-psqlrc','--dbname',url,'-v','ON_ERROR_STOP=1','-c',setup+'\\n'+migration+'\\n'+verify],{stdio:'inherit'});
console.log(JSON.stringify({status:'PASS',postgres:17,scenario:'historical grant then observed ACL drift',authenticated:['SELECT','INSERT','UPDATE','DELETE'],service_role:['SELECT','INSERT','UPDATE','DELETE','REFERENCES','TRIGGER','TRUNCATE'],anon:'none',maintain:'none',supabase_admin:'unchanged',transaction:'rolled back',remote_databases_touched:false},null,2));
