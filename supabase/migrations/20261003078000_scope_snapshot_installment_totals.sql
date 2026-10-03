-- Scope snapshot installment totals to the transfer tenant.
do $migration$
declare v_def text; v_old text; v_new text; v_count integer;
begin
v_def := pg_get_functiondef('public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure);
v_old := 'from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date';
v_new := 'from public.condominium_installments i where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date';
v_count := (length(v_def)-length(replace(v_def,v_old,''))) / length(v_old);
if position(v_new in v_def)=0 then if v_count <> 3 then raise exception 'Outgoing installment anchor count mismatch: %',v_count; end if; v_def:=replace(v_def,v_old,v_new); end if;
v_old := 'from condominium_installments i where i.member_id=t.incoming_member_id and i.due_date > t.transfer_date';
v_new := 'from public.condominium_installments i where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.member_id=t.incoming_member_id and i.due_date > t.transfer_date';
v_count := (length(v_def)-length(replace(v_def,v_old,''))) / length(v_old);
if position(v_new in v_def)=0 then if v_count <> 1 then raise exception 'Incoming installment anchor count mismatch: %',v_count; end if; v_def:=replace(v_def,v_old,v_new); end if;
execute v_def;
end
$migration$;