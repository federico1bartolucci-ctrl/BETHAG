-- BETHAG core schema contract: READ-ONLY verification query.
-- Run separately on Production and QA; this query performs no DDL/DML.
-- Expected result: zero rows. Each returned row is a structural discrepancy.

with expected_columns(table_name, column_name, data_type, is_nullable, column_default) as (
  values
    ('workspaces','id','uuid','NO','gen_random_uuid()'),
    ('workspaces','name','text','NO',null),
    ('workspaces','plan','text','NO', '''free''::text'),
    ('workspaces','created_at','timestamp with time zone','NO','now()'),
    ('workspaces','updated_at','timestamp with time zone','NO','now()'),

    ('profiles','id','uuid','NO',null),
    ('profiles','full_name','text','YES',null),
    ('profiles','email','text','YES',null),
    ('profiles','role','text','NO', '''resident''::text'),
    ('profiles','active','boolean','NO','true'),
    ('profiles','created_at','timestamp with time zone','NO','now()'),
    ('profiles','updated_at','timestamp with time zone','NO','now()'),

    ('workspace_members','workspace_id','uuid','NO',null),
    ('workspace_members','user_id','uuid','NO',null),
    ('workspace_members','role','text','NO',null),
    ('workspace_members','active','boolean','NO','true'),
    ('workspace_members','permissions','jsonb','NO', '''{}''::jsonb'),
    ('workspace_members','created_at','timestamp with time zone','NO','now()'),
    ('workspace_members','condominium_id','uuid','YES',null),
    ('workspace_members','legacy_id','bigint','YES',null),

    ('condominiums','id','uuid','NO','gen_random_uuid()'),
    ('condominiums','workspace_id','uuid','NO',null),
    ('condominiums','name','text','NO',null),
    ('condominiums','address','text','YES',null),
    ('condominiums','city','text','YES',null),
    ('condominiums','postal_code','text','YES',null),
    ('condominiums','province','text','YES',null),
    ('condominiums','data','jsonb','NO', '''{}''::jsonb'),
    ('condominiums','created_at','timestamp with time zone','NO','now()'),
    ('condominiums','updated_at','timestamp with time zone','NO','now()'),
    ('condominiums','legacy_id','bigint','YES',null),
    ('condominiums','archived_at','timestamp with time zone','YES',null),
    ('condominiums','archived_by','uuid','YES',null),
    ('condominiums','archive_reason','text','YES',null)
),
actual_columns as (
  select table_name,column_name,data_type,is_nullable,column_default
  from information_schema.columns
  where table_schema='public'
    and table_name in ('workspaces','profiles','workspace_members','condominiums')
),
column_issues as (
  select 'column_missing_or_mismatched'::text as issue,
         e.table_name||'.'||e.column_name as object_name,
         format('expected type=%s nullable=%s default=%s; actual type=%s nullable=%s default=%s',
           e.data_type,e.is_nullable,coalesce(e.column_default,'<null>'),
           coalesce(a.data_type,'<missing>'),coalesce(a.is_nullable,'<missing>'),coalesce(a.column_default,'<null>')) as detail
  from expected_columns e left join actual_columns a
    on a.table_name=e.table_name and a.column_name=e.column_name
  where a.column_name is null
     or (a.data_type,a.is_nullable,coalesce(a.column_default,'<null>'))
        is distinct from (e.data_type,e.is_nullable,coalesce(e.column_default,'<null>'))
  union all
  select 'unexpected_column',a.table_name||'.'||a.column_name,
         format('actual type=%s nullable=%s default=%s',a.data_type,a.is_nullable,coalesce(a.column_default,'<null>'))
  from actual_columns a left join expected_columns e
    on e.table_name=a.table_name and e.column_name=a.column_name
  where e.column_name is null
),
expected_constraints(table_name,constraint_name,definition) as (
  values
    ('workspaces','workspaces_pkey','PRIMARY KEY (id)'),
    ('profiles','profiles_pkey','PRIMARY KEY (id)'),
    ('profiles','profiles_id_fkey','FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('profiles','profiles_role_check', 'CHECK ((role = ANY (ARRAY[''admin''::text, ''collaborator''::text, ''resident''::text, ''council''::text])))'),
    ('workspace_members','workspace_members_pkey','PRIMARY KEY (workspace_id, user_id)'),
    ('workspace_members','workspace_members_workspace_id_fkey','FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE'),
    ('workspace_members','workspace_members_user_id_fkey','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
    ('workspace_members','workspace_members_condominium_id_fkey','FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE'),
    ('workspace_members','workspace_members_role_check','CHECK ((role = ANY (ARRAY[''admin''::text, ''collaborator''::text, ''resident''::text, ''council''::text])))'),
    ('condominiums','condominiums_pkey','PRIMARY KEY (id)'),
    ('condominiums','condominiums_workspace_id_fkey','FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE'),
    ('condominiums','condominiums_archived_by_fkey','FOREIGN KEY (archived_by) REFERENCES profiles(id)'),
    ('condominiums','condominiums_workspace_legacy_unique','UNIQUE (workspace_id, legacy_id)')
),
actual_constraints as (
  select c.relname table_name, con.conname constraint_name, pg_get_constraintdef(con.oid) definition
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('workspaces','profiles','workspace_members','condominiums')
),
constraint_issues as (
  select 'constraint_missing_or_mismatched'::text issue,
         e.table_name||'.'||e.constraint_name object_name,
         'expected: '||e.definition||'; actual: '||coalesce(a.definition,'<missing>') detail
  from expected_constraints e left join actual_constraints a
    on a.table_name=e.table_name and a.constraint_name=e.constraint_name
  where a.constraint_name is null or a.definition is distinct from e.definition
),
expected_rls(table_name) as (
  values ('workspaces'),('profiles'),('workspace_members'),('condominiums')
),
rls_issues as (
  select 'rls_not_enabled'::text issue,e.table_name object_name,
         'RLS must be enabled and FORCE RLS must be off' detail
  from expected_rls e left join pg_class c on c.relname=e.table_name
  left join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.oid is null or not c.relrowsecurity or c.relforcerowsecurity
)
select issue,object_name,detail from column_issues
union all select issue,object_name,detail from constraint_issues
union all select issue,object_name,detail from rls_issues
order by issue,object_name;
