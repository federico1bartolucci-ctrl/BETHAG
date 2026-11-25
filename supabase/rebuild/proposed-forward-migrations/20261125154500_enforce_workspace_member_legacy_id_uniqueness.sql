-- A collaborator legacy identity must resolve to at most one workspace member.
-- Fail closed if historical duplicates already exist; they require explicit reconciliation.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE legacy_id IS NOT NULL
    GROUP BY workspace_id, legacy_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'WORKSPACE_MEMBER_LEGACY_ID_DUPLICATES_EXIST',
      DETAIL = 'Reconcile duplicate workspace_members (workspace_id, legacy_id) rows before creating the unique index.';
  END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_legacy_id_uidx
  ON public.workspace_members (workspace_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

COMMENT ON INDEX public.workspace_members_workspace_legacy_id_uidx
  IS 'Prevents concurrent collaborator invitations from assigning one workspace legacy identity to multiple Auth users.';
