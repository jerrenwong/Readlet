-- Bookmarks (a private to-read list) and personal API tokens so agents can add bookmarks.

-- ---------------------------------------------------------------- bookmarks (owner only)
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  title text check (title is null or char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
create index bookmarks_user_created on public.bookmarks (user_id, created_at desc);
alter table public.bookmarks enable row level security;

create policy bookmarks_select on public.bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy bookmarks_insert on public.bookmarks for insert to authenticated with check (user_id = (select auth.uid()));
create policy bookmarks_update on public.bookmarks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy bookmarks_delete on public.bookmarks for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.bookmarks from anon, authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant update (title) on public.bookmarks to authenticated;

-- ---------------------------------------------------------------- API tokens (only a hash is stored)
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.api_tokens enable row level security;
create policy api_tokens_select on public.api_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy api_tokens_delete on public.api_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.api_tokens from anon, authenticated;
grant select (id, name, created_at, last_used_at), delete on public.api_tokens to authenticated;

-- Returns the token once; afterwards only its SHA-256 is kept.
create function public.create_api_token(name text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  token text;
begin
  if uid is null then raise exception 'not signed in' using errcode = 'insufficient_privilege'; end if;
  if (select count(*) from public.api_tokens t where t.user_id = uid) >= 10 then
    raise exception 'token_limit: at most 10 tokens' using errcode = 'check_violation';
  end if;
  token := 'rl_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.api_tokens (user_id, name, token_hash)
    values (uid, create_api_token.name, encode(extensions.digest(token, 'sha256'), 'hex'));
  return token;
end $$;

create function private.token_user(token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  update public.api_tokens t set last_used_at = now()
    where t.token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
    returning t.user_id into uid;
  if uid is null then raise exception 'invalid_token' using errcode = 'insufficient_privilege'; end if;
  return uid;
end $$;

-- ---------------------------------------------------------------- token-authenticated bookmark API
-- items: [{"url": "...", "title": "..."}] (title optional). Duplicates are skipped. At most 100 per call.
create function public.api_add_bookmarks(token text, items jsonb)
returns setof public.bookmarks
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.token_user(token);
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 100 then
    raise exception 'items must be an array of at most 100' using errcode = 'check_violation';
  end if;
  return query
    insert into public.bookmarks (user_id, url, title)
    select uid, trim(i ->> 'url'), nullif(left(trim(coalesce(i ->> 'title', '')), 200), '')
    from jsonb_array_elements(items) i
    on conflict (user_id, url) do nothing
    returning *;
end $$;

create function public.api_list_bookmarks(token text)
returns setof public.bookmarks
language sql security definer set search_path = '' as $$
  select * from public.bookmarks where user_id = private.token_user(token) order by created_at desc;
$$;

create function public.api_delete_bookmark(token text, bookmark_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.bookmarks where id = bookmark_id and user_id = private.token_user(token);
  return found;
end $$;

-- ---------------------------------------------------------------- read a bookmark → today's entry
create function public.read_bookmark(bookmark_id uuid, notes text default null) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare b public.bookmarks; entry_id uuid;
begin
  delete from public.bookmarks where id = bookmark_id returning * into b;
  if b.id is null then raise exception 'bookmark not found' using errcode = 'no_data_found'; end if;
  insert into public.entries (user_id, log_date, title, url, notes)
    values (b.user_id, private.today_for(b.user_id), coalesce(b.title, left(b.url, 200)), b.url, nullif(trim(read_bookmark.notes), ''))
    returning id into entry_id;
  return entry_id;
end $$;

revoke execute on function public.create_api_token, public.api_add_bookmarks, public.api_list_bookmarks,
  public.api_delete_bookmark, public.read_bookmark from public, anon, authenticated;
grant execute on function public.create_api_token, public.read_bookmark to authenticated;
grant execute on function public.api_add_bookmarks, public.api_list_bookmarks, public.api_delete_bookmark to anon, authenticated;
revoke execute on function private.token_user from public, anon, authenticated;
