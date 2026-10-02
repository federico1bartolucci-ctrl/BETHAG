-- Provide a collision-safe legacy identifier for every newly created condominium member.
-- Existing legacy IDs are preserved; the sequence starts strictly above the current maximum.
begin;

create sequence if not exists public.condominium_members_legacy_id_seq as bigint;

lock table public.condominium_members in access exclusive mode;

select setval(
  'public.condominium_members_legacy_id_seq'::regclass,
  coalesce((select max(legacy_id) from public.condominium_members), 0) + 1,
  false
);

alter sequence public.condominium_members_legacy_id_seq
  owned by public.condominium_members.legacy_id;

alter table public.condominium_members
  alter column legacy_id
  set default nextval('public.condominium_members_legacy_id_seq'::regclass);

-- Inserts made by authenticated clients may use the column default.
-- The sequence only emits opaque numeric identifiers; table RLS remains authoritative.
grant usage, select on sequence public.condominium_members_legacy_id_seq to authenticated, service_role;

commit;
