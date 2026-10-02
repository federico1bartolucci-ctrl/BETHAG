begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

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
       'is_workspace_member',
       'can_manage_workspace_module'
     )
     and p.prosecdef),
  7,
  'Le sette funzioni RLS devono essere SECURITY DEFINER'
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
       'is_workspace_member',
       'can_manage_workspace_module'
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
       'is_workspace_member',
       'can_manage_workspace_module'
     )
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  7,
  'Authenticated deve poter eseguire le funzioni RLS private'
);

-- Tutte le tabelle applicative pubbliche devono avere RLS.
-- Il set attuale comprende anche le tabelle di registrazione del portale.
select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'workspaces',
       'workspace_members',
       'condominiums',
       'condominium_units',
       'condominium_members',
       'documents',
       'deadlines',
       'assemblies',
       'suppliers',
       'activities',
       'communications',
       'condominium_requests',
       'portal_access',
       'portal_registration_requests',
       'profiles'
     )
     and c.relrowsecurity),
  15,
  'Tutte le 15 tabelle applicative devono avere RLS abilitato'
);

-- Le policy di scrittura dei moduli devono essere autenticate e usare
-- l'autorizzazione per modulo, così i collaboratori possono operare solo
-- sulle funzioni assegnate.
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and policyname in (
       'authorized managers manage activities',
       'authorized managers manage assemblies',
       'authorized managers manage communications',
       'authorized managers manage condominium members',
       'authorized managers manage requests',
       'authorized managers manage condominiums',
       'authorized managers manage deadlines',
       'authorized managers manage documents',
       'authorized managers manage portal access',
       'authorized managers manage suppliers'
     )
     and roles = '{authenticated}'::name[]
     and cmd = 'ALL'),
  10,
  'Le policy di gestione dei moduli devono essere authenticated e ALL'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and policyname like 'authorized managers manage %'
     and (qual like '%can_manage_workspace_module%' or with_check like '%can_manage_workspace_module%')),
  10,
  'Le policy di gestione devono usare can_manage_workspace_module'
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

-- I vincoli economici devono impedire duplicazioni di collegamenti lavoro/documento
-- e di registrazioni contabili di uscita per la stessa fattura.
select is(
  (select count(*)::integer
   from pg_indexes
   where schemaname = 'public'
     and indexname = 'condominium_work_documents_work_document_key'),
  1,
  'Il collegamento lavoro/documento deve avere un vincolo UNIQUE'
);

select is(
  (select count(*)::integer
   from pg_indexes
   where schemaname = 'public'
     and indexname = 'condominium_ledger_entries_outgoing_document_key'),
  1,
  'Una fattura non deve poter generare due uscite contabili'
);

select is(
  (select count(*)::integer
   from pg_indexes
   where schemaname = 'public'
     and indexname = 'condominium_work_documents_workspace_document_idx'),
  1,
  'La ricerca dei documenti collegati al lavoro deve avere l'indice di workspace'
);


-- Member-transfer RPC must allow a share transfer while preserving security and serialization.
select ok(
  position('ACTIVE_INCOMING_OWNER_ALREADY_PRESENT' in pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  )) = 0,
  'Il trasferimento di una quota non deve essere bloccato dalla presenza di altri comproprietari'
);

select ok(
  position('for update' in lower(pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  ))) > 0,
  'La conferma del trasferimento deve serializzare le operazioni sulla stessa unità'
);

select ok(
  position('ownerMemberIds' in pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  )) > 0,
  'La conferma del trasferimento deve riallineare i riferimenti legacy dei proprietari'
);

select ok(
  (length(lower(pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  ))) - length(replace(lower(pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  )), '(i.due_date is null or i.due_date<=p_transfer_date)', ''))) > 0,
  'Il riepilogo contabile del subentro deve includere rate senza data certa'
);

select ok(
  position('allocations_residual' in pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  )) > 0,
  'Il riepilogo contabile deve registrare il residuo delle ripartizioni'
);


select ok(
  position('TRANSFER_FINANCIAL_POSITIONS_OPEN' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0
  and position('condominium_installments' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0
  and position('condominium_expense_allocations' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0
  and position('condominium_fiscal_carryovers' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0,
  'La chiusura deve bloccare il subentro finché rate, ripartizioni e riporti fiscali hanno residui'
);

select ok(
  position('v_transfer_date' in lower(pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  ))) > 0
  and position('i.due_date' in lower(pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  ))) > 0
  and position('a.due_date' in lower(pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  ))) > 0,
  'La chiusura deve applicare la data di subentro al controllo di rate e ripartizioni'
);

select ok(
  position('(i.due_date is null or i.due_date<=v_transfer_date)' in lower(pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  ))) > 0,
  'Le rate senza data certa devono restare bloccanti fino a riconciliazione'
);

select ok(
  position('undated_allocations_and_fiscal_carryovers_reconciled' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0,
  'Le posizioni prive di data certa devono essere riconciliate prima della chiusura'
);

select ok(
  position('status=''Chiuso''' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0
  and position('closed_at' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0
  and position('closed_by' in pg_get_functiondef(
    'private.close_condominium_member_transfer(uuid)'::regprocedure
  )) > 0,
  'La chiusura deve registrare stato e audit temporale e utente'
);

select ok(
  position('(i.due_date is null or i.due_date<=p_transfer_date)' in lower(pg_get_functiondef(
    'public.preview_condominium_member_transfer(uuid,uuid,date)'::regprocedure
  ))) > 0,
  'L’anteprima del subentro deve includere le rate senza data certa'
);

select ok(
  position('(i.due_date is null or i.due_date<=t.transfer_date)' in lower(pg_get_functiondef(
    'public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure
  ))) > 0
  and position('allocations_residual' in pg_get_functiondef(
    'public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure
  )) > 0,
  'Il dettaglio contabile deve includere rate non datate e residui delle ripartizioni'
);

select * from finish();

rollback;
