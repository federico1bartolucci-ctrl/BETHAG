-- Keep the private document bucket and its object-level RLS policies in clean rebuilds.
-- Mirrors the live Production bucket contract and the QA-only repair validated on 2026-10-27.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bethag-documents', 'bethag-documents', false, 104857600)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "BETHAG documents select" ON storage.objects;
CREATE POLICY "BETHAG documents select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bethag-documents'
  AND (
    private.can_access_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = objects.name
        AND d.condominium_id::text = (storage.foldername(objects.name))[2]
        AND COALESCE(d.data ->> 'publication', '') = 'Condiviso'
        AND private.can_access_resident_condominium_module(d.condominium_id, 'documenti'::text)
    )
  )
);

DROP POLICY IF EXISTS "BETHAG documents insert" ON storage.objects;
CREATE POLICY "BETHAG documents insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bethag-documents'
  AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
);

DROP POLICY IF EXISTS "BETHAG documents update" ON storage.objects;
CREATE POLICY "BETHAG documents update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bethag-documents'
  AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
)
WITH CHECK (
  bucket_id = 'bethag-documents'
  AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
);

DROP POLICY IF EXISTS "BETHAG documents delete" ON storage.objects;
CREATE POLICY "BETHAG documents delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bethag-documents'
  AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
);
