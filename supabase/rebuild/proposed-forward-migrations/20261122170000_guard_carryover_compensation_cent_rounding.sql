CREATE OR REPLACE FUNCTION private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_amount numeric;
 v_remaining numeric;
 v_new_balance numeric;
 v_target public.condominium_installments%rowtype;
 v_target_year public.condominium_fiscal_years%rowtype;
 v_already_applied numeric;
 v_target_residual numeric;
begin
 if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
   raise exception 'Autorizzazione gestione contabilità richiesta';
 end if;

 if exists (
   select 1 from public.condominiums c
   where c.id=p_condominium_id
     and c.workspace_id=p_workspace_id
     and c.archived_at is not null
 ) then
   raise exception 'Il condominio è archiviato e non può essere modificato';
 end if;

 if p_amount is null
    or p_amount::text in ('NaN','Infinity','-Infinity')
    or p_amount<=0 then
   raise exception 'L''importo della compensazione deve essere maggiore di zero';
 end if;

 select * into v_c
 from public.condominium_fiscal_carryovers
 where id=p_carryover_id
   and workspace_id=p_workspace_id
   and condominium_id=p_condominium_id
 for update;

 if not found then raise exception 'Partita riportata non trovata'; end if;
 if v_c.status='Compensato' then raise exception 'La partita riportata è già completamente compensata'; end if;

 v_remaining:=round(abs(v_c.balance::numeric),2);
 v_amount:=round(p_amount::numeric,2);

 if v_amount<=0 then
   raise exception 'L''importo della compensazione deve essere almeno un centesimo';
 end if;

 if v_remaining<=0.005 then
   raise exception 'La partita riportata non ha più un residuo compensabile';
 end if;

 if v_amount>v_remaining+0.005 then
   raise exception 'La compensazione supera il residuo della partita: residuo %',
     to_char(v_remaining,'FM999999990.00');
 end if;

 if v_c.kind='Debito' and p_target_installment_id is not null then
   raise exception 'Un debito riportato non può essere utilizzato come credito su una rata corrente';
 end if;

 if p_target_installment_id is not null then
   select * into v_target
   from public.condominium_installments
   where id=p_target_installment_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Rata di destinazione non trovata'; end if;
   if v_c.kind<>'Credito' then
     raise exception 'Solo un credito riportato può essere applicato a una rata corrente';
   end if;

   select * into v_target_year
   from public.condominium_fiscal_years
   where id=v_c.target_fiscal_year_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Esercizio di destinazione della partita riportata non trovato'; end if;
   if v_target_year.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso'; end if;

   if v_target.fiscal_year_id is distinct from v_c.target_fiscal_year_id then
     raise exception 'La rata di destinazione deve appartenere all''esercizio destinatario della partita riportata';
   end if;

   if v_target.unit_id is distinct from v_c.unit_id then
     raise exception 'La rata di destinazione deve appartenere alla stessa unità della partita riportata';
   end if;

   /*
     Se il riporto è proprietario-specifico, anche la rata di destinazione
     deve essere dello stesso proprietario. Se il riporto è a livello unità
     (member_id NULL), può essere applicato soltanto a una rata ugualmente
     a livello unità, evitando di trasferire un credito comune su una
     posizione individuale non equivalente.
   */
   if v_c.member_id is not null and v_target.member_id is distinct from v_c.member_id then
     raise exception 'La rata di destinazione deve appartenere allo stesso proprietario della partita riportata';
   end if;

   if v_c.member_id is null and v_target.member_id is not null then
     raise exception 'Una partita riportata a livello di unità non può essere applicata a una rata proprietario-specifica';
   end if;

   select round(coalesce(sum(amount),0),2)
   into v_already_applied
   from public.condominium_fiscal_carryover_compensations
   where target_installment_id=v_target.id;

   v_target_residual:=round(v_target.amount-v_target.paid_amount-v_already_applied,2);

   if v_target_residual<=0.005 then
     raise exception 'La rata di destinazione non ha più un residuo compensabile';
   end if;

   if v_amount>v_target_residual+0.005 then
     raise exception 'La compensazione supera il residuo effettivo della rata di destinazione: residuo %',
       to_char(v_target_residual,'FM999999990.00');
   end if;
 end if;

 insert into public.condominium_fiscal_carryover_compensations(
   workspace_id,condominium_id,carryover_id,target_installment_id,
   amount,notes,created_by
 )
 values(
   p_workspace_id,p_condominium_id,p_carryover_id,p_target_installment_id,
   v_amount,trim(coalesce(p_notes,'')),v_uid
 );

 if v_c.kind='Debito' then
   v_new_balance:=round(abs(v_c.balance)-v_amount,2);
 else
   v_new_balance:=-round(abs(v_c.balance)-v_amount,2);
 end if;

 if abs(v_new_balance)<=0.005 then
   v_new_balance:=0;
   update public.condominium_fiscal_carryovers
   set balance=0,status='Compensato',updated_at=now()
   where id=v_c.id;
 else
   update public.condominium_fiscal_carryovers
   set balance=v_new_balance,status='Parzialmente compensato',updated_at=now()
   where id=v_c.id;
 end if;

 return v_new_balance;
end;
$function$
;
