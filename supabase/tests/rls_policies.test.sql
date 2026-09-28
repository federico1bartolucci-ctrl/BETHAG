begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Il RPC amministrativo del condominio deve essere eseguibile solo da utenti autenticati.
select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'save_condominium'
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'Anon non deve poter eseguire save_condominium'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'save_condominium'
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  1,
  'Authenticated deve poter eseguire save_condominium'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'delete_condominium'
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'Anon non deve poter eseguire delete_condominium'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'delete_condominium'
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  1,
  'Authenticated deve poter eseguire delete_condominium'
);

-- Nessuna policy pubblica: tutte le policy applicative devono richiedere autenticazione.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and 'public' = any(roles::text[])),
  0,
  'Nessuna policy public deve rimanere attiva'
);

-- Le funzioni di autorizzazione private devono essere SECURITY DEFINER
-- e accessibili esclusivamente agli utenti autenticati.
select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in (
       'can_access_condominium',
       'can_access_workspace_module',
       'can_access_resident_condominium',
       'can_access_resident_condominium_module',
       'is_workspace_admin',
       'is_workspace_member'
     )
     and p.prosecdef),
  6,
  'Le sei funzioni RLS devono essere SECURITY DEFINER'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in (
       'can_access_condominium',
       'can_access_workspace_module',
       'can_access_resident_condominium',
       'can_access_resident_condominium_module',
       'is_workspace_admin',
       'is_workspace_member'
     )
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'Anon non deve poter eseguire le funzioni RLS private'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in (
       'can_access_condominium',
       'can_access_workspace_module',
       'can_access_resident_condominium',
       'can_access_resident_condominium_module',
       'is_workspace_admin',
       'is_workspace_member'
     )
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  6,
  'Authenticated deve poter eseguire le funzioni RLS private'
);

-- Tutte le tabelle applicative devono avere RLS.
select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'workspaces',
       'workspace_members',
       'condominiums',
       'condominium_members',
       'documents',
       'deadlines',
       'assemblies',
       'suppliers',
       'activities',
       'communications',
       'condominium_requests',
       'portal_access',
       'profiles'
     )
     and c.relrowsecurity),
  13,
  'Tutte le tabelle applicative devono avere RLS abilitato'
);

-- Le operazioni amministrative devono essere limitate agli amministratori.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and policyname in (
       'admins manage activities',
       'admins manage assemblies',
       'admins manage communications',
       'admins manage condominium members',
       'admins manage requests',
       'admins manage condominiums',
       'admins manage deadlines',
       'admins manage documents',
       'admins manage portal access',
       'admins manage suppliers',
       'admins manage memberships',
       'admins can manage workspaces'
     )
     and roles = '{authenticated}'::name[]
     and cmd = 'ALL'),
  12,
  'Le policy amministrative devono essere authenticated e ALL'
);

-- Un residente non deve poter modificare una richiesta esistente.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'condominium_requests'
     and policyname = 'residents update own requests'),
  0,
  'Non deve esistere una policy che consenta ai residenti di aggiornare richieste'
);

-- Un residente può creare soltanto la propria richiesta.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'condominium_requests'
     and policyname = 'residents create own requests'
     and roles = '{authenticated}'::name[]
     and cmd = 'INSERT'
     and with_check like '%auth.uid()%'),
  1,
  'La creazione delle richieste deve essere autenticata e legata a auth.uid()'
);

-- Il portale deve avere una policy di lettura limitata al proprio accesso.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'portal_access'
     and policyname = 'residents read own portal access'
     and roles = '{authenticated}'::name[]
     and cmd = 'SELECT'),
  1,
  'portal_access deve avere una policy SELECT autenticata'
);

-- I documenti, comunicazioni e verbali devono prevedere il filtro del condominio
-- per gli utenti resident/council.
select ok(
  (select qual like '%can_access_resident_condominium_module%'
   from pg_policies
   where schemaname = 'public'
     and tablename = 'documents'
     and policyname = 'authorized users read documents'),
  'La lettura dei documenti deve rispettare il condominio del residente'
);

select ok(
  (select qual like '%can_access_resident_condominium%'
   from pg_policies
   where schemaname = 'public'
     and tablename = 'communications'
     and policyname = 'authorized users read communications'),
  'La lettura delle comunicazioni deve rispettare il condominio del residente'
);

select ok(
  (select qual like '%can_access_resident_condominium%'
   from pg_policies
   where schemaname = 'public'
     and tablename = 'assemblies'
     and policyname = 'authorized users read assemblies'),
  'La lettura delle assemblee deve rispettare il condominio del residente'
);

select * from finish();

rollback;
