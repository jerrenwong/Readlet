-- Drop end-to-end encryption: entries are plain text protected by RLS; accounts use real email + password.
-- Existing accounts (encrypted, placeholder emails) are deleted at the owner's request.

delete from auth.users;

-- ---------------------------------------------------------------- remove key machinery
drop function if exists public.create_account(text, text, text, text, text, uuid, text, int, int, text, text);
drop function if exists public.login_info(text);
drop table if exists public.feed_keys;
drop table if exists public.accounts;

-- Functions whose return types change.
drop function if exists public.find_user(text);
drop function if exists public.friends_with_stats();
drop function if exists public.weekly_leaderboard();

alter table public.profiles drop column if exists public_key, drop column if exists avatar;

-- ---------------------------------------------------------------- entries: plain text
alter table public.entries
  drop column key_version,
  drop column nonce,
  drop column ciphertext,
  add column title text not null check (char_length(title) between 1 and 200),
  add column url text check (url is null or (char_length(url) <= 2000 and url ~* '^https?://')),
  add column notes text check (notes is null or char_length(notes) <= 500);

revoke update on public.entries from authenticated;
grant update (title, url, notes) on public.entries to authenticated;

-- ---------------------------------------------------------------- profile created with the auth user
-- signUp passes {username, display_name, timezone} as user metadata; a taken or invalid username
-- makes the whole sign-up fail, so there are no half-created accounts.
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, timezone)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.create_profile();

-- ---------------------------------------------------------------- functions (re-created)
create function public.find_user(username text)
returns table (id uuid, username text, display_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name from public.profiles p where p.username = lower(find_user.username);
$$;

create function public.friends_with_stats()
returns table (id uuid, username text, display_name text, current_streak int, logged_today boolean, since timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, s.current_streak, s.logged_today, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
  cross join lateral public.user_stats(p.id) s
  where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  order by p.display_name;
$$;

create function public.weekly_leaderboard()
returns table (user_id uuid, username text, display_name text, score int, current_streak int, rank int)
language sql stable security invoker set search_path = '' as $$
  with players as (
    select (select auth.uid()) as id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships f
    where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  ),
  p as (
    select pr.id, pr.username, pr.display_name, (now() at time zone pr.timezone)::date as today
    from players pl join public.profiles pr on pr.id = pl.id
  ),
  daily as (
    select e.user_id, least(count(*), 3)::int as n
    from public.entries e join p on p.id = e.user_id
    where e.log_date between date_trunc('week', p.today)::date and p.today
    group by e.user_id, e.log_date
  ),
  scored as (
    select p.id, p.username, p.display_name,
           coalesce((select sum(n)::int from daily where daily.user_id = p.id), 0) as score,
           (select s.current_streak from public.user_stats(p.id) s) as current_streak
    from p
  )
  select id, username, display_name, score, current_streak,
         (row_number() over (order by score desc, current_streak desc, lower(display_name), username))::int
  from scored
  order by 6;
$$;

revoke execute on function public.find_user, public.friends_with_stats, public.weekly_leaderboard
  from public, anon, authenticated;
grant execute on function public.find_user, public.friends_with_stats, public.weekly_leaderboard to authenticated;
revoke execute on function private.create_profile from public, anon, authenticated;

-- Profiles are only created by the trigger above.
drop policy if exists profiles_insert on public.profiles;
revoke insert on public.profiles from authenticated;
