
do $$
declare
  v_sql text;
begin
  select pg_get_functiondef('public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)'::regprocedure)
    into v_sql;
  v_sql := replace(v_sql, E'  y record;\n', '');
  execute v_sql;
end $$;
