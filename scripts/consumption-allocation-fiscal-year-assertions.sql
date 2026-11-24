SET ROLE authenticated;

DO $test$
BEGIN
  BEGIN
    PERFORM public.generate_consumption_allocations(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      'Acqua'
    );
    RAISE EXCEPTION 'Expected a fiscal-year mismatch to be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'La spesa e i dati di consumo devono appartenere allo stesso esercizio contabile' THEN
      RAISE;
    END IF;
  END;
END
$test$;

RESET ROLE;
