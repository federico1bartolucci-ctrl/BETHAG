-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
CREATE OR REPLACE FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_condominium_fiscal_year($1,$2); end $function$
;

-- public.close_condominium_member_transfer(p_transfer_id uuid)
CREATE OR REPLACE FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin return private.close_condominium_member_transfer(p_transfer_id); end; $function$
;

-- public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
CREATE OR REPLACE FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_fiscal_year_and_generate_carryovers($1,$2,$3); end $function$
;

-- public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text)
CREATE OR REPLACE FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.compensate_fiscal_carryover($1,$2,$3,$4,$5,$6); end $function$
;

-- public.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text)
CREATE OR REPLACE FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text DEFAULT NULL::text, p_condominium_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.complete_portal_registration($1,$2,$3); end $function$
;

-- public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid)
CREATE OR REPLACE FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_intake public.condominium_allocation_intakes%rowtype;
 v_row jsonb;
 v_count integer:=0;
 v_unit_id uuid;
 v_amount numeric;
 v_millesimi numeric;
 v_total numeric:=0;
 v_total_millesimi numeric:=0;
 v_expense_amount numeric;
 v_table_total numeric;
 v_table_scope text;
 v_expected_millesimi numeric;
 v_building_code text;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;

 select * into v_intake from public.condominium_allocation_intakes
 where id=p_intake_id and workspace_id=p_workspace_id for update;

 if not found then raise exception 'Acquisizione riparto non trovata'; end if;
 if v_intake.status='Confermato' then
   return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
 end if;
 if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
 if coalesce(jsonb_array_length(v_intake.validation_errors),0)>0 then raise exception 'Il riparto contiene errori di validazione e non può essere confermato'; end if;
 if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;
 if coalesce(jsonb_array_length(v_intake.rows),0)=0 then raise exception 'Nessuna quota da confermare'; end if;

 select amount into v_expense_amount from public.condominium_ledger_entries
 where id=v_intake.ledger_entry_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and direction='Uscita';
 if v_expense_amount is null then raise exception 'La spesa collegata non è valida'; end if;
 if v_intake.expense_amount is not null and abs(v_intake.expense_amount-v_expense_amount)>0.005 then raise exception 'L''importo dell''acquisizione non coincide con la spesa contabile'; end if;

 if v_intake.allocation_table_id is not null then
   select total_millesimi,scope_mode into v_table_total,v_table_scope
   from public.condominium_millesimal_tables
   where id=v_intake.allocation_table_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and active=true;
   if not found then raise exception 'La tabella millesimale selezionata non è valida'; end if;
 end if;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round(coalesce((v_row->>'amount')::numeric,0),2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   if v_unit_id is null or v_amount<=0 or v_millesimi<0 then raise exception 'Riga di riparto non valida'; end if;
   if not exists(select 1 from public.condominium_units where id=v_unit_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id) then raise exception 'L''unità indicata non appartiene al condominio'; end if;

   if v_intake.allocation_table_id is not null then
     if v_table_scope='units' and not exists(select 1 from public.condominium_millesimal_tables t where t.id=v_intake.allocation_table_id and v_unit_id=any(t.scope_unit_ids)) then raise exception 'L''unità % non rientra nell''ambito della tabella millesimale selezionata',v_unit_id; end if;
     if v_table_scope='buildings' then
       select lower(trim(coalesce(data->>'building_code',data->>'civic_code',data->>'fabbricato',''))) into v_building_code from public.condominium_units where id=v_unit_id;
       if not exists(select 1 from public.condominium_millesimal_tables t cross join lateral unnest(t.scope_building_codes) as codes(code) where t.id=v_intake.allocation_table_id and lower(trim(codes.code))=v_building_code) then raise exception 'L''unità % non rientra nell''ambito per fabbricato/civico della tabella selezionata',v_unit_id; end if;
     end if;
     select value into v_expected_millesimi from public.condominium_millesimal_values where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and table_id=v_intake.allocation_table_id and unit_id=v_unit_id limit 1;
     if v_expected_millesimi is not null and abs(v_expected_millesimi-v_millesimi)>0.005 then raise exception 'I millesimi dell''unità % non coincidono con la tabella selezionata',v_unit_id; end if;
   end if;

   v_total:=v_total+v_amount; v_total_millesimi:=v_total_millesimi+v_millesimi; v_count:=v_count+1;
 end loop;

 if abs(v_total-v_expense_amount)>0.005 then raise exception 'La somma delle quote (%s) non coincide con la spesa (%s)',round(v_total,2),round(v_expense_amount,2); end if;
 if v_intake.allocation_table_id is not null and v_table_total is not null and abs(v_total_millesimi-v_table_total)>0.01 then raise exception 'I millesimi del riparto (%s) non coincidono con il totale della tabella (%s)',round(v_total_millesimi,3),round(v_table_total,3); end if;

 delete from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and ledger_entry_id=v_intake.ledger_entry_id;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round((v_row->>'amount')::numeric,2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   insert into public.condominium_expense_allocations(workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
   values(p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,v_unit_id,null,
          case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
          v_millesimi,v_amount,0,(select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),'Da pagare',coalesce(v_intake.notes,''));
 end loop;

 update public.condominium_allocation_intakes
 set status='Confermato',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id and workspace_id=p_workspace_id;

 return v_count;
end;
$function$
;

-- public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
CREATE OR REPLACE FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.confirm_condominium_creation_intake($1,$2); end $function$
;

-- public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb)
CREATE OR REPLACE FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 return private.confirm_condominium_member_transfer(p_unit_id,p_outgoing_member_id,p_incoming_name,p_incoming_email,p_incoming_user_id,p_transfer_date,p_transfer_type,p_notes,p_data);
end;
$function$
;
