-- Phase 1: accounts and keys. RLS is enabled in the same migration as each table.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text not null check (avatar in ('cat-ginger','cat-black','cat-grey','cat-cream','cat-tabby','cat-calico','cat-siamese','cat-tuxedo')),
  timezone text not null,               -- IANA name, e.g. 'America/New_York'
  public_key text not null,             -- base64 X25519, derived from the secret key
  created_at timestamptz not null default now()
);

create function private.check_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone: %', new.timezone using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_timezone before insert or update of timezone on public.profiles
  for each row execute function private.check_timezone();

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------- accounts (owner only)
create table public.accounts (           -- login_info() exposes login_id and salt before sign-in
  user_id uuid primary key references public.profiles(id) on delete cascade,
  login_id uuid not null unique,         -- forms the placeholder login email <login_id>@readlet.invalid
  pw_salt text not null,
  pw_ops int not null check (pw_ops >= 2),
  pw_mem int not null check (pw_mem >= 67108864),
  wrapped_secret text not null,          -- secret key encrypted under the password's wrap key
  wrapped_nonce text not null
);

alter table public.accounts enable row level security;

create policy accounts_select on public.accounts for select to authenticated
  using (user_id = (select auth.uid()));
create policy accounts_insert on public.accounts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy accounts_update on public.accounts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Column privileges: tables are reachable only by signed-in users, and only the listed columns change.
revoke all on public.profiles, public.accounts from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update (username, display_name, avatar, timezone) on public.profiles to authenticated;
grant select, insert on public.accounts to authenticated;
grant update (pw_salt, pw_ops, pw_mem, wrapped_secret, wrapped_nonce) on public.accounts to authenticated;

-- Profiles: self only for now; the friends migration widens select.
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- functions
-- Creates the profile and the locked secret key in one transaction, right after auth sign-up.
create function public.create_account(
  p_username text, p_display_name text, p_avatar text, p_timezone text, p_public_key text,
  p_login_id uuid, p_pw_salt text, p_pw_ops int, p_pw_mem int, p_wrapped_secret text, p_wrapped_nonce text
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.jwt()) ->> 'email' is distinct from p_login_id::text || '@readlet.invalid' then
    raise exception 'login_id does not match the signed-in account' using errcode = 'insufficient_privilege';
  end if;
  insert into public.profiles (id, username, display_name, avatar, timezone, public_key)
    values ((select auth.uid()), p_username, p_display_name, p_avatar, p_timezone, p_public_key);
  insert into public.accounts (user_id, login_id, pw_salt, pw_ops, pw_mem, wrapped_secret, wrapped_nonce)
    values ((select auth.uid()), p_login_id, p_pw_salt, p_pw_ops, p_pw_mem, p_wrapped_secret, p_wrapped_nonce);
end $$;

create function public.username_available(username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles p where p.username = lower(username_available.username));
$$;

create function public.login_info(username text)
returns table (login_id uuid, pw_salt text, pw_ops int, pw_mem int)
language sql stable security definer set search_path = '' as $$
  select a.login_id, a.pw_salt, a.pw_ops, a.pw_mem
  from public.accounts a join public.profiles p on p.id = a.user_id
  where p.username = lower(login_info.username);
$$;

-- Deleting the auth user cascades to every row the user owns.
create function public.delete_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.create_account, public.username_available, public.login_info,
  public.delete_account from public, anon, authenticated;
grant execute on function public.create_account, public.delete_account to authenticated;
grant execute on function public.username_available, public.login_info to anon, authenticated;
