-- Keep the public RPC callable by authenticated clients while preventing
-- object resolution through an attacker-controlled search_path.
-- The implementation delegates to the private function, which performs
-- explicit auth and authorization checks and is not directly executable
-- by authenticated clients.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SET search_path = '';
