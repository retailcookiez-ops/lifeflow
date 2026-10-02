const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { transpileModule, ModuleKind } = require('typescript');
const vm = require('node:vm');
const compile = path => transpileModule(readFileSync(resolve(__dirname, '..', path), 'utf8'),
  { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
function moduleExports(path, imports) {
  const exports = {};
  vm.runInNewContext(compile(path), { exports, require: name => imports[name], Date, Set, Error });
  return exports;
}
const tasks = moduleExports('src/utils/tasks.ts', {});
const habits = moduleExports('src/utils/habits.ts', { './tasks': tasks });
const today = tasks.localDate();
const savedHabit = habits.newHabit('saved', { title: 'Saved habit', weekdays: [0, 1, 2, 3, 4, 5, 6] }, today);

// Minimal hook runtime for exercising storage effects and actions without a native device.
function harness(storage) {
  const slots = [];
  let index = 0, dirty = false, effects = [], result;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => {
        const value = typeof next === 'function' ? next(slots[i]) : next;
        if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = index++;
      if (!slots[i] || !same(slots[i], deps)) { slots[i] = deps; effects.push(fn); }
    },
  };
  const module = moduleExports('src/hooks/use-habits.ts', {
    react, '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    '@/hooks/use-local-day': { useLocalDay: () => today }, '@/utils/tasks': tasks, '@/utils/habits': habits,
  });
  function render() {
    index = 0; dirty = false; effects = [];
    result = module.useHabits();
    for (const effect of effects) effect();
  }
  render();
  return {
    get current() { return result; },
    async flush() {
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setImmediate(resolve));
        if (dirty) render();
      }
    },
  };
}

test('wait for storage hydration, restore history, and persist reversible daily check-ins', async () => {
  let release;
  let stored = habits.serializeHabits([savedHabit]);
  const writes = [];
  const app = harness({ getItem: () => new Promise(resolve => { release = resolve; }),
    setItem: async (key, value) => { assert.equal(key, 'lifeflow.habits.v1'); stored = value; writes.push(value); } });
  app.current.addHabit({ title: 'Too early', weekdays: [1] });
  await app.flush();
  assert.equal(app.current.ready, false); assert.equal(writes.length, 0);
  release(stored); await app.flush();
  assert.equal(app.current.habits[0].title, 'Saved habit');
  assert.equal(app.current.progress.done, 0);
  app.current.toggleToday('saved'); await app.flush();
  assert.equal(app.current.progress.done, 1);
  assert.equal(habits.parseHabits(stored)[0].completions.includes(today), true);
  app.current.toggleToday('saved'); await app.flush();
  assert.equal(habits.parseHabits(stored)[0].completions.length, 0);
  const reopened = harness({ getItem: async () => stored, setItem: async () => {} });
  await reopened.flush(); assert.equal(reopened.current.habits.length, 1);
});
test('corrupt loading does not overwrite saved data and retry recovers', async () => {
  let raw = 'broken'; let writes = 0;
  const app = harness({ getItem: async () => raw, setItem: async () => { writes++; } });
  await app.flush();
  assert.equal(app.current.ready, false); assert.ok(app.current.error); assert.equal(writes, 0);
  raw = habits.serializeHabits([savedHabit]); app.current.retry(); await app.flush();
  assert.equal(app.current.ready, true); assert.equal(app.current.error, null);
});
test('save errors retain changes in memory and retry writes the latest state', async () => {
  let fail = false, stored;
  const app = harness({ getItem: async () => habits.serializeHabits([savedHabit]),
    setItem: async (_, value) => { if (fail) throw new Error('Storage unavailable'); stored = value; } });
  await app.flush(); fail = true;
  app.current.toggleToday('saved'); await app.flush();
  assert.equal(app.current.progress.done, 1); assert.ok(app.current.error);
  fail = false; app.current.retry(); await app.flush();
  assert.equal(app.current.error, null);
  assert.equal(habits.parseHabits(stored)[0].completions.includes(today), true);
});
test('edit and delete persist without recreating sample habits', async () => {
  let stored;
  const app = harness({ getItem: async () => habits.serializeHabits([savedHabit]), setItem: async (_, value) => { stored = value; } });
  await app.flush();
  app.current.editHabit('saved', { title: 'Renamed', weekdays: [1, 3] }); await app.flush();
  assert.equal(habits.parseHabits(stored)[0].title, 'Renamed');
  app.current.deleteHabit('saved'); await app.flush();
  assert.equal(habits.parseHabits(stored).length, 0);
  const reopened = harness({ getItem: async () => stored, setItem: async () => {} });
  await reopened.flush(); assert.equal(reopened.current.habits.length, 0);
});
