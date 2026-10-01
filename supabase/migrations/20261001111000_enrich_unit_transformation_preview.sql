create or replace function public.preview_condominium_unit_transformation(p_condominium_id uuid,p_transformation_type text,p_source_unit_ids uuid[])
returns jsonb
language sql
security invoker
set search_path=''
as $function$
select jsonb_build_object(
  'condominium_id',p_condominium_id,
  'transformation_type',p_transformation_type,
  'source_units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'unit_code',u.unit_code,'building_code',u.building_code,'data',u.data,'lifecycle_status',u.lifecycle_status) order by u.unit_code) from public.condominium_units u where u.id=any(p_source_unit_ids) and u.condominium_id=p_condominium_id and u.lifecycle_status='Attiva'),'[]'::jsonb),
  'active_members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'unit_id',m.unit_id,'name',m.name,'email',m.email,'user_id',m.user_id,'role',m.role,'active',m.active,'data',m.data) order by m.unit_id,m.id) from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(p_source_unit_ids) and m.active),'[]'::jsonb),
  'ownership_summary',coalesce((select jsonb_agg(jsonb_build_object('owner_key',x.owner_key,'member_count',x.member_count,'unit_ids',x.unit_ids) order by x.owner_key) from (select case when m.user_id is not null then 'u:'||m.user_id::text when nullif(lower(trim(coalesce(m.email,''))),'') is not null then 'e:'||lower(trim(m.email)) else 'm:'||m.id::text end owner_key,count(*) member_count,jsonb_agg(distinct m.unit_id) unit_ids from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(p_source_unit_ids) and m.active and trim(coalesce(m.data->>'role',m.role,''))='Proprietario' group by 1) x),'[]'::jsonb),
  'open_installments',coalesce((select round(sum(greatest(i.amount-i.paid_amount,0)),2) from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(p_source_unit_ids)),0),
  'open_allocations',coalesce((select round(sum(greatest(a.amount-a.paid_amount,0)),2) from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(p_source_unit_ids)),0),
  'millesimal_tables',coalesce((select jsonb_agg(jsonb_build_object('table_id',mt.id,'name',mt.name,'total_millesimi',mt.total_millesimi,'basis_type',mt.basis_type,'affected_values',coalesce((select jsonb_agg(jsonb_build_object('unit_id',mv.unit_id,'value',mv.value,'excluded',mv.excluded)) from public.condominium_millesimal_values mv where mv.table_id=mt.id and mv.unit_id=any(p_source_unit_ids)),'[]'::jsonb)) order by mt.name) from public.condominium_millesimal_tables mt where mt.condominium_id=p_condominium_id and mt.active),'[]'::jsonb),
  'accounting_resolution_required',exists(select 1 from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(p_source_unit_ids) and i.amount-i.paid_amount>0.005) or exists(select 1 from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(p_source_unit_ids) and a.amount-a.paid_amount>0.005),
  'millesimal_review_required',true,
  'unit_count_delta',case when p_transformation_type='Fusione' then -1 when p_transformation_type='Frazionamento' then 1 else 0 end
)
$function$;