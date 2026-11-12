-- Letter avatars with a chosen color; leaderboard ranks by current streak.
alter table public.profiles
  add column color text not null default 'orange'
  check (color in ('orange','red','pink','purple','blue','teal','green','gray'));
grant update (color) on public.profiles to authenticated;

create or replace function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, timezone, color)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC'),
    coalesce(new.raw_user_meta_data ->> 'color', 'orange')
  );
  return new;
end $$;

drop function if exists public.find_user(text);
drop function if exists public.friends_with_stats();
drop function if exists public.weekly_leaderboard();

create function public.find_user(username text)
returns table (id uuid, username text, display_name text, color text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.color from public.profiles p where p.username = lower(find_user.username);
$$;

create function public.friends_with_stats()
returns table (id uuid, username text, display_name text, color text, current_streak int, logged_today boolean, since timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, p.color, s.current_streak, s.logged_today, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
  cross join lateral public.user_stats(p.id) s
  where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  order by p.display_name;
$$;

-- Me and my friends, ranked by current streak, then display name.
create function public.streak_leaderboard()
returns table (user_id uuid, username text, display_name text, color text, current_streak int, rank int)
language sql stable security invoker set search_path = '' as $$
  with players as (
    select (select auth.uid()) as id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships f
    where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  ),
  scored as (
    select pr.id, pr.username, pr.display_name, pr.color,
           (select s.current_streak from public.user_stats(pr.id) s) as current_streak
    from players pl join public.profiles pr on pr.id = pl.id
  )
  select id, username, display_name, color, current_streak,
         (row_number() over (order by current_streak desc, lower(display_name), username))::int
  from scored
  order by 6;
$$;

revoke execute on function public.find_user, public.friends_with_stats, public.streak_leaderboard
  from public, anon, authenticated;
grant execute on function public.find_user, public.friends_with_stats, public.streak_leaderboard to authenticated;
