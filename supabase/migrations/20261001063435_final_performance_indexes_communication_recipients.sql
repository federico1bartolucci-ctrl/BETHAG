drop index if exists public.condominium_work_progress_work_no_uq;

create index if not exists communication_recipients_condominium_id_idx
  on public.communication_recipients (condominium_id);

create index if not exists communication_recipients_user_id_idx
  on public.communication_recipients (user_id);
