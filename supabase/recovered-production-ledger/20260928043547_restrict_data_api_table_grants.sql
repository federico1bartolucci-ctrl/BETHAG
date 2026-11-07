
revoke all on table public.activities, public.assemblies, public.communications,
  public.condominium_members, public.condominium_requests, public.condominiums,
  public.deadlines, public.documents, public.portal_access, public.profiles,
  public.suppliers, public.workspace_members, public.workspaces
from anon;

revoke all on table public.activities, public.assemblies, public.communications,
  public.condominium_members, public.condominium_requests, public.condominiums,
  public.deadlines, public.documents, public.portal_access, public.profiles,
  public.suppliers, public.workspace_members, public.workspaces
from authenticated;

grant select, insert, update, delete on table public.activities, public.assemblies,
  public.communications, public.condominium_members, public.condominium_requests,
  public.condominiums, public.deadlines, public.documents, public.portal_access,
  public.profiles, public.suppliers, public.workspace_members, public.workspaces
to authenticated;
