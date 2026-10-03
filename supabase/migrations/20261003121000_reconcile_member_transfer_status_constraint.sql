-- Reconcile the transfer status constraint across historical migration variants.
-- Earlier migrations used both *_status_ck and *_status_check names. Dropping
-- both before adding the canonical constraint makes the final state deterministic.
-- Forward-only: do not edit migration files that may already be recorded/applied.

do $migration$
begin
  if to_regclass('public.condominium_member_transfers') is null then
    raise exception 'Required table public.condominium_member_transfers is missing; apply the transfer baseline first';
  end if;

  alter table public.condominium_member_transfers
    drop constraint if exists condominium_member_transfers_status_ck;

  alter table public.condominium_member_transfers
    drop constraint if exists condominium_member_transfers_status_check;

  alter table public.condominium_member_transfers
    add constraint condominium_member_transfers_status_check
    check (status = any (array['Bozza','Confermato','Chiuso','Annullato']));
end
$migration$;
