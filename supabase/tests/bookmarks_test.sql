-- Bookmarks and API token tests. Run inside a transaction that is rolled back.
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
create table tests.vars (k text primary key, v text);
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
grant all on tests.vars to anon, authenticated;

insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'bm' || n || '@example.com',
       'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000',
       json_build_object('username', 'bm_' || n, 'display_name', 'B ' || n, 'timezone', 'UTC')::jsonb
from generate_series(1, 2) n;

-- owner adds and reads bookmarks; others can't
select tests.as_user('00000000-0000-0000-0000-000000000001');
insert into public.bookmarks (url, title) values ('https://example.com/a', 'A'), ('https://example.com/b', null);
do $$ begin
  if (select count(*) from public.bookmarks) <> 2 then raise exception 'FAIL: owner reads bookmarks'; end if;
  begin
    insert into public.bookmarks (url) values ('javascript:alert(1)');
  exception when check_violation then
    begin
      insert into public.bookmarks (user_id, url) values ('00000000-0000-0000-0000-000000000002', 'https://x.com');
    exception when insufficient_privilege then return; end;
    raise exception 'FAIL: inserted a bookmark for someone else';
  end;
  raise exception 'FAIL: non-http bookmark accepted';
end $$;
insert into tests.vars select 'token', public.create_api_token('agent');

select tests.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.bookmarks) <> 0 then raise exception 'FAIL: other user reads bookmarks'; end if;
  if (select count(*) from public.api_tokens) <> 0 then raise exception 'FAIL: other user reads tokens'; end if;
  delete from public.bookmarks;
  if found then raise exception 'FAIL: other user deleted bookmarks'; end if;
end $$;

-- token API works for anyone holding the token, and only for its owner's rows
select tests.as_anon();
do $$
declare t text := (select v from tests.vars where k = 'token'); n int;
begin
  select count(*) into n from public.api_add_bookmarks(t, '[{"url":"https://example.com/c","title":"C"},{"url":"https://example.com/a"}]');
  if n <> 1 then raise exception 'FAIL: api_add_bookmarks should add 1 and skip the duplicate, got %', n; end if;
  if (select count(*) from public.api_list_bookmarks(t)) <> 3 then raise exception 'FAIL: api_list_bookmarks'; end if;
  begin
    perform public.api_list_bookmarks('rl_wrong');
  exception when insufficient_privilege then
    begin
      perform 1 from public.bookmarks;
    exception when insufficient_privilege then return; end;
    raise exception 'FAIL: anon can query bookmarks';
  end;
  raise exception 'FAIL: wrong token accepted';
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.api_tokens where token_hash like 'rl_%') then raise exception 'FAIL: plaintext token stored'; end if;
  if (select last_used_at from public.api_tokens limit 1) is null then raise exception 'FAIL: last_used_at not set'; end if;
end $$;

-- owner sees token names but not hashes
select tests.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  if (select count(*) from public.api_tokens) <> 1 then raise exception 'FAIL: owner lists tokens'; end if;
  begin
    perform token_hash from public.api_tokens;
  exception when insufficient_privilege then return; end;
  raise exception 'FAIL: token hash readable';
end $$;

-- read a bookmark → today's entry; bookmark removed
do $$
declare bid uuid := (select id from public.bookmarks where url = 'https://example.com/b');
declare eid uuid;
begin
  eid := public.read_bookmark(bid, 'nice');
  if exists (select 1 from public.bookmarks where id = bid) then raise exception 'FAIL: bookmark not removed'; end if;
  if (select title from public.entries where id = eid) <> 'https://example.com/b' then raise exception 'FAIL: entry title fallback'; end if;
  if (select log_date from public.entries where id = eid) <> (now() at time zone 'UTC')::date then raise exception 'FAIL: entry date'; end if;
end $$;

-- revoke
delete from public.api_tokens;
select tests.as_anon();
do $$ begin
  begin
    perform public.api_list_bookmarks((select v from tests.vars where k = 'token'));
  exception when insufficient_privilege then return; end;
  raise exception 'FAIL: revoked token still works';
end $$;

select 'ALL BOOKMARK TESTS PASSED' as result;
