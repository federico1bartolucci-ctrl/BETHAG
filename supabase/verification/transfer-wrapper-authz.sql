-- Behavioral authorization smoke test for the public transfer wrapper.
-- Runs as the authenticated database role with a synthetic JWT subject and rolls back.
-- Expected: the nonexistent transfer is rejected with FORBIDDEN; no data is changed.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

do $test$
begin
  begin
    perform public.close_condominium_member_transfer('00000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'TEST_FAILED: nonexistent transfer was not rejected';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then
      raise exception 'TEST_FAILED: expected FORBIDDEN, got %', sqlerrm;
    end if;
  end;
end
$test$;
rollback;
