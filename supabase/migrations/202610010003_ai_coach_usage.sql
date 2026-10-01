-- Usage counters only. No prompts, responses, or task/habit mutations.
begin;
create table public.ai_coach_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null default 0 check (requests between 0 and 20),
  last_request_at timestamptz
);
create table public.ai_coach_project_usage (
  singleton boolean primary key default true check (singleton),
  usage_day date not null,
  requests integer not null default 0 check (requests between 0 and 200)
);
insert into public.ai_coach_project_usage(singleton,usage_day) values(true,(now() at time zone 'UTC')::date);
alter table public.ai_coach_usage enable row level security;
alter table public.ai_coach_project_usage enable row level security;
revoke all on public.ai_coach_usage, public.ai_coach_project_usage from public, anon, authenticated;
-- Clients can inspect their own counter, but cannot reset or increment it.
grant select on public.ai_coach_usage to authenticated;
create policy ai_coach_usage_select on public.ai_coach_usage for select to authenticated using ((select auth.uid())=user_id);
create function public.reserve_ai_coach_request(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  stamp timestamptz;
  today date;
  reset_at timestamptz;
  u public.ai_coach_usage%rowtype;
  project public.ai_coach_project_usage%rowtype;
  retry_after integer := 0;
begin
  -- One short transaction serializes both counters across all Edge instances.
  select * into project from public.ai_coach_project_usage where singleton=true for update;
  if not found then raise exception 'AI usage setup missing'; end if;
  stamp := clock_timestamp();
  today := (stamp at time zone 'UTC')::date;
  reset_at := ((today+1)::timestamp at time zone 'UTC');
  if project.usage_day <> today then
    update public.ai_coach_project_usage set usage_day=today,requests=0 where singleton=true;
    project.requests := 0;
  end if;
  insert into public.ai_coach_usage(user_id,usage_day) values(p_user_id,today) on conflict do nothing;
  select * into u from public.ai_coach_usage where user_id=p_user_id for update;
  if u.usage_day <> today then
    update public.ai_coach_usage set usage_day=today,requests=0 where user_id=p_user_id;
    u.requests := 0;
  end if;
  if u.requests >= 20 or project.requests >= 200 then
    retry_after := greatest(1,ceil(extract(epoch from reset_at-stamp))::integer);
  elsif u.last_request_at is not null and u.last_request_at > stamp-interval '10 seconds' then
    retry_after := greatest(1,ceil(extract(epoch from u.last_request_at+interval '10 seconds'-stamp))::integer);
  end if;
  if retry_after > 0 then
    return jsonb_build_object('allowed',false,'remaining',20-u.requests,'limit',20,'resetAt',reset_at,'retryAfterSeconds',retry_after);
  end if;
  update public.ai_coach_usage set requests=requests+1,last_request_at=stamp where user_id=p_user_id;
  update public.ai_coach_project_usage set requests=requests+1 where singleton=true;
  return jsonb_build_object('allowed',true,'remaining',19-u.requests,'limit',20,'resetAt',reset_at,'retryAfterSeconds',10);
end;
$$;
revoke all on function public.reserve_ai_coach_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_coach_request(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
