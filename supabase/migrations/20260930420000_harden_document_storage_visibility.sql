-- Harden document storage visibility.
-- Persistent condominium documents are stored as workspace_id/condominium_id/file.
-- Residents may download only documents explicitly published as Condiviso and
-- only for a condominium to which they are linked with documenti permission.
-- Workspace-level temporary files remain manager-only.

drop policy if exists "BETHAG documents select" on storage.objects;

create policy "BETHAG documents select"
on storage.objects for select to authenticated
using (
  bucket_id = 'bethag-documents'
  and (
    private.can_access_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
    or exists (
      select 1
      from public.documents d
      where d.file_path = storage.objects.name
        and d.condominium_id::text = (storage.foldername(name))[2]
        and coalesce(d.data->>'publication','') = 'Condiviso'
        and private.can_access_resident_condominium_module(d.condominium_id, 'documenti')
    )
  )
);
