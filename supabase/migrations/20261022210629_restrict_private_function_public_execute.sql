-- Revoke implicit PUBLIC execution on private-schema routines.
-- Applied and verified on the three isolated BETHAG QA projects.
-- This migration intentionally does not alter Production.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
