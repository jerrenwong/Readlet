-- Access-rule tests. Run inside a transaction that is rolled back (scripts/sql-test.mjs, or psql in CI).
-- Each check raises 'FAIL: …' on failure. `select tests.as_user('<id>')` switches to that signed-in user.
create schema tests;
create function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Users a=…01, b=…02, c=…03, r=…04, x1..x21=…05..…25. The sign-up trigger creates their profiles.
insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'user' || n || '@example.com', 'authenticated', 'authenticated',
       '00000000-0000-0000-0000-000000000000',
       json_build_object('username', 'User_' || n, 'display_name', 'User ' || n, 'timezone', 'UTC')::jsonb
from generate_series(1, 25) n;

-- ---------------------------------------------------------------- sign-up trigger
do $$ begin
  if (select username from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 'user_1' then
    raise exception 'FAIL: trigger did not create a lowercased profile'; end if;
  begin
    insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000099', 'dup@example.com', 'authenticated', 'authenticated',
            '00000000-0000-0000-0000-000000000000', '{"username":"user_1","display_name":"Dup","timezone":"UTC"}');
  exception when unique_violation then
    begin
      insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
      values ('00000000-0000-0000-0000-000000000098', 'bad@example.com', 'authenticated', 'authenticated',
              '00000000-0000-0000-0000-000000000000', '{"username":"no","display_name":"Bad","timezone":"UTC"}');
    exception when check_violation then return; end;
    raise exception 'FAIL: sign-up with an invalid username succeeded';
  end;
  raise exception 'FAIL: sign-up with a taken username succeeded';
end $$;

do $$ begin
  begin
    insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000097', 'c@example.com', 'authenticated', 'authenticated',
            '00000000-0000-0000-0000-000000000000', '{"username":"colorful","display_name":"C","timezone":"UTC","color":"neon"}');
  exception when check_violation then return; end;
  raise exception 'FAIL: invalid color accepted';
end $$;

-- ---------------------------------------------------------------- profiles
select tests.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    insert into public.profiles (id, username, display_name, timezone)
      values ('00000000-0000-0000-0000-000000000001', 'user_1b', 'x', 'UTC');
  exception when insufficient_privilege then
    begin
      update public.profiles set timezone = 'Mars/Olympus' where id = '00000000-0000-0000-0000-000000000001';
    exception when others then
      update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-000000000002';
      if found then raise exception 'FAIL: updated someone else''s profile'; end if;
      return;
    end;
    raise exception 'FAIL: invalid timezone accepted';
  end;
  raise exception 'FAIL: client inserted a profile directly';
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL: non-friend reads profile'; end if;
  if (select count(*) from public.find_user('USER_1')) <> 1 then raise exception 'FAIL: find_user exact match'; end if;
  if (select count(*) from public.find_user('user_')) <> 0 then raise exception 'FAIL: find_user matches partially'; end if;
end $$;

select tests.as_anon();
do $$ begin
  if not public.username_available('free_name') or public.username_available('user_1') then
    raise exception 'FAIL: username_available'; end if;
  begin perform 1 from public.profiles; exception when insufficient_privilege then
    begin perform public.find_user('user_1'); exception when insufficient_privilege then
      begin perform 1 from public.entries; exception when insufficient_privilege then return; end;
      raise exception 'FAIL: anon can query entries';
    end;
    raise exception 'FAIL: anon can call find_user';
  end;
  raise exception 'FAIL: anon can query profiles';
end $$;

-- ---------------------------------------------------------------- entries (not friends yet)
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.entries (user_id, log_date, title, url, notes)
  values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, 'Dune', 'https://example.com', 'good');
do $$ begin
  begin
    insert into public.entries (user_id, log_date, title)
      values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date - 1, 'Yesterday');
  exception when others then
    begin
      insert into public.entries (user_id, log_date, title)
        values ('00000000-0000-0000-0000-000000000002', (now() at time zone 'UTC')::date, 'As b');
    exception when others then
      begin
        update public.entries set log_date = log_date - 1;
      exception when others then
        begin
          insert into public.entries (user_id, log_date, title, url)
            values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, 'x', 'javascript:alert(1)');
        exception when check_violation then
          begin
            insert into public.entries (user_id, log_date, title)
              values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, '');
          exception when check_violation then return; end;
          raise exception 'FAIL: empty title accepted';
        end;
        raise exception 'FAIL: non-http link accepted';
      end;
      raise exception 'FAIL: log_date is changeable';
    end;
    raise exception 'FAIL: inserted an entry as someone else';
  end;
  raise exception 'FAIL: inserted an entry dated yesterday';
end $$;
update public.entries set notes = 'edited' where title = 'Dune';
update public.profiles set color = 'teal' where id = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if not exists (select 1 from public.entries where notes = 'edited') then
    raise exception 'FAIL: author cannot edit today''s entry'; end if;
end $$;

reset role;
insert into public.entries (user_id, log_date, title)
  values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date - 1, 'Old');
