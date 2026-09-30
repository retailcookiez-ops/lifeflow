-- Apply after 202609300001_lifeflow.sql. Existing accounts bypass onboarding.
begin;
alter table public.profiles
  add column goals text[] not null default '{}',
  add column modules text[] not null default array['tasks','habits']::text[],
  add column wake_time time,
  add column sleep_time time,
  add column week_start smallint not null default 1,
  add column onboarding_completed_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add constraint profiles_goals_valid check (goals <@ array['productivity','fitness','studying','consistency','self-improvement']::text[] and array_position(goals,null) is null and cardinality(goals) <= 5),
  add constraint profiles_modules_valid check (modules <@ array['tasks','habits']::text[] and array_position(modules,null) is null and cardinality(modules) <= 2),
  add constraint profiles_week_start_valid check (week_start in (0,1));
-- Preserve existing users' working flow. New rows retain the NULL default.
update public.profiles set onboarding_completed_at = now();
create function public.validate_profile_preferences() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Choose a valid timezone, such as Europe/Zurich.';
  end if;
  new.display_name := btrim(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;
create trigger validate_profile_preferences before insert or update on public.profiles
for each row execute function public.validate_profile_preferences();
-- Existing owner-only CRUD policies continue to cover every new column.
notify pgrst, 'reload schema';
commit;
