const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(path, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: name => imports[name], Intl, Date, Set, Error, Promise, Request, Response });
  return exports;
}
const profile = load('src/utils/profile.ts');
const fields = { displayName:'Alex', goals:['consistency'], modules:['tasks','habits'], timezone:'Europe/Zurich', wakeTime:'07:30', sleepTime:'23:00', weekStart:1 };
test('profile input accepts optional fields and validates timezone, times, goals and modules', () => {
  assert.equal(profile.validateProfile(fields), null);
  assert.equal(profile.validateProfile({ ...fields, displayName:'', wakeTime:'', sleepTime:'', goals:[], modules:[] }), null);
  for (const changes of [{ displayName:'x'.repeat(81) }, { timezone:'Mars/Olympus' }, { wakeTime:'24:00' }, { sleepTime:'9:30' }, { sleepTime:'12:60' }, { goals:['AI'] }, { modules:['workouts'] }, { weekStart:2 }]) {
    assert.ok(profile.validateProfile({ ...fields, ...changes }));
  }
});
test('week start changes grid boundaries without changing completion dates', () => {
  const tasks = load('src/utils/tasks.ts');
  const habits = load('src/utils/habits.ts', { './tasks':tasks });
  assert.equal(habits.weekDates('2026-09-30', 0, 1)[0], '2026-09-28');
  assert.equal(habits.weekDates('2026-09-30', 0, 0)[0], '2026-09-27');
  assert.equal(habits.weekDates('2026-09-27', 0, 0)[0], '2026-09-27');
  assert.equal(habits.weekDates('2026-09-27', -1, 1)[0], '2026-09-14');
});
test('profile migration preserves existing accounts, new signup defaults, constraints and owner-only access', async () => {
  const db = new PGlite();
  const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
    await db.exec(readFileSync('supabase/migrations/202609300001_lifeflow.sql','utf8'));
    await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${a}','{"display_name":"Existing"}');
      insert into tasks(user_id,title) values('${a}','Keep me');`);
    await db.exec(readFileSync('supabase/migrations/202609300002_profiles_onboarding.sql','utf8'));
    assert.ok((await db.query('select onboarding_completed_at from profiles')).rows[0].onboarding_completed_at);
    assert.equal((await db.query('select title from tasks')).rows[0].title,'Keep me');
    await db.exec(`insert into auth.users values('${b}','{"display_name":"New","timezone":"Europe/Zurich"}');`);
    const fresh=(await db.query('select * from profiles where id=$1',[b])).rows[0];
    assert.equal(fresh.onboarding_completed_at,null); assert.deepEqual(fresh.modules,['tasks','habits']); assert.equal(fresh.timezone,'Europe/Zurich');
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false); set role authenticated;`);
    assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n,1);
    await db.exec(`update profiles set display_name=' New name ',goals=array['fitness','studying'],modules=array['habits'],wake_time='07:30',sleep_time='23:45',week_start=0,onboarding_completed_at=now() where id=auth.uid();`);
    const saved=(await db.query('select * from profiles')).rows[0];
    assert.equal(saved.display_name,'New name'); assert.equal(saved.week_start,0); assert.ok(saved.onboarding_completed_at);
    for (const change of ["timezone='invalid'", "goals=array['unknown']", "modules=array['workouts']", 'week_start=2', "wake_time='25:00'", "goals=array[null]::text[]"]) await assert.rejects(db.exec(`update profiles set ${change}`));
    await db.exec(`update profiles set display_name='Attack' where id='${a}'; delete from profiles where id='${a}';`);
    await assert.rejects(db.exec(`update profiles set id='${a}'`), /row-level security/i);
    await db.exec(`reset role;`);
    assert.equal((await db.query('select display_name from profiles where id=$1',[a])).rows[0].display_name,'Existing');
    // Account deletion cascades through existing FKs, never through client table deletion.
    await db.exec(`delete from auth.users where id='${a}';`);
    assert.equal((await db.query('select count(*)::int as n from tasks')).rows[0].n,0);
    await db.exec('set role anon'); await assert.rejects(db.query('select * from profiles'), /permission denied/i);
  } finally { await db.close(); }
});
test('account deletion verifies JWT, confirmation and same-user password before using admin deletion', async () => {
  const { deletionHandler }=load('supabase/functions/delete-account/handler.ts');
  let deleted=[]; let verified=[];
  const handler=deletionHandler({
    getUser:async token=>token==='valid'?{id:'A',email:'a@example.com'}:null,
    verifyPassword:async(email,password)=>{ verified.push(email); return password==='correct'?{id:'A'}:password==='other'?{id:'B'}:null; },
    deleteUser:async id=>{deleted.push(id);return true;},
  });
  const request=(body,token='valid')=>new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
  for(const [body,token,status] of [[{confirmation:'DELETE',password:'correct'},'bad',401],[{confirmation:'no',password:'correct'},'valid',400],[{confirmation:'DELETE',password:'bad'},'valid',403],[{confirmation:'DELETE',password:'other'},'valid',403]]) {
    assert.equal((await handler(request(body,token))).status,status); assert.deepEqual(deleted,[]);
  }
  assert.equal((await handler(request({confirmation:'DELETE',password:'correct',user_id:'B',email:'b@example.com'}))).status,200);
  assert.deepEqual(deleted,['A']); assert.ok(verified.every(email=>email==='a@example.com'));
  assert.equal((await handler(new Request('https://example.com',{method:'POST',body:'{}'}))).status,401);
  const failed=deletionHandler({getUser:async()=>({id:'A',email:'a@example.com'}),verifyPassword:async()=>({id:'A'}),deleteUser:async()=>false});
  assert.equal((await failed(request({confirmation:'DELETE',password:'correct'}))).status,500);
});
