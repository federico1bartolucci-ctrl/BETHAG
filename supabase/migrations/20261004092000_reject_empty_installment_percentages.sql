-- Reject empty percentage arrays instead of allowing NULL validation to pass.
-- Both public and private schedule generators expose the same edge case.
do $migration$
declare
  v_signature text;
  v_definition text;
  v_old text := 'array_length(p_percentages,1)<>n';
  v_new text := 'coalesce(array_length(p_percentages,1),0)<>n';
  v_old_count integer;
  v_new_count integer;
begin
  foreach v_signature in array array[
    'public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)',
    'private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)'
  ] loop
    if to_regprocedure(v_signature) is null then
      raise exception 'Expected schedule generator is missing: %', v_signature;
    end if;
    v_definition := pg_catalog.pg_get_functiondef(v_signature::regprocedure);
    v_old_count := (length(v_definition)-length(replace(v_definition,v_old,''))) / length(v_old);
    v_new_count := (length(v_definition)-length(replace(v_definition,v_new,''))) / length(v_new);
    if v_old_count=1 and v_new_count=0 then
      execute replace(v_definition,v_old,v_new);
    elsif v_old_count=0 and v_new_count=1 then
      raise notice 'Empty-array validation already corrected for %',v_signature;
    else
      raise exception 'Expected one percentage validation fragment in % (old %, corrected %); migration stopped',v_signature,v_old_count,v_new_count;
    end if;
  end loop;
end
$migration$;
