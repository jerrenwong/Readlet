-- Profile pictures removed from the app. The column stays (optional) so older app builds keep working;
-- it can be dropped in a later migration.
alter table public.profiles alter column avatar drop not null;
