alter table public.portal_registration_requests drop constraint if exists portal_registration_requests_status_check;
alter table public.portal_registration_requests add constraint portal_registration_requests_status_check check (status in ('pending','email_mismatch','approved','rejected'));

-- La funzione completa_portal_registration è stata aggiornata nel database
-- per distinguere la corrispondenza anagrafica dalla corrispondenza e-mail:
-- corrispondenza univoca + e-mail uguale => associazione automatica;
-- corrispondenza anagrafica + e-mail diversa => email_mismatch e revisione amministratore;
-- nessuna corrispondenza => richiesta amministrativa standard.

-- La funzione admin_approve_portal_registration consente all'amministratore
-- di autorizzare esplicitamente anche una richiesta con e-mail discordante
-- oppure di scegliere un diverso profilo condòmino.