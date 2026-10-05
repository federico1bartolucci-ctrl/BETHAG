-- Reconcile public table grants with production: anon/authenticated do not need
-- REFERENCES, TRIGGER or TRUNCATE on exposed application tables.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('revoke references, trigger, truncate on table %I.%I from anon, authenticated', r.schemaname, r.tablename);
  end loop;
end $$;
