const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function harness(fetchRows) {
  const slots=[]; let index=0,dirty=false,effects=[],cleanup=[],result,refresh;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useState(initial) { const i=index++; if(!(i in slots)) slots[i]=initial; return [slots[i],next=>{const val=typeof next==='function'?next(slots[i]):next; if(!Object.is(val,slots[i])){slots[i]=val;dirty=true;}}]; },
    useRef(initial) { const i=index++; if(!(i in slots)) slots[i]={current:initial}; return slots[i]; },
    useCallback(fn,deps) { const i=index++; if(!slots[i]||!same(slots[i].deps,deps)) slots[i]={fn,deps}; return slots[i].fn; },
    useEffect(fn,deps) { const i=index++; if(!slots[i]||!same(slots[i],deps)){slots[i]=deps;effects.push(fn);} },
  };
  const exports={};
  const source=ts.transpileModule(readFileSync('src/hooks/use-cloud-collection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,Error,Promise,setInterval:fn=>{refresh=fn;return 1;},clearInterval:()=>{},require:name=>({react,
    'react-native':{AppState:{addEventListener:()=>({remove(){}})}},'@/lib/errors':{friendlyError:cause=>cause.message}})[name]});
  function render(){index=0;dirty=false;effects=[];result=exports.useCloudCollection(fetchRows); for(const effect of effects){const fn=effect();if(fn)cleanup.push(fn);} }
  render();
  return {get current(){return result;},refresh:()=>refresh(),unmount:()=>cleanup.forEach(fn=>fn()), async flush(){for(let i=0;i<5;i++){await new Promise(r=>setImmediate(r));if(dirty)render();}}};
}
test('cloud state waits for load, blocks early writes, and does not invent completion on failed save',async()=>{
  const load=deferred();let writes=0;
  const app=harness(()=>load.promise);
  assert.equal(await app.current.mutate(async()=>{writes++;}),false);
  load.resolve([{id:'a',done:false}]);await app.flush();
  assert.equal(app.current.ready,true);
  assert.equal(await app.current.mutate(async()=>{throw new Error('offline');}),false);await app.flush();
  assert.equal(app.current.rows[0].done,false);assert.equal(app.current.error,'offline');assert.equal(writes,0);
  app.unmount();
});
test('cloud state serializes double taps and reloads only after successful write',async()=>{
  let stored=[{id:'a',done:false}],writes=0; const save=deferred();
  const app=harness(async()=>stored);await app.flush();
  const pending=app.current.mutate(async()=>{writes++;await save.promise;stored=[{id:'a',done:true}];});
  assert.equal(await app.current.mutate(async()=>{writes++;}),false);await app.flush();
  assert.equal(app.current.saving,true);assert.equal(app.current.rows[0].done,false);
  save.resolve();assert.equal(await pending,true);await app.flush();
  assert.equal(writes,1);assert.equal(app.current.rows[0].done,true);assert.equal(app.current.saving,false);app.unmount();
});
test('late refresh cannot overwrite a newer response, and unmounted account ignores late data',async()=>{
  const a=deferred(),b=deferred();let request=0;
  const app=harness(()=>++request===1?a.promise:b.promise);
  const reload=app.current.reload();b.resolve([{id:'new'}]);await reload;await app.flush();
  a.resolve([{id:'old'}]);await app.flush();assert.equal(app.current.rows[0].id,'new');
  app.unmount();assert.equal(await app.current.mutate(async()=>{}),false);
  const late=deferred(),out=harness(()=>late.promise);out.unmount();late.resolve([{id:'private'}]);await out.flush();assert.equal(out.current.rows.length,0);
});
test('refresh recovers load errors and keeps last cloud data visible if later network refresh fails',async()=>{
  let fail=true;
  const app=harness(async()=>{if(fail)throw new Error('Network request failed');return [{id:'saved'}];});await app.flush();
  assert.equal(app.current.ready,false);assert.ok(app.current.error);
  fail=false;app.refresh();await app.flush();assert.equal(app.current.ready,true);assert.equal(app.current.error,null);
  fail=true;app.refresh();await app.flush();assert.equal(app.current.rows[0].id,'saved');assert.ok(app.current.error);app.unmount();
});