select tests.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  update public.entries set notes = 'x' where title = 'Old';
  if found then raise exception 'FAIL: edited an older entry'; end if;
  delete from public.entries where title = 'Old';
  if found then raise exception 'FAIL: deleted an older entry'; end if;
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.entries) <> 0 then raise exception 'FAIL: non-friend reads entries'; end if;
  if (select count(*) from public.user_stats('00000000-0000-0000-0000-000000000001')) <> 0 then
    raise exception 'FAIL: non-friend reads stats'; end if;
  delete from public.entries;
  if found then raise exception 'FAIL: non-author deleted entries'; end if;
end $$;

-- ---------------------------------------------------------------- friendship lifecycle
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.friendships (user_a, user_b, requested_by, status)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001', 'pending');
do $$ begin
  update public.friendships set status = 'accepted';
  if found then raise exception 'FAIL: requester accepted their own request'; end if;
  begin
    insert into public.friendships (user_a, user_b, requested_by, status)
      values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
              '00000000-0000-0000-0000-000000000001', 'accepted');
  exception when others then
    begin
      insert into public.friendships (user_a, user_b, requested_by, status)
        values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
                '00000000-0000-0000-0000-000000000002', 'pending');
    exception when others then return; end;
    raise exception 'FAIL: created a request between two other people';
  end;
  raise exception 'FAIL: inserted an already-accepted friendship';
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL: pending request should show the requester''s profile'; end if;
  if (select count(*) from public.entries) <> 0 then raise exception 'FAIL: pending friend reads entries'; end if;
  begin
    update public.friendships set requested_by = '00000000-0000-0000-0000-000000000002';
  exception when insufficient_privilege then return; end;
  raise exception 'FAIL: requested_by is changeable';
end $$;
update public.friendships set status = 'accepted';

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.entries) <> 2 then raise exception 'FAIL: friend cannot read entries'; end if;
  if (select logged_today from public.user_stats('00000000-0000-0000-0000-000000000001')) is not true then
    raise exception 'FAIL: friend reads stats'; end if;
  update public.entries set notes = 'x';
  if found then raise exception 'FAIL: friend edited an entry'; end if;
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000003');
do $$ begin
  if (select count(*) from public.entries) + (select count(*) from public.friendships) <> 0 then
    raise exception 'FAIL: outsider reads private rows'; end if;
  if (select count(*) from public.profiles where id <> '00000000-0000-0000-0000-000000000003') <> 0 then
    raise exception 'FAIL: outsider reads other profiles'; end if;
  delete from public.friendships;
  if found then raise exception 'FAIL: outsider deleted a friendship'; end if;
end $$;

-- ---------------------------------------------------------------- stats and leaderboard
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.entries (user_id, log_date, title)
select '00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, 'more' from generate_series(1, 4);
do $$
declare s record;
begin
  select * into s from public.user_stats('00000000-0000-0000-0000-000000000001');
  if s.current_streak <> 2 or s.longest_streak <> 2 or s.total_reads <> 6 or not s.logged_today then
    raise exception 'FAIL: user_stats %', s; end if;
  if (select count(*) from public.streak_leaderboard()) <> 2 then raise exception 'FAIL: leaderboard players'; end if;
  if (select user_id from public.streak_leaderboard() where rank = 1) <> '00000000-0000-0000-0000-000000000001' then
    raise exception 'FAIL: leaderboard should rank the longer streak first'; end if;
  if (select count(*) from public.friends_with_stats()) <> 1 then raise exception 'FAIL: friends_with_stats'; end if;
end $$;

-- ---------------------------------------------------------------- unfriend
select tests.as_user('00000000-0000-0000-0000-000000000002');
delete from public.friendships;
do $$ begin
  if (select count(*) from public.entries) <> 0 then raise exception 'FAIL: ex-friend still reads entries'; end if;
end $$;

-- ---------------------------------------------------------------- 20 requests per day
select tests.as_user('00000000-0000-0000-0000-000000000004');
insert into public.friendships (user_a, user_b, requested_by, status)
select '00000000-0000-0000-0000-000000000004', ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-000000000004', 'pending'
from generate_series(5, 23) n;
delete from public.friendships where user_b = '00000000-0000-0000-0000-000000000023';
insert into public.friendships (user_a, user_b, requested_by, status)
  values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000024',
          '00000000-0000-0000-0000-000000000004', 'pending');
do $$ begin
  begin
    insert into public.friendships (user_a, user_b, requested_by, status)
      values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000025',
              '00000000-0000-0000-0000-000000000004', 'pending');
  exception when others then
    if sqlerrm like 'friend_request_limit%' then return; end if;
    raise;
  end;
  raise exception 'FAIL: 21st friend request in a day accepted';
end $$;

-- ---------------------------------------------------------------- delete account
select tests.as_user('00000000-0000-0000-0000-000000000001');
select public.delete_account();
reset role;
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.entries where user_id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: delete_account left rows behind'; end if;
end $$;

select 'ALL RLS TESTS PASSED' as result;
