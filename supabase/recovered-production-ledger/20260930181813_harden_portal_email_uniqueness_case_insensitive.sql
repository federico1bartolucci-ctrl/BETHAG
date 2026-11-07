create unique index if not exists uq_portal_access_workspace_condominium_email_ci
on public.portal_access (workspace_id, condominium_id, lower(email))
where email is not null;

drop index if exists public.uq_portal_access_workspace_condominium_email;