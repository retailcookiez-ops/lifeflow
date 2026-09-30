-- Run once on a new Supabase project using SQL Editor or `supabase db push`.
begin;
create function public.valid_schedule_days(days smallint[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]
    and array_position(days, null) is null
    and cardinality(days) = (select count(distinct d) from unnest(days) d);
$$;
create function public.valid_schedule_history(history jsonb, first_day date, current_days smallint[]) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; previous_day date; item_day date; days smallint[];
begin
  if jsonb_typeof(history) is distinct from 'array' or jsonb_array_length(history) = 0 then return false; end if;
  for item in select value from jsonb_array_elements(history) loop
    item_day := (item->>'from')::date;
    select array_agg(value::smallint) into days from jsonb_array_elements_text(item->'weekdays');
    if item_day is null or public.valid_schedule_days(days) is not true then return false; end if;
    if previous_day is null and item_day <> first_day then return false; end if;
    if previous_day is not null and item_day <= previous_day then return false; end if;
    previous_day := item_day;
  end loop;
  return coalesce(days @> current_days and days <@ current_days, false);
exception when others then return false;
end;
$$;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  status text not null default 'open' check (status in ('open','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  import_source_id text,
  unique (user_id, import_source_id),
  check ((status = 'open' and completed_at is null) or (status = 'completed' and completed_at is not null))
);
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  schedule_days smallint[] not null check (public.valid_schedule_days(schedule_days)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Extra fields preserve existing calendar-day and past-schedule semantics.
  created_on date not null default current_date check (created_on between date '1000-01-01' and date '9999-12-31'),
  schedule_history jsonb not null,
  import_source_id text,
  unique (id, user_id),
  unique (user_id, import_source_id),
  check (public.valid_schedule_history(schedule_history, created_on, schedule_days))
);
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null check (completed_on between date '1000-01-01' and date '9999-12-31'),
  created_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
  unique (habit_id, completed_on)
);
-- Import receipts survive deletion of imported rows, so retries never resurrect deleted data.
create table public.local_import_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task', 'habit')),
  source_id text not null check (char_length(source_id) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, source_id)
);
alter table public.local_import_records enable row level security;
create policy import_select on public.local_import_records for select to authenticated using ((select auth.uid()) = user_id);
create policy import_insert on public.local_import_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy import_update on public.local_import_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy import_delete on public.local_import_records for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.local_import_records from anon;
grant select, insert, update, delete on public.local_import_records to authenticated;

create index tasks_user_id_idx on public.tasks(user_id);
create index habits_user_id_idx on public.habits(user_id);
create index habit_completions_user_id_idx on public.habit_completions(user_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy tasks_select on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

create policy habits_select on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy habits_insert on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy habits_update on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habits_delete on public.habits for delete to authenticated using ((select auth.uid()) = user_id);

create policy completions_select on public.habit_completions for select to authenticated using ((select auth.uid()) = user_id);
create policy completions_insert on public.habit_completions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy completions_update on public.habit_completions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy completions_delete on public.habit_completions for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.tasks, public.habits, public.habit_completions from anon;
grant select, insert, update, delete on public.profiles, public.tasks, public.habits, public.habit_completions to authenticated;

create function public.touch_task() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.title := btrim(new.title);
  if new.status = 'open' then new.completed_at := null;
  elsif new.completed_at is null then new.completed_at := now(); end if;
  return new;
end;
$$;
create trigger touch_task before insert or update on public.tasks for each row execute function public.touch_task();

create function public.validate_habit_completion() returns trigger language plpgsql set search_path = '' as $$
declare first_day date;
begin
  select created_on into first_day from public.habits where id = new.habit_id and user_id = new.user_id;
  if first_day is not null and new.completed_on < first_day then
    raise exception 'Completion cannot be before habit creation' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_habit_completion before insert or update on public.habit_completions
  for each row execute function public.validate_habit_completion();

create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare tz text;
begin
  tz := coalesce(new.raw_user_meta_data->>'timezone', 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then tz := 'UTC'; end if;
  insert into public.profiles(id, display_name, timezone)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''),80), tz);
  return new;
end;
$$;
revoke all on function public.create_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
-- Backfill accounts created before this migration.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

-- Explicit import: all rows commit together or none do. Caller identity comes from the JWT.
-- Unique source IDs make retries safe; existing cloud rows are never overwritten.
create function public.import_local_data(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); item jsonb; habit_id uuid; day text; days smallint[];
  task_count integer := 0; habit_count integer := 0;
begin
  if uid is null then raise exception 'Sign in before importing'; end if;
  if jsonb_typeof(payload->'tasks') is distinct from 'array' or jsonb_typeof(payload->'habits') is distinct from 'array'
    or payload->'tasks' is null or payload->'habits' is null then raise exception 'Invalid import payload'; end if;
  for item in select value from jsonb_array_elements(payload->'tasks') loop
    if coalesce(item->>'id','') = '' then raise exception 'Missing local task ID'; end if;
    insert into public.local_import_records(user_id,kind,source_id) values(uid,'task',item->>'id') on conflict do nothing;
    if not found then continue; end if;
    insert into public.tasks(user_id, title, status, priority, due_at, completed_at, import_source_id)
    values (uid, item->>'title', case when (item->>'done')::boolean then 'completed' else 'open' end,
      item->>'priority', case when item->>'dueDate' is null then null else ((item->>'dueDate')::date + time '12:00') at time zone 'UTC' end,
      case when (item->>'done')::boolean then now() else null end, item->>'id')
    on conflict (user_id, import_source_id) do nothing;
    if found then task_count := task_count + 1; end if;
  end loop;
  for item in select value from jsonb_array_elements(payload->'habits') loop
    if coalesce(item->>'id','') = '' then raise exception 'Missing local habit ID'; end if;
    insert into public.local_import_records(user_id,kind,source_id) values(uid,'habit',item->>'id') on conflict do nothing;
    if not found then continue; end if;
    select array_agg(value::smallint) into days from jsonb_array_elements_text(
      (item->'schedules')->(jsonb_array_length(item->'schedules') - 1)->'weekdays');
    habit_id := null;
    insert into public.habits(user_id, name, schedule_days, created_on, schedule_history, import_source_id)
    values (uid, item->>'title', days, (item->>'createdOn')::date, item->'schedules', item->>'id')
    on conflict (user_id, import_source_id) do nothing returning id into habit_id;
    if habit_id is not null then
      habit_count := habit_count + 1;
      for day in select jsonb_array_elements_text(item->'completions') loop
        insert into public.habit_completions(habit_id,user_id,completed_on) values (habit_id,uid,day::date);
      end loop;
    end if;
  end loop;
  return jsonb_build_object('tasks',task_count,'habits',habit_count);
end;
$$;
revoke all on function public.import_local_data(jsonb) from public, anon;
grant execute on function public.import_local_data(jsonb) to authenticated;
commit;
