-- Access-rule tests. Run inside a transaction that is rolled back (scripts/sql-test.mjs, or psql in CI).
-- Each check raises 'FAIL: …' on failure. `select tests.as_user('<id>')` switches to that signed-in user.
create schema tests;
create table tests.emails (id uuid primary key, email text);
create function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'email',
      (select email from tests.emails e where e.id = uid))::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
grant select on tests.emails to anon, authenticated;

-- Users: a, b, c and r (requester) plus x1..x21 as request targets.
insert into auth.users (id, email, aud, role, instance_id)
select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'login-' || n || '@readlet.invalid', 'authenticated', 'authenticated',
       '00000000-0000-0000-0000-000000000000'
from generate_series(1, 25) n;
insert into tests.emails select id, email from auth.users where email like 'login-%@readlet.invalid';
-- a = …01, b = …02, c = …03, r = …04, x1..x21 = …05..…25
insert into public.profiles (id, username, display_name, avatar, timezone, public_key)
select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'user_' || n, 'User ' || n,
       'cat-ginger', 'UTC', 'pk' || n
from generate_series(2, 25) n;

-- ---------------------------------------------------------------- accounts
select tests.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform public.create_account('user_1', 'User 1', 'cat-ginger', 'UTC', 'pk1',
      '99999999-9999-9999-9999-999999999999', 's', 2, 67108864, 'w', 'n');
  exception when others then return; end;
  raise exception 'FAIL: create_account accepted a login_id that is not the signed-in account';
end $$;
-- The login id for user 1 is not a uuid email, so give it one that matches.
reset role;
update auth.users set email = '11111111-1111-1111-1111-111111111111@readlet.invalid'
  where id = '00000000-0000-0000-0000-000000000001';
update tests.emails set email = '11111111-1111-1111-1111-111111111111@readlet.invalid'
  where id = '00000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-000000000001');
select public.create_account('user_1', 'User 1', 'cat-ginger', 'UTC', 'pk1',
  '11111111-1111-1111-1111-111111111111', 'salt', 2, 67108864, 'wrapped', 'nonce');
do $$ begin
  if (select count(*) from public.accounts) <> 1 then raise exception 'FAIL: owner cannot read own account'; end if;
  begin
    insert into public.profiles (id, username, display_name, avatar, timezone, public_key)
      values ('00000000-0000-0000-0000-000000000001', 'user_1b', 'x', 'cat-ginger', 'UTC', 'pk');
  exception when others then
    begin
      update public.profiles set public_key = 'evil' where id = '00000000-0000-0000-0000-000000000001';
    exception when others then
      begin
        insert into public.profiles (id, username, display_name, avatar, timezone, public_key)
          values ('00000000-0000-0000-0000-000000000002', 'user_x', 'x', 'cat-ginger', 'UTC', 'pk');
      exception when others then
        begin
          update public.profiles set timezone = 'Mars/Olympus' where id = '00000000-0000-0000-0000-000000000001';
        exception when others then return; end;
        raise exception 'FAIL: invalid timezone accepted';
      end;
      raise exception 'FAIL: inserted a profile for someone else';
    end;
    raise exception 'FAIL: public_key is changeable';
  end;
  raise exception 'FAIL: second profile insert (self, once)';
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.accounts) <> 0 then raise exception 'FAIL: b reads someone else''s accounts row'; end if;
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'FAIL: non-friend reads profile'; end if;
  update public.accounts set wrapped_secret = 'x' where user_id = '00000000-0000-0000-0000-000000000001';
  if found then raise exception 'FAIL: b updated a''s account'; end if;
  if (select count(*) from public.find_user('USER_1')) <> 1 then raise exception 'FAIL: find_user exact match'; end if;
  if (select count(*) from public.find_user('user_')) <> 0 then raise exception 'FAIL: find_user matches partially'; end if;
end $$;

select tests.as_anon();
do $$ begin
  if (select pw_salt from public.login_info('user_1')) <> 'salt' then raise exception 'FAIL: login_info for anon'; end if;
  if not public.username_available('free_name') or public.username_available('user_1') then
    raise exception 'FAIL: username_available'; end if;
  begin perform 1 from public.profiles; exception when insufficient_privilege then
    begin perform public.find_user('user_1'); exception when insufficient_privilege then return; end;
    raise exception 'FAIL: anon can call find_user';
  end;
  raise exception 'FAIL: anon can query profiles';
end $$;

-- ---------------------------------------------------------------- entries and feed keys (not friends yet)
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
  values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, 1, 'n', 'c-today');
