
do $$
declare
  v_sql text;
  v_old text := ' if tg_op=''UPDATE'' and new.paid_amount is distinct from old.paid_amount then';
  v_new text := ' if tg_op=''UPDATE'' and new.paid_amount is distinct from old.paid_amount and coalesce(current_setting(''bethag.allow_installment_paid_update'',true),''off'') <> ''on'' then';
begin
  select pg_get_functiondef('public.guard_installment_paid_amount_update()'::regprocedure) into v_sql;
  v_sql := replace(v_sql,v_old,v_new);
  execute v_sql;
end $$;
