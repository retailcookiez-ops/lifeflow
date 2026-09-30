const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const AH = '33333333-3333-4333-8333-333333333333';
const BH = '44444444-4444-4444-8444-444444444444';
const AT = '55555555-5555-4555-8555-555555555555';
const schedule = JSON.stringify([{ from: '2026-09-28', weekdays: [1, 3, 5] }]);

test('Supabase migration: real PostgreSQL RLS, CRUD, constraints and safe import', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;`);
    await db.exec(readFileSync('supabase/migrations/202609300001_lifeflow.sql', 'utf8'));
    await db.exec(`insert into auth.users values('${A}','{"display_name":"Alice","timezone":"Europe/London"}'),('${B}','{"timezone":"invalid"}');`);
    const as = async id => { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`); };
    const count = async table => Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n);
    await as(A);
    await t.test('profiles are created on signup, and own profile CRUD is protected', async () => {
      const row = (await db.query('select * from profiles')).rows[0];
      assert.equal(row.id, A); assert.equal(row.display_name, 'Alice'); assert.equal(row.timezone, 'Europe/London');
      await db.exec("update profiles set display_name='Updated' where id=auth.uid();");
      assert.equal((await db.query('select display_name from profiles')).rows[0].display_name, 'Updated');
      await assert.rejects(db.exec(`update profiles set id='${B}' where id=auth.uid()`), /row-level security/i);
      await db.exec('delete from profiles where id=auth.uid();'); assert.equal(await count('profiles'), 0);
      await db.exec(`insert into profiles(id,display_name) values('${A}','Restored');`);
      await assert.rejects(db.exec(`insert into profiles(id) values('${B}')`), /row-level security/i);
    });
    await t.test('own tasks and habits support create, edit and complete', async () => {
      await db.exec(`insert into tasks(id,user_id,title,priority) values('${AT}','${A}',' Task ','high');
        insert into habits(id,user_id,name,schedule_days,created_on,schedule_history)
        values('${AH}','${A}','Habit',array[1,3,5]::smallint[],'2026-09-28','${schedule}');
        update tasks set title='Renamed',status='completed' where id='${AT}';
        update habits set name='Renamed habit' where id='${AH}';
        insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${A}','2026-09-30');`);
      const task = (await db.query('select * from tasks')).rows[0];
      assert.equal(task.title, 'Renamed'); assert.equal(task.status, 'completed'); assert.ok(task.completed_at);
      assert.equal(await count('habit_completions'), 1);
      await assert.rejects(db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${A}','2026-09-30')`), /unique/i);
      await db.exec(`update tasks set status='open' where id='${AT}';`);
      assert.equal((await db.query('select completed_at from tasks')).rows[0].completed_at, null);
      await db.exec("update habit_completions set completed_on='2026-09-28'; delete from habit_completions;");
      assert.equal(await count('habit_completions'), 0);
    });
    await t.test('other account cannot read, create, edit, reassign or delete another account data', async () => {
      await as(B);
      assert.equal(await count('profiles'), 1);
      assert.equal((await db.query('select timezone from profiles')).rows[0].timezone, 'UTC');
      for (const table of ['tasks','habits','habit_completions','local_import_records']) assert.equal(await count(table), 0);
      await assert.rejects(db.exec(`insert into tasks(user_id,title) values('${A}','Attack')`), /row-level security/i);
      await assert.rejects(db.exec(`insert into habits(user_id,name,schedule_days,created_on,schedule_history) values('${A}','Attack',array[1,3,5]::smallint[],'2026-09-28','${schedule}')`), /row-level security/i);
      await db.exec(`update tasks set title='Attack' where id='${AT}'; delete from habits where id='${AH}';`);
      await db.exec(`insert into habits(id,user_id,name,schedule_days,created_on,schedule_history) values('${BH}','${B}','B habit',array[1,3,5]::smallint[],'2026-09-28','${schedule}');`);
      await assert.rejects(db.exec(`update habits set user_id='${A}' where id='${BH}'`), /row-level security/i);
      await assert.rejects(db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${B}','2026-09-30')`), /foreign key/i);
      await assert.rejects(db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${A}','2026-09-30')`), /row-level security/i);
      await db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${BH}','${B}','2026-09-30');`);
      await assert.rejects(db.exec(`update habit_completions set user_id='${A}'`), /row-level security/i);
      await as(A);
      assert.equal((await db.query('select title from tasks')).rows[0].title, 'Renamed');
      assert.equal(await count('habits'), 1);
      await assert.rejects(db.exec(`update tasks set user_id='${B}'`), /row-level security/i);
      await db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${A}','2026-09-30');`);
    });
    await t.test('input constraints reject blank titles, invalid priorities and malformed schedules', async () => {
      await assert.rejects(db.exec(`insert into habit_completions(habit_id,user_id,completed_on) values('${AH}','${A}','2026-09-27')`), /before habit creation/i);
      await assert.rejects(db.exec(`insert into tasks(user_id,title) values('${A}','  ')`), /check constraint/i);
      await assert.rejects(db.exec(`insert into tasks(user_id,title,priority) values('${A}','Title','urgent')`), /check constraint/i);
      for (const history of ['[]', '[{"from":"2026-09-28","weekdays":[]}]', '[{"from":"2026-09-29","weekdays":[1,3,5]}]']) {
        await assert.rejects(db.exec(`insert into habits(user_id,name,schedule_days,created_on,schedule_history) values('${A}','Bad',array[1,3,5]::smallint[],'2026-09-28','${history}')`), /check constraint/i);
      }
    });
    await t.test('explicit import retains schedule/history, retries skip, and deletions stay deleted', async () => {
      const payload = { tasks: [{ id:'old-task',title:'Local task',done:true,priority:'low',dueDate:'2026-10-01' }],
        habits: [{ id:'old-habit',title:'Local habit',createdOn:'2026-09-28',schedules:JSON.parse(schedule),completions:['2026-09-28','2026-09-30'] }] };
      const run = async data => (await db.query('select import_local_data($1::jsonb) as result', [JSON.stringify(data)])).rows[0].result;
      assert.deepEqual(await run(payload), { tasks:1,habits:1 });
      const imported = (await db.query("select * from habits where import_source_id='old-habit'")).rows[0];
      assert.deepEqual(imported.schedule_history, JSON.parse(schedule));
      assert.equal((await db.query('select count(*)::int as n from habit_completions where habit_id=$1',[imported.id])).rows[0].n, 2);
      assert.deepEqual(await run(payload), { tasks:0,habits:0 });
      await db.exec("update tasks set title='Cloud edit' where import_source_id='old-task';");
      assert.deepEqual(await run(payload), { tasks:0,habits:0 });
      assert.equal((await db.query("select title from tasks where import_source_id='old-task'")).rows[0].title, 'Cloud edit');
      await db.exec("delete from tasks where import_source_id='old-task'; delete from habits where import_source_id='old-habit';");
      assert.deepEqual(await run(payload), { tasks:0,habits:0 });
      assert.equal(await count('habits'), 1); assert.equal(await count('habit_completions'), 1);
      assert.equal(await count('local_import_records'), 2);
      await as(B); assert.equal(await count('local_import_records'), 0);
      await assert.rejects(db.exec(`insert into local_import_records(user_id,kind,source_id) values('${A}','task','attack')`), /row-level security/i);
      await as(A);
    });
    await t.test('invalid import rolls back tasks and import receipts together', async () => {
      const payload = { tasks:[{id:'rollback-task',title:'Rollback',done:false,priority:'medium',dueDate:null}],
        habits:[{id:'rollback-habit',title:'Bad',createdOn:'2026-09-28',schedules:[{from:'2026-09-28',weekdays:[]}],completions:[]}] };
      await assert.rejects(db.query('select import_local_data($1::jsonb)',[JSON.stringify(payload)]));
      assert.equal((await db.query("select count(*)::int as n from tasks where import_source_id='rollback-task'")).rows[0].n,0);
      assert.equal((await db.query("select count(*)::int as n from local_import_records where source_id like 'rollback-%'")).rows[0].n,0);
      await assert.rejects(db.query('select import_local_data($1::jsonb)', ['{}']), /invalid import/i);
    });
    await t.test('delete cascades completions and anonymous access is denied', async () => {
      await db.exec(`delete from habits where id='${AH}'; delete from tasks where id='${AT}';`);
      assert.equal(await count('habits'),0); assert.equal(await count('habit_completions'),0); assert.equal(await count('tasks'),0);
      await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon;");
      for (const table of ['profiles','tasks','habits','habit_completions','local_import_records']) await assert.rejects(db.query(`select * from ${table}`), /permission denied/i);
      await assert.rejects(db.query(`select import_local_data('{"tasks":[],"habits":[]}'::jsonb)`), /permission denied/i);
    });
  } finally { await db.close(); }
});
