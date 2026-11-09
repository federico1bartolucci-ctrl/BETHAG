-- Exact production parity for operational constraints
alter table public.condominium_unit_transformations drop constraint if exists condominium_unit_transformations_accounting_resolution_status_c;
alter table public.condominium_unit_transformations drop constraint if exists condominium_unit_transformat_accounting_resolution_status_check;
alter table public.condominium_unit_transformations add constraint condominium_unit_transformat_accounting_resolution_status_check check (accounting_resolution_status = any (array['Da verificare'::text,'Non necessaria'::text,'Risolta'::text]));
alter table public.condominium_work_documents drop constraint if exists condominium_work_documents_work_document_key;
