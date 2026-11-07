
insert into storage.buckets (id, name, public, file_size_limit)
values ('bethag-documents', 'bethag-documents', false, null)
on conflict (id) do update set public = false, file_size_limit = null;

drop policy if exists "BETHAG documents select" on storage.objects;
drop policy if exists "BETHAG documents insert" on storage.objects;
drop policy if exists "BETHAG documents update" on storage.objects;
drop policy if exists "BETHAG documents delete" on storage.objects;

create policy "BETHAG documents select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'bethag-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
      and wm.active = true
  )
);

create policy "BETHAG documents insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bethag-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
      and wm.active = true
  )
);

create policy "BETHAG documents update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'bethag-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
      and wm.active = true
  )
)
with check (
  bucket_id = 'bethag-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
      and wm.active = true
  )
);

create policy "BETHAG documents delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'bethag-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
      and wm.active = true
  )
);
