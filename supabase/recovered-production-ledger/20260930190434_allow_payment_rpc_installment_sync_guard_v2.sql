
do $$
declare
  v_sql text;
  v_old text := '  insert into public.condominium_payment_movements(';
  v_new text := '  perform set_config(''bethag.allow_installment_paid_update'',''on'',true);' || chr(10) || chr(10) || '  insert into public.condominium_payment_movements(';
begin
  select pg_get_functiondef('public.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)'::regprocedure)
    into v_sql;
  if position(v_new in v_sql)=0 then
    v_sql := replace(v_sql,v_old,v_new);
    execute v_sql;
  end if;
end $$;
