const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path,imports={}) {
  const exports={};
  const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>imports[name],Date,Set,Error,Promise});return exports;
}
const tasks=load('src/utils/tasks.ts');
const habits=load('src/utils/habits.ts',{'./tasks':tasks});
const {validateAuth}=load('src/utils/auth.ts');
test('email and password validation rejects invalid signup without imposing signup minimum on existing login',()=>{
  for(const email of ['','bad','no@domain','a b@example.com'])assert.ok(validateAuth(email,'password1',true));
  assert.ok(validateAuth('a@example.com','short',true));
  assert.equal(validateAuth(' a@example.com ','password1',true),null);
  assert.equal(validateAuth('a@example.com','short',false),null);
  assert.ok(validateAuth('a@example.com','',false));
});
test('legacy import reads both formats, defaults old tasks, preserves history, and never writes local storage',async()=>{
  const habit=habits.newHabit('old',{title:'Habit',weekdays:[1,3]},'2026-09-28');habit.completions=['2026-09-28'];
  const values={'lifeflow.tasks.v1':JSON.stringify([{id:'old-task',title:'Task',done:true}]),'lifeflow.habits.v1':habits.serializeHabits([habit])};
  let calls=0;
  const imported=load('src/services/local-import.ts',{'@/utils/tasks':tasks,'@/utils/habits':habits,
    '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async key=>values[key],setItem:()=>{throw new Error('Must not write');},removeItem:()=>{throw new Error('Must not delete');}}},
    '@/lib/supabase':{getSupabase:()=>({rpc:async(name,{payload})=>{calls++;assert.equal(name,'import_local_data');assert.equal(payload.tasks[0].priority,'medium');assert.equal(payload.habits[0].completions[0],'2026-09-28');return {data:{tasks:1,habits:1},error:null};}})}});
  const original=JSON.stringify(values);await imported.readLocalData();assert.equal(calls,0);
  assert.deepEqual(JSON.parse(JSON.stringify(await imported.importLocalData())),{tasks:1,habits:1});assert.equal(JSON.stringify(values),original);
  values['lifeflow.habits.v1']='bad';await assert.rejects(imported.importLocalData(),/left untouched/i);assert.equal(calls,1);assert.equal(values['lifeflow.habits.v1'],'bad');
});
test('auth storage is safe during web static rendering and persists on browser/native',async()=>{
  const compiled=ts.transpileModule(readFileSync('src/lib/auth-storage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for(const [platform,browser,expectedCalls] of [['web',false,0],['web',true,3],['ios',false,3],['android',false,3]]) {
    let calls=0;
    const storage={getItem:async()=>{calls++;return 'session';},setItem:async()=>{calls++;},removeItem:async()=>{calls++;}};
    const exports={};const context={exports,Promise,require:name=>name==='react-native'?{Platform:{OS:platform}}:{__esModule:true,default:storage}};
    if(browser)context.window={};
    vm.runInNewContext(compiled,context);
    assert.equal(await exports.authStorage.getItem('key'),expectedCalls?'session':null);
    await exports.authStorage.setItem('key','value');await exports.authStorage.removeItem('key');assert.equal(calls,expectedCalls);
  }
});

test('cloud pagination restores histories beyond the server response cap and rejects partial failures',async()=>{
  const {readAllRows}=load('src/services/pagination.ts');
  const rows=Array.from({length:1205},(_,i)=>({id:i}));let requests=0;
  const result=await readAllRows(async(from,to)=>{requests++;return {data:rows.slice(from,to+1),error:null};});
  assert.equal(result.length,1205);assert.equal(result[1204].id,1204);assert.equal(requests,3);
  await assert.rejects(readAllRows(async from=>from===0?{data:rows.slice(0,500),error:null}:{data:null,error:new Error('page failed')}),/page failed/);
});
