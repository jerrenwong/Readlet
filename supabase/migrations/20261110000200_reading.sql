-- Phases 2–3: friendships, feed keys, entries, stats and the leaderboard.

-- ---------------------------------------------------------------- friendships
create table public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index friendships_b on public.friendships (user_b);
alter table public.friendships enable row level security;

-- Every request ever sent, so cancelling requests can't get around the daily limit. Not exposed by the API.
create table private.friend_request_log (
  requester uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index friend_request_log_requester on private.friend_request_log (requester, created_at);

create function private.limit_friend_requests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.friend_request_log l
      where l.requester = new.requested_by and l.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'friend_request_limit: at most 20 friend requests per day' using errcode = 'check_violation';
  end if;
  insert into private.friend_request_log (requester) values (new.requested_by);
  return new;
end $$;

create trigger friendships_limit before insert on public.friendships
  for each row execute function private.limit_friend_requests();

-- Helpers used inside policies (security definer so they don't recurse through RLS).
create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b) and f.status = 'accepted');
$$;

create function private.linked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships f where f.user_a = least(a, b) and f.user_b = greatest(a, b));
$$;

create function private.today_for(u uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone p.timezone)::date from public.profiles p where p.id = u;
$$;

create policy friendships_select on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending' and (select auth.uid()) in (user_a, user_b));
create policy friendships_accept on public.friendships for update to authenticated
  using (status = 'pending' and requested_by <> (select auth.uid()) and (select auth.uid()) in (user_a, user_b))
  with check (status = 'accepted');
create policy friendships_delete on public.friendships for delete to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- Profiles: self, friends, and anyone with a pending request either way.
create policy profiles_select_linked on public.profiles for select to authenticated
  using (private.linked((select auth.uid()), id));

-- ---------------------------------------------------------------- feed keys
create table public.feed_keys (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  key_version int not null check (key_version >= 1),
  wrapped_key text not null,            -- crypto_box_seal to recipient, base64
  created_at timestamptz not null default now(),
  primary key (owner_id, recipient_id, key_version)
);
create index feed_keys_recipient on public.feed_keys (recipient_id);
alter table public.feed_keys enable row level security;

create policy feed_keys_select on public.feed_keys for select to authenticated
  using ((select auth.uid()) in (owner_id, recipient_id));
create policy feed_keys_insert on public.feed_keys for insert to authenticated
  with check (owner_id = (select auth.uid())
    and (recipient_id = (select auth.uid()) or public.are_friends((select auth.uid()), recipient_id)));
create policy feed_keys_delete on public.feed_keys for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------- entries
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  key_version int not null,
  nonce text not null,
  ciphertext text not null check (char_length(ciphertext) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_user_date on public.entries (user_id, log_date desc);
create index entries_created on public.entries (created_at desc);
alter table public.entries enable row level security;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger entries_touch before update on public.entries
  for each row execute function private.touch_updated_at();

create policy entries_select on public.entries for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends((select auth.uid()), user_id));
create policy entries_insert on public.entries for insert to authenticated
  with check (user_id = (select auth.uid()) and log_date = private.today_for(user_id));
create policy entries_update on public.entries for update to authenticated
  using (user_id = (select auth.uid()) and log_date = private.today_for(user_id))
  with check (user_id = (select auth.uid()) and log_date = private.today_for(user_id));
create policy entries_delete on public.entries for delete to authenticated
  using (user_id = (select auth.uid()) and log_date = private.today_for(user_id));

revoke all on public.friendships, public.feed_keys, public.entries from anon, authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant select, insert, delete on public.feed_keys to authenticated;
grant select, insert, delete on public.entries to authenticated;
grant update (ciphertext, nonce, key_version) on public.entries to authenticated;

-- ---------------------------------------------------------------- functions
-- Exact-match lookup for strangers (search box and invite links).
create function public.find_user(username text)
returns table (id uuid, username text, display_name text, avatar text, public_key text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar, p.public_key
  from public.profiles p where p.username = lower(find_user.username);
$$;

-- Runs as the caller, so RLS decides whose stats are visible (self and friends).
create function public.user_stats(target uuid)
returns table (current_streak int, longest_streak int, total_reads int, logged_today boolean)
language sql stable security invoker set search_path = '' as $$
  with tz as (
    select (now() at time zone p.timezone)::date as today from public.profiles p where p.id = target
  ),
  e as (select log_date from public.entries where user_id = target),
  d as (select distinct log_date from e, tz where log_date <= tz.today),
  g as (select log_date, log_date - (row_number() over (order by log_date))::int as grp from d),
  runs as (select count(*)::int as n, max(log_date) as last from g group by grp)
  select
    coalesce((select r.n from runs r, tz where r.last >= tz.today - 1 order by r.last desc limit 1), 0),
    coalesce((select max(n) from runs), 0),
    (select count(*)::int from e),
    exists (select 1 from d, tz where d.log_date = tz.today)
  from tz;
$$;

-- Accepted friends with their stats, for the Friends list and the side column.
create function public.friends_with_stats()
returns table (id uuid, username text, display_name text, avatar text, public_key text,
               current_streak int, logged_today boolean, since timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar, p.public_key, s.current_streak, s.logged_today, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
  cross join lateral public.user_stats(p.id) s
  where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  order by p.display_name;
$$;

-- This week (Monday..today in each player's own timezone), at most 3 entries per day.
-- Ties: current streak, then display name.
create function public.weekly_leaderboard()
returns table (user_id uuid, username text, display_name text, avatar text,
               score int, current_streak int, rank int)
language sql stable security invoker set search_path = '' as $$
  with players as (
    select (select auth.uid()) as id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships f
    where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  ),
  p as (
    select pr.id, pr.username, pr.display_name, pr.avatar,
           (now() at time zone pr.timezone)::date as today
    from players pl join public.profiles pr on pr.id = pl.id
  ),
  daily as (
    select e.user_id, least(count(*), 3)::int as n
    from public.entries e join p on p.id = e.user_id
    where e.log_date between date_trunc('week', p.today)::date and p.today
    group by e.user_id, e.log_date
  ),
  scored as (
    select p.id, p.username, p.display_name, p.avatar,
           coalesce((select sum(n)::int from daily where daily.user_id = p.id), 0) as score,
           (select s.current_streak from public.user_stats(p.id) s) as current_streak
    from p
  )
  select id, username, display_name, avatar, score, current_streak,
         (row_number() over (order by score desc, current_streak desc, lower(display_name), username))::int
  from scored
  order by 7;
$$;

revoke execute on function public.are_friends, public.find_user, public.user_stats,
  public.friends_with_stats, public.weekly_leaderboard from public, anon, authenticated;
grant execute on function public.are_friends, public.find_user, public.user_stats,
  public.friends_with_stats, public.weekly_leaderboard to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
-- Policies run as the caller, so signed-in users may call these two helpers (nothing else in `private`).
grant usage on schema private to authenticated;
grant execute on function private.linked, private.today_for to authenticated;