insert into public.feed_keys (owner_id, recipient_id, key_version, wrapped_key)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'k-self');
do $$ begin
  begin
    insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
      values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date - 1, 1, 'n', 'c');
  exception when others then
    begin
      insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
        values ('00000000-0000-0000-0000-000000000002', (now() at time zone 'UTC')::date, 1, 'n', 'c');
    exception when others then
      begin
        update public.entries set log_date = log_date - 1;
      exception when others then
        begin
          insert into public.feed_keys (owner_id, recipient_id, key_version, wrapped_key)
            values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1, 'k');
        exception when others then
          begin
            insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
              values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date + 1, 1, 'n', 'c');
          exception when others then return; end;
          raise exception 'FAIL: future-dated entry accepted';
        end;
        raise exception 'FAIL: feed key wrapped for a non-friend';
      end;
      raise exception 'FAIL: log_date is changeable';
    end;
    raise exception 'FAIL: inserted an entry as someone else';
  end;
  raise exception 'FAIL: inserted an entry dated yesterday';
end $$;
update public.entries set ciphertext = 'c-edited' where ciphertext = 'c-today';
do $$ begin
  if not exists (select 1 from public.entries where ciphertext = 'c-edited') then
    raise exception 'FAIL: author cannot edit today''s entry'; end if;
end $$;

-- An older entry (inserted by the admin) is locked for the author.
reset role;
insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
  values ('00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date - 1, 1, 'n', 'c-old');
select tests.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  update public.entries set ciphertext = 'x' where ciphertext = 'c-old';
  if found then raise exception 'FAIL: edited an older entry'; end if;
  delete from public.entries where ciphertext = 'c-old';
  if found then raise exception 'FAIL: deleted an older entry'; end if;
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.entries) <> 0 then raise exception 'FAIL: non-friend reads entries'; end if;
  if (select count(*) from public.feed_keys) <> 0 then raise exception 'FAIL: non-friend reads feed keys'; end if;
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

select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.feed_keys (owner_id, recipient_id, key_version, wrapped_key)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1, 'k-for-b');
do $$ begin
  if not public.are_friends('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL: are_friends after accept'; end if;
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.entries) <> 2 then raise exception 'FAIL: friend cannot read entries'; end if;
  if (select wrapped_key from public.feed_keys where recipient_id = '00000000-0000-0000-0000-000000000002') <> 'k-for-b' then
    raise exception 'FAIL: friend cannot read their wrapped key'; end if;
  if (select count(*) from public.feed_keys) <> 1 then raise exception 'FAIL: friend reads keys wrapped for others'; end if;
  if (select logged_today from public.user_stats('00000000-0000-0000-0000-000000000001')) is not true then
    raise exception 'FAIL: friend reads stats'; end if;
  update public.entries set ciphertext = 'x';
  if found then raise exception 'FAIL: friend edited an entry'; end if;
  delete from public.feed_keys;
  if found then raise exception 'FAIL: recipient deleted the owner''s key'; end if;
end $$;

select tests.as_user('00000000-0000-0000-0000-000000000003');
do $$ begin
  if (select count(*) from public.entries) + (select count(*) from public.feed_keys)
     + (select count(*) from public.friendships) + (select count(*) from public.accounts) <> 0 then
    raise exception 'FAIL: outsider reads private rows'; end if;
  if (select count(*) from public.profiles where id <> '00000000-0000-0000-0000-000000000003') <> 0 then
    raise exception 'FAIL: outsider reads other profiles'; end if;
  delete from public.friendships;
  if found then raise exception 'FAIL: outsider deleted a friendship'; end if;
end $$;

-- ---------------------------------------------------------------- stats and leaderboard
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.entries (user_id, log_date, key_version, nonce, ciphertext)
select '00000000-0000-0000-0000-000000000001', (now() at time zone 'UTC')::date, 1, 'n', 'more' from generate_series(1, 4);
do $$
declare s record; expected int; got int;
begin
  -- 1 entry yesterday (counts unless today is Monday) + 5 today capped at 3
  expected := 3 + (extract(isodow from (now() at time zone 'UTC')::date) <> 1)::int;
  select score into got from public.weekly_leaderboard() where user_id = '00000000-0000-0000-0000-000000000001';
  select * into s from public.user_stats('00000000-0000-0000-0000-000000000001');
  if s.current_streak <> 2 or s.longest_streak <> 2 or s.total_reads <> 6 or not s.logged_today then
    raise exception 'FAIL: user_stats %', s; end if;
  if got <> expected then raise exception 'FAIL: leaderboard cap (got %, expected %)', got, expected; end if;
  if (select count(*) from public.weekly_leaderboard()) <> 2 then raise exception 'FAIL: leaderboard players'; end if;
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
from generate_series(5, 23) n;  -- 19 requests
delete from public.friendships where user_b = '00000000-0000-0000-0000-000000000023';  -- cancel one
insert into public.friendships (user_a, user_b, requested_by, status)
  values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000024',
          '00000000-0000-0000-0000-000000000004', 'pending');  -- 20th
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
     or exists (select 1 from public.entries where user_id = '00000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.feed_keys where owner_id = '00000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.accounts where user_id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: delete_account left rows behind'; end if;
end $$;

select 'ALL RLS TESTS PASSED' as result;
