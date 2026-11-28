-- Keep work/document and invoice/accounting relationships protected against duplicates.
create unique index if not exists condominium_work_documents_work_document_key
  on public.condominium_work_documents (work_id, document_id);

create unique index if not exists condominium_ledger_entries_outgoing_document_key
  on public.condominium_ledger_entries (document_id)
  where direction = 'Uscita' and document_id is not null;

create index if not exists condominium_work_documents_workspace_document_idx
  on public.condominium_work_documents (workspace_id, document_id);