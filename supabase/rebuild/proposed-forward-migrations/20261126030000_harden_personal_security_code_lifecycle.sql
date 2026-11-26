-- Enforce the personal security code at the database boundary.
-- Initial setup remains possible while disabled; changing/disabling an enabled
-- code requires the current code through the atomic change RPC.
-- Five failed attempts lock verification for 15 minutes. Row locks serialize
-- concurrent attempts so they cannot race around the threshold.

ALTER TABLE public.user_security_settings
  ADD COLUMN IF NOT EXISTS personal_code_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_code_locked_until timestamptz;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'user_security_settings_personal_code_attempts_nonnegative'
      AND conrelid = 'public.user_security_settings'::pg_catalog.regclass
  ) THEN
    ALTER TABLE public.user_security_settings
      ADD CONSTRAINT user_security_settings_personal_code_attempts_nonnegative
      CHECK (personal_code_failed_attempts >= 0);
  END IF;
END
$migration$;

CREATE OR REPLACE FUNCTION private.set_personal_security_code(
  p_code text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_enabled boolean;
  v_code text;
  v_saved_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'Stato del codice personale non valido';
  END IF;

  v_code := CASE WHEN p_code IS NULL THEN NULL ELSE pg_catalog.btrim(p_code) END;

  IF p_enabled IS TRUE AND (
    v_code IS NULL
    OR pg_catalog.char_length(v_code) < 6
    OR pg_catalog.char_length(v_code) > 32
    OR pg_catalog.octet_length(v_code) > 72
  ) THEN
    RAISE EXCEPTION 'Il codice personale deve contenere da 6 a 32 caratteri e non superare 72 byte';
  END IF;

  IF p_enabled IS FALSE AND v_code IS NOT NULL THEN
    RAISE EXCEPTION 'Per disattivare il codice è necessaria la procedura di verifica';
  END IF;

  SELECT personal_code_enabled
    INTO v_existing_enabled
  FROM public.user_security_settings
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND v_existing_enabled IS TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PERSONAL_CODE_CHANGE_REQUIRES_VERIFICATION';
  END IF;

  INSERT INTO public.user_security_settings AS settings (
    user_id,
    personal_code_hash,
    personal_code_enabled,
    personal_code_failed_attempts,
    personal_code_locked_until,
    updated_at
  )
  VALUES (
    v_user_id,
    CASE WHEN p_enabled IS TRUE
      THEN extensions.crypt(v_code, extensions.gen_salt('bf'))
      ELSE NULL
    END,
    p_enabled,
    0,
    NULL,
    pg_catalog.now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET personal_code_hash = EXCLUDED.personal_code_hash,
      personal_code_enabled = EXCLUDED.personal_code_enabled,
      personal_code_failed_attempts = 0,
      personal_code_locked_until = NULL,
      updated_at = EXCLUDED.updated_at
  WHERE settings.personal_code_enabled IS NOT TRUE
  RETURNING settings.user_id INTO v_saved_user_id;

  IF v_saved_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PERSONAL_CODE_CHANGE_REQUIRES_VERIFICATION';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION private.verify_personal_security_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_hash text;
  v_enabled boolean;
  v_failed_attempts integer;
  v_locked_until timestamptz;
  v_candidate text;
  v_next_attempts integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_code IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    personal_code_hash,
    personal_code_enabled,
    personal_code_failed_attempts,
    personal_code_locked_until
  INTO
    v_hash,
    v_enabled,
    v_failed_attempts,
    v_locked_until
  FROM public.user_security_settings
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_enabled IS NOT TRUE OR v_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > pg_catalog.now() THEN
    RETURN false;
  END IF;

  v_candidate := pg_catalog.btrim(p_code);

  IF pg_catalog.char_length(v_candidate) BETWEEN 6 AND 32
     AND extensions.crypt(v_candidate, v_hash) = v_hash THEN
    UPDATE public.user_security_settings
    SET personal_code_failed_attempts = 0,
        personal_code_locked_until = NULL,
        updated_at = pg_catalog.now()
    WHERE user_id = v_user_id;
    RETURN true;
  END IF;

  v_next_attempts := LEAST(COALESCE(v_failed_attempts, 0) + 1, 5);

  UPDATE public.user_security_settings
  SET personal_code_failed_attempts = v_next_attempts,
      personal_code_locked_until = CASE
        WHEN v_next_attempts >= 5 THEN pg_catalog.now() + INTERVAL '15 minutes'
        ELSE NULL
      END,
      updated_at = pg_catalog.now()
  WHERE user_id = v_user_id;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION private.change_personal_security_code(
  p_current_code text,
  p_new_code text,
  p_enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_enabled boolean;
  v_new_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'Stato del codice personale non valido';
  END IF;

  v_new_code := CASE WHEN p_new_code IS NULL THEN NULL ELSE pg_catalog.btrim(p_new_code) END;

  IF p_enabled IS TRUE AND (
    v_new_code IS NULL
    OR pg_catalog.char_length(v_new_code) < 6
    OR pg_catalog.char_length(v_new_code) > 32
    OR pg_catalog.octet_length(v_new_code) > 72
  ) THEN
    RAISE EXCEPTION 'Il nuovo codice personale deve contenere da 6 a 32 caratteri e non superare 72 byte';
  END IF;

  IF p_enabled IS FALSE AND v_new_code IS NOT NULL THEN
    RAISE EXCEPTION 'Il nuovo codice deve essere nullo quando si disattiva la protezione';
  END IF;

  SELECT personal_code_enabled
    INTO v_enabled
  FROM public.user_security_settings
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_enabled IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- The verification function takes the same row lock and persists failed
  -- attempts. Returning false (rather than raising) commits the lockout count.
  IF NOT private.verify_personal_security_code(p_current_code) THEN
    RETURN false;
  END IF;

  UPDATE public.user_security_settings
  SET personal_code_hash = CASE
        WHEN p_enabled IS TRUE
          THEN extensions.crypt(v_new_code, extensions.gen_salt('bf'))
        ELSE NULL
      END,
      personal_code_enabled = p_enabled,
      personal_code_failed_attempts = 0,
      personal_code_locked_until = NULL,
      updated_at = pg_catalog.now()
  WHERE user_id = v_user_id;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_personal_security_code(
  p_code text,
  p_enabled boolean
)
RETURNS void
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.set_personal_security_code($1, $2);
$function$;

CREATE OR REPLACE FUNCTION public.verify_personal_security_code(p_code text)
RETURNS boolean
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.verify_personal_security_code($1);
$function$;

CREATE OR REPLACE FUNCTION public.change_personal_security_code(
  p_current_code text,
  p_new_code text,
  p_enabled boolean
)
RETURNS boolean
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.change_personal_security_code($1, $2, $3);
$function$;

GRANT USAGE ON SCHEMA private TO authenticated;

REVOKE ALL ON FUNCTION private.set_personal_security_code(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION private.verify_personal_security_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(text) TO authenticated;
REVOKE ALL ON FUNCTION private.change_personal_security_code(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.change_personal_security_code(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.set_personal_security_code(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_personal_security_code(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_personal_security_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_personal_security_code(text) TO authenticated;
REVOKE ALL ON FUNCTION public.change_personal_security_code(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_personal_security_code(text, text, boolean) TO authenticated;
