create or replace function public.preview_condominium_unit_transformation(
  p_condominium_id uuid,
  p_transformation_type text,
  p_source_unit_ids uuid[]
)
returns jsonb
language sql
security invoker
set search_path=''
as $function$
with requested as (
  select coalesce(cardinality(p_source_unit_ids),0) as requested_count,
         count(distinct x.unit_id) as distinct_count
  from unnest(coalesce(p_source_unit_ids, array[]::uuid[])) as x(unit_id)
),
eligible as (
  select u.id,u.unit_code,u.building_code,u.data,u.lifecycle_status
  from public.condominium_units u
  where u.id=any(coalesce(p_source_unit_ids,array[]::uuid[]))
    and u.condominium_id=p_condominium_id
    and u.lifecycle_status='Attiva'
),
counts as (
  select count(*)::integer as eligible_count from eligible
),
issues as (
  select coalesce(jsonb_agg(message order by priority),'[]'::jsonb) as errors
  from (values
    (1,case when p_condominium_id is null then 'Condominio non specificato.' end),
    (2,case when p_transformation_type not in ('Fusione','Frazionamento') or p_transformation_type is null then 'Tipo di trasformazione non valido.' end),
    (3,case when (select requested_count from requested)=0 then 'Selezionare almeno un’unità di origine.' end),
    (4,case when (select requested_count from requested)<>(select distinct_count from requested) then 'La selezione contiene unità duplicate.' end),
    (5,case when p_transformation_type='Fusione' and (select requested_count from requested)<2 then 'La fusione richiede almeno due unità di origine.' end),
    (6,case when p_transformation_type='Frazionamento' and (select requested_count from requested)<>1 then 'Il frazionamento richiede una sola unità di origine.' end),
    (7,case when (select eligible_count from counts)<>(select distinct_count from requested) then 'Una o più unità non esistono, non sono attive o non sono accessibili nel condominio selezionato.' end)
  ) v(priority,message)
  where message is not null
)
select jsonb_build_object(
  'condominium_id',p_condominium_id,
  'transformation_type',p_transformation_type,
  'requested_source_count',(select requested_count from requested),
  'source_unit_count',(select eligible_count from counts),
  'valid',jsonb_array_length((select errors from issues))=0,
  'validation_errors',(select errors from issues),
  'source_units',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'unit_code',e.unit_code,'building_code',e.building_code,'data',e.data,'lifecycle_status',e.lifecycle_status) order by e.unit_code) from eligible e),'[]'::jsonb),
  'active_members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'unit_id',m.unit_id,'name',m.name,'email',m.email,'user_id',m.user_id,'role',m.role,'active',m.active,'data',m.data) order by m.unit_id,m.id) from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active),'[]'::jsonb),
  'ownership_summary',coalesce((select jsonb_agg(jsonb_build_object('owner_key',x.owner_key,'member_count',x.member_count,'unit_ids',x.unit_ids) order by x.owner_key) from (select case when m.user_id is not null then 'u:'||m.user_id::text when nullif(lower(trim(coalesce(m.email,''))),'') is not null then 'e:'||lower(trim(m.email)) else 'm:'||m.id::text end owner_key,count(*) member_count,jsonb_agg(distinct m.unit_id) unit_ids from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active and trim(coalesce(m.data->>'role',m.role,''))='Proprietario' group by 1) x),'[]'::jsonb),
  'open_installments',coalesce((select round(sum(greatest(i.amount-i.paid_amount,0)),2) from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'open_allocations',coalesce((select round(sum(greatest(a.amount-a.paid_amount,0)),2) from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'millesimal_tables',coalesce((select jsonb_agg(jsonb_build_object('table_id',mt.id,'name',mt.name,'total_millesimi',mt.total_millesimi,'basis_type',mt.basis_type,'affected_values',coalesce((select jsonb_agg(jsonb_build_object('unit_id',mv.unit_id,'value',mv.value,'excluded',mv.excluded)) from public.condominium_millesimal_values mv where mv.table_id=mt.id and mv.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),'[]'::jsonb)) order by mt.name) from public.condominium_millesimal_tables mt where mt.condominium_id=p_condominium_id and mt.active),'[]'::jsonb),
  'accounting_resolution_required',exists(select 1 from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and i.amount-i.paid_amount>0.005) or exists(select 1 from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and a.amount-a.paid_amount>0.005),
  'millesimal_review_required',true,
  'unit_count_delta',case when p_transformation_type='Fusione' then 1-(select requested_count from requested) when p_transformation_type='Frazionamento' then null else 0 end
)
$function$;
revoke all on function public.preview_condominium_unit_transformation(uuid,text,uuid[]) from public, anon;
grant execute on function public.preview_condominium_unit_transformation(uuid,text,uuid[]) to authenticated;
