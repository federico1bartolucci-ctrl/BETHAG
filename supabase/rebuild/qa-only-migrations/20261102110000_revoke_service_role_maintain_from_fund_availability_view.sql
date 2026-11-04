-- QA-only least-privilege correction.
-- condominium_fund_availability is a read-only view, not an application table.
-- MAINTAIN is not required by the service role for reading the view.
REVOKE MAINTAIN ON TABLE public.condominium_fund_availability FROM service_role;
