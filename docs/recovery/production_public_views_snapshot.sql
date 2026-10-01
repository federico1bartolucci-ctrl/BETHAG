-- RECOVERY SNAPSHOT ONLY: production view definition from read-only catalog.
-- Not an executable migration. Review referenced objects and dependencies before replay.

CREATE OR REPLACE VIEW public.condominium_fund_availability AS
SELECT id,
    workspace_id,
    condominium_id,
    name,
    purpose,
    target_amount,
    allocated_amount,
    used_amount,
    GREATEST(round((allocated_amount - used_amount), 2), (0)::numeric) AS available_amount,
    GREATEST(round((target_amount - allocated_amount), 2), (0)::numeric) AS target_remaining_amount,
    active,
    notes,
    created_at,
    updated_at
   FROM condominium_funds f;
