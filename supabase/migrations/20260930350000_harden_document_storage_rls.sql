drop policy if exists "BETHAG documents delete" on storage.objects;
drop policy if exists "BETHAG documents insert" on storage.objects;
drop policy if exists "BETHAG documents select" on storage.objects;
drop policy if exists "BETHAG documents update" on storage.objects;

create policy "BETHAG documents select"
on storage.objects for select to authenticated
using (
  bucket_id = 'bethag-documents'
  and private.can_access_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
);

create policy "BETHAG documents insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bethag-documents'
  and private.can_manage_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
);

create policy "BETHAG documents update"
on storage.objects for update to authenticated
using (
  bucket_id = 'bethag-documents'
  and private.can_manage_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
)
with check (
  bucket_id = 'bethag-documents'
  and private.can_manage_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
);

create policy "BETHAG documents delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'bethag-documents'
  and private.can_manage_workspace_module((storage.foldername(name))[1]::uuid, 'documenti')
);