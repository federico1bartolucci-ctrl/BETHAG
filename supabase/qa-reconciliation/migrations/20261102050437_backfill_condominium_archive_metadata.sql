-- Backfill legacy archive metadata written by the pre-RPC frontend.
-- Structured columns become the source of truth before JSON flags are ignored.
UPDATE public.condominiums
SET
  archived_at = COALESCE(archived_at, (data->>'archivedAt')::timestamptz),
  archived_by = COALESCE(
    archived_by,
    CASE
      WHEN data->>'archivedBy' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (data->>'archivedBy')::uuid
      ELSE NULL
    END
  ),
  archive_reason = COALESCE(archive_reason, NULLIF(data->>'archiveReason', ''))
WHERE
  archived_at IS NULL
  AND data->>'archivedAt' ~ '^\d{4}-\d{2}-\d{2}T';

