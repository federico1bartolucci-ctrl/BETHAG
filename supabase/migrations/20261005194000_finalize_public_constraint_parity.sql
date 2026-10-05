-- Final production constraint parity for communication recipients,
-- fiscal years and insurance policies.
alter table public.communication_recipients
  add constraint communication_recipients_condominium_fk
  foreign key (condominium_id) references public.condominiums(id) on delete cascade;

alter table public.communication_recipients
  add constraint communication_recipients_member_fk
  foreign key (member_id) references public.condominium_members(id) on delete set null;

alter table public.communication_recipients
  add constraint communication_recipients_status_chk
  check (status = any (array['pending'::text,'queued'::text,'sent'::text,'delivered'::text,'failed'::text,'skipped'::text]));

alter table public.communication_recipients
  add constraint communication_recipients_user_fk
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.communication_recipients
  add constraint communication_recipients_workspace_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_fiscal_years
  add constraint condominium_fiscal_years_condominium_id_fkey
  foreign key (condominium_id) references public.condominiums(id) on delete cascade;

alter table public.condominium_insurance_policies
  add constraint condominium_insurance_policies_dates_valid
  check (start_date is null or end_date is null or end_date >= start_date);

alter table public.condominium_insurance_policies
  add constraint condominium_insurance_policies_deductible_nonnegative
  check (deductible is null or deductible >= 0::numeric);

alter table public.condominium_insurance_policies
  add constraint condominium_insurance_policies_premium_nonnegative
  check (premium is null or premium >= 0::numeric);
