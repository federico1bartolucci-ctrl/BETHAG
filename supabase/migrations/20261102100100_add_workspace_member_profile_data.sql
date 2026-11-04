-- Persist collaborator display metadata expected by the application sync path.
-- This is a forward migration; it is not applied to Production until the approved cutover.
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;
