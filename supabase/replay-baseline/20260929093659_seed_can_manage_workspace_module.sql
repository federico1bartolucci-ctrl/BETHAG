-- Replay-only compatibility seed for a helper whose first recorded definition is later.
-- The 247-entry Production ledger first defines this function at 20260930185301, but
-- earlier recorded policy/function payloads already call it (first seen at 20260929093700).
-- Seed the earliest recoverable implementation here; the exact later ledger definition
-- will replace it chronologically. This is a reconstruction assumption, not original DDL.
-- Never deploy this file to QA or Production.
create or replace function private.can_manage_workspace_module(
  target_workspace uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$;
