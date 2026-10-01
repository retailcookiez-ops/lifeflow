const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports, require: name => load(path.resolve(path.dirname(file), name)), Intl, Date, Set, Error, Promise, Request, Response, TextDecoder, AbortController, setTimeout, clearTimeout, fetch});
  return exports;
}
const contract = load('supabase/functions/_shared/coach-contract.ts');
const model = load('supabase/functions/ai-coach/model.ts');
const {coachHandler} = load('supabase/functions/ai-coach/handler.ts');
const {localDay,minimizeContext} = load('supabase/functions/ai-coach/context.ts');
const answer = {summary:'Consider one focused block.',suggestions:[{title:'Start small',reason:'A small step is easier to start.',steps:['You could choose one task.']}]};
const usage = {allowed:true,remaining:19,limit:20,resetAt:'2099-01-01T00:00:00Z',retryAfterSeconds:10};
const body = {message:'Plan my day',includeContext:false,timezone:'UTC'};
function request(value=body, token='valid') {return new Request('https://example.com',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:typeof value==='string'?value:JSON.stringify(value)});}
function fixtures(overrides={}) {
  const calls=[];
  const deps={configured:()=>true, authenticate:async token=>token==='valid'?'A':null,
    reserve:async id=>{calls.push(['reserve',id]);return usage;},
    context:async(id,token,tz)=>{calls.push(['context',id,token,tz]);return {tasks:[],habits:[],truncated:false};},
    generate:async(message,context)=>{calls.push(['generate',message,context]);return answer;},...overrides};
  return {handler:coachHandler(deps),calls};
}
test('coach contract rejects unknown action fields, oversized input, invalid timezone and malformed output',()=>{
  assert.equal(contract.validRequest(body),true);
  for(const input of [{...body,user_id:'B'},{...body,message:' '},{...body,message:'x'.repeat(1201)},{...body,includeContext:'true'},{...body,timezone:'Invalid/Zone'}]) assert.equal(contract.validRequest(input),false);
  assert.equal(contract.validAnswer(answer),true);
  for(const value of [{...answer,actions:[{delete:'task'}]},{...answer,suggestions:[]},{...answer,summary:'x'.repeat(701)},{...answer,suggestions:[{...answer.suggestions[0],steps:['']}]}]) assert.equal(contract.validAnswer(value),false);
});
test('coach authenticates before quota/context/provider; bad input cannot consume usage',async()=>{
  const {handler,calls}=fixtures();
  for(const token of [null,'bad']) assert.equal((await handler(request(body,token))).status,401);
  for(const input of ['{bad','x'.repeat(9000),{...body,user_id:'B'}]) assert.equal((await handler(request(input))).status,400);
  assert.deepEqual(calls,[]);
  assert.equal((await handler(new Request('https://example.com',{method:'OPTIONS'}))).status,204);
  assert.equal((await handler(new Request('https://example.com'))).status,405);
});
test('coach context is opt-in and derives identity solely from verified JWT',async()=>{
  const {handler,calls}=fixtures();
  const response=await handler(request()); const value=await response.json();
  assert.equal(response.status,200); assert.equal(contract.validReply(value),true);
  assert.equal(value.contextIncluded,false); assert.equal(calls.filter(c=>c[0]==='context').length,0);
  assert.deepEqual(calls[0],['reserve','A']); assert.equal(calls.at(-1)[2],null);
  calls.length=0;
  assert.equal((await handler(request({...body,includeContext:true}))).status,200);
  assert.deepEqual(calls[1],['context','A','valid','UTC']);
});
test('coach fails closed for quota, setup, context and provider failures without leaking raw errors',async()=>{
  const secret='private-key-test-never-display';
  for(const [overrides,status,code] of [
    [{configured:()=>false},503,'setup'],
    [{reserve:async()=>{throw Error(secret);}},503,'usage_setup'],
    [{reserve:async()=>({...usage,allowed:false,retryAfterSeconds:60})},429,'rate_limit'],
    [{context:async()=>{throw Error(secret);}},503,'context'],
    [{generate:async()=>{throw Error(secret);}},502,'provider_unavailable'],
    [{generate:async()=>{throw new model.ModelError('timeout');}},504,'timeout'],
  ]) {
    const {handler,calls}=fixtures(overrides);
    const response=await handler(request({...body,includeContext:true})); const text=await response.text();
    assert.equal(response.status,status); assert.equal(JSON.parse(text).code,code); assert.ok(!text.includes(secret));
    if(code==='rate_limit') assert.equal(response.headers.get('retry-after'),'60');
    if(['setup','usage_setup','rate_limit','context'].includes(code)) assert.equal(calls.filter(c=>c[0]==='generate').length,0);
  }
});
test('context allowlist caps records and strips emails, descriptions, IDs and old completions',()=>{
  const tasks=Array.from({length:13},()=>({id:'PRIVATE',description:'PRIVATE',title:'x'.repeat(200),status:'open',priority:'high',due_at:null}));
  const habits=Array.from({length:13},()=>({id:'PRIVATE',name:'Walk',description:'PRIVATE',completions:['PRIVATE']}));
  const context=minimizeContext('2026-10-01','UTC',{display_name:'Alex',goals:['consistency'],wake_time:'07:00:00',sleep_time:null,email:'PRIVATE'},tasks,habits,['PRIVATE']);
  assert.equal(context.tasks.length,12); assert.equal(context.habits.length,12); assert.equal(context.truncated,true);
  assert.equal(context.tasks[0].title.length,160); assert.equal(context.habits[0].completedToday,true); assert.equal(context.wakeTime,'07:00');
  assert.ok(!JSON.stringify(context).includes('PRIVATE'));
  assert.equal(localDay('America/Los_Angeles',new Date('2026-10-01T01:00:00Z')),'2026-09-30');
});
function providerPayload(value) {return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]};}
test('model uses structured output, no tools or stored conversation, and validates every response',async()=>{
  let sent;
  const result=await model.generateAdvice('test-key','gpt-4.1-mini','Help',null,async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.openai.com/v1/responses');return Response.json(providerPayload(answer));});
  assert.equal(result.summary,answer.summary); assert.equal(sent.store,false); assert.equal(sent.tools,undefined); assert.equal(sent.previous_response_id,undefined); assert.equal(sent.text.format.strict,true);
  assert.deepEqual(JSON.parse(sent.input[0].content),{request:'Help',context:null});
  for(const payload of [providerPayload({...answer,summary:'I have created your tasks.'}),providerPayload({...answer,actions:['delete']}),{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}]) {
    await assert.rejects(model.generateAdvice('test-key','model','Help',null,async()=>Response.json(payload)),error=>['invalid_response','refused'].includes(error.code));
  }
  await assert.rejects(model.generateAdvice('test-key','model','Help',null,async()=>new Response('secret upstream detail',{status:500})),error=>error.code==='provider_unavailable'&&!error.message.includes('secret'));
});
test('durable quota enforces owner RLS, service-only mutation, cooldown, per-user/project limits and UTC reset',async()=>{
  const db=new PGlite(); const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema auth, public to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated;
      insert into auth.users values('${a}'),('${b}');`);
    await db.exec(readFileSync('supabase/migrations/202610010003_ai_coach_usage.sql','utf8'));
    const reserve=async id=>(await db.query('select public.reserve_ai_coach_request($1) as result',[id])).rows[0].result;
    await db.exec('set role service_role');
    assert.equal((await reserve(a)).remaining,19);
    assert.equal((await reserve(a)).allowed,false);
    assert.equal((await reserve(b)).allowed,true);
    await db.exec(`reset role;select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;`);
    assert.equal((await db.query('select * from ai_coach_usage')).rows.length,1);
    assert.equal((await db.query('select user_id from ai_coach_usage')).rows[0].user_id,a);
    for(const sql of ['update ai_coach_usage set requests=0','delete from ai_coach_usage',"insert into ai_coach_usage(user_id,usage_day) values('"+b+"',current_date)",'select * from ai_coach_project_usage',`select reserve_ai_coach_request('${a}')`]) await assert.rejects(db.exec(sql),/permission denied/);
    await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from ai_coach_usage'),/permission denied/);
    await assert.rejects(reserve(a),/permission denied/);
    await db.exec('reset role');
    for(let i=1;i<20;i++) {await db.exec(`update ai_coach_usage set last_request_at=now()-interval '11 seconds' where user_id='${a}';set role service_role;`);assert.equal((await reserve(a)).allowed,true);await db.exec('reset role');}
    await db.exec('set role service_role');const exhausted=await reserve(a);assert.equal(exhausted.allowed,false);assert.equal(exhausted.remaining,0);assert.ok(exhausted.retryAfterSeconds>10);
    await db.exec(`reset role;update ai_coach_project_usage set requests=200;update ai_coach_usage set last_request_at=now()-interval '11 seconds';set role service_role;`);
    assert.equal((await reserve(b)).allowed,false);
    await db.exec(`reset role;update ai_coach_project_usage set usage_day=current_date-1;update ai_coach_usage set usage_day=current_date-1,last_request_at=now()-interval '1 day';set role service_role;`);
    assert.equal((await reserve(a)).remaining,19);
    await db.exec(`reset role;update ai_coach_usage set last_request_at=now()-interval '11 seconds' where user_id='${b}';set role service_role;`);
    const concurrent=await Promise.all([reserve(b),reserve(b),reserve(b)]);assert.equal(concurrent.filter(v=>v.allowed).length,1);
    await db.exec(`reset role;delete from auth.users where id='${a}'`);assert.equal((await db.query('select * from ai_coach_usage where user_id=$1',[a])).rows.length,0);
  }finally{await db.close();}
});
