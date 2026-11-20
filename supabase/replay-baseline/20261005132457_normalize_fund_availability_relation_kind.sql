-- Replay-only normalization immediately before the historical view reconciliation.
-- The chronological replay can encounter the legacy relation as a table, while the
-- following immutable Production payload starts with DROP VIEW IF EXISTS. PostgreSQL
-- raises 42809 when DROP VIEW targets a table, even with IF EXISTS. Remove the relation
-- according to its actual catalog kind so the untouched historical migration can run.
-- No application data is loaded into this disposable replay database.
do $$
declare
  v_kind "char";
begin
  select c.relkind into v_kind
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname='condominium_fund_availability';

  if v_kind in ('r','p') then
    drop table public.condominium_fund_availability;
  elsif v_kind='v' then
    drop view public.condominium_fund_availability;
  elsif v_kind='m' then
    drop materialized view public.condominium_fund_availability;
  elsif v_kind is not null then
    raise exception 'Unexpected condominium_fund_availability relation kind: %',v_kind;
  end if;
end
$$;
