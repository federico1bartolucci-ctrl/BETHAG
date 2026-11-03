
revoke all on table public.condominium_units from anon;
revoke all on table public.portal_registration_requests from anon;

create index if not exists portal_registration_requests_matched_member_id_idx
  on public.portal_registration_requests (matched_member_id);

create index if not exists portal_registration_requests_requested_user_id_idx
  on public.portal_registration_requests (requested_user_id);

create index if not exists portal_registration_requests_reviewed_by_idx
  on public.portal_registration_requests (reviewed_by);
