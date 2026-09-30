const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { transpileModule, ModuleKind } = require('typescript');
const vm = require('node:vm');
const source = readFileSync(resolve(__dirname, '../src/utils/dashboard.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { dashboardTasks } = exportsObject;
const make = (id, dueDate, done = false, priority = 'medium') => ({ id, title: id, dueDate, done, priority });
test('today progress includes due/overdue/undated tasks and excludes future tasks', () => {
  const tasks = [make('old', '2026-09-29', true), make('today', '2026-09-30'), make('undated', null), make('future', '2026-10-01')];
  const before = dashboardTasks(tasks, '2026-09-30');
  assert.equal(before.total, 3); assert.equal(before.done, 1); assert.equal(before.percentage, 33);
  const after = dashboardTasks(tasks.map(t => t.id === 'today' ? { ...t, done: true } : t), '2026-09-30');
  assert.equal(after.total, 3); assert.equal(after.done, 2); assert.equal(after.percentage, 67);
});
test('upcoming preview is capped, date/priority sorted, unfinished and non-mutating', () => {
  const tasks = [make('later', '2026-10-03'), make('low', '2026-10-01', false, 'low'), make('high', '2026-10-01', false, 'high'),
    make('finished', '2026-10-01', true), make('middle', '2026-10-02'), make('today', '2026-09-30')];
  const summary = dashboardTasks(tasks, '2026-09-30');
  assert.deepEqual(Array.from(summary.upcoming, t => t.id), ['high', 'low', 'middle']);
  assert.equal(tasks[0].id, 'later');
  assert.equal(dashboardTasks([], '2026-09-30').percentage, 0);
});
