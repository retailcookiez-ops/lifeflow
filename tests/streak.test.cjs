const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
function load(path,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>imports[n],Date,Set});return exports;}
const tasks=load('src/utils/tasks.ts');const habits=load('src/utils/habits.ts',{'./tasks':tasks});const {habitStreak}=load('src/utils/streak.ts',{'./habits':habits});
test('habit streak skips days off, respects historical schedules, and tolerates unfinished today',()=>{
 const h=habits.newHabit('1',{title:'Walk',weekdays:[1,3,5]},'2026-09-21');
 h.completions=['2026-09-21','2026-09-23','2026-09-25'];
 assert.equal(habitStreak(h,'2026-09-27'),3);assert.equal(habitStreak(h,'2026-09-28'),3);assert.equal(habitStreak(h,'2026-09-29'),0);
 h.completions.push('2026-09-28');assert.equal(habitStreak(h,'2026-09-28'),4);
 const changed=habits.updateHabit(h,{title:'Walk',weekdays:[2,4]},'2026-09-29');changed.completions.push('2026-09-29');assert.equal(habitStreak(changed,'2026-10-01'),5);
 assert.equal(habitStreak({...h,completions:[]},'2026-10-01'),0);
});
