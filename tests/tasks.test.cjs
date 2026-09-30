const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { transpileModule, ModuleKind } = require('typescript');
const vm = require('node:vm');
const source = readFileSync(resolve(__dirname, '../src/utils/tasks.ts'), 'utf8');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, Date, Set, Error });
const { isValidDate, localDate, parseTasks, selectTasks, validFields } = exportsObject;
const make = (id, dueDate, priority = 'medium', done = false) => ({ id, title: id, dueDate, priority, done });
const ids = tasks => Array.from(tasks, t => t.id);

test('calendar validation rejects impossible dates and accepts leap days', () => {
  assert.equal(isValidDate('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-1-01', 'garbage']) {
    assert.equal(isValidDate(value), false, value);
  }
  assert.equal(localDate(new Date(2026, 8, 30, 23, 59)), '2026-09-30');
});
test('existing saved tasks migrate without losing completion or identity', () => {
  const tasks = parseTasks(JSON.stringify([{ id: 'old', title: ' Keep me ', done: true }]));
  assert.equal(tasks[0].id, 'old'); assert.equal(tasks[0].title, 'Keep me');
  assert.equal(tasks[0].done, true); assert.equal(tasks[0].priority, 'medium'); assert.equal(tasks[0].dueDate, null);
  const saved = JSON.stringify([make('new', '2026-10-01', 'high', true)]);
  assert.deepEqual(JSON.parse(JSON.stringify(parseTasks(saved))), JSON.parse(saved));
  assert.equal(parseTasks(null).length, 0);
  assert.equal(parseTasks('[]').length, 0);
});
test('corrupt saved data is rejected rather than silently replaced', () => {
  for (const raw of ['bad json', '{}', '[null]', JSON.stringify([make('a', '2026-02-30')]),
    JSON.stringify([make('a', null, 'urgent')]), JSON.stringify([make('a', null), make('a', null)])]) {
    assert.throws(() => parseTasks(raw));
  }
});
test('filters cover undated, overdue, today, future and completed tasks', () => {
  const tasks = [make('overdue', '2026-09-29'), make('today', '2026-09-30'), make('future', '2026-10-01'),
    make('undated', null), make('finished', '2026-09-30', 'high', true)];
  assert.deepEqual(ids(selectTasks(tasks, 'Today', 'dueDate', '2026-09-30')), ['overdue', 'today', 'undated']);
  assert.deepEqual(ids(selectTasks(tasks, 'Upcoming', 'dueDate', '2026-09-30')), ['future']);
  assert.deepEqual(ids(selectTasks(tasks, 'Completed', 'dueDate', '2026-09-30')), ['finished']);
  assert.equal(selectTasks(tasks, 'All', 'dueDate', '2026-09-30').length, 5);
  assert.deepEqual(ids(selectTasks(tasks, 'Upcoming', 'dueDate', '2026-10-01')), []);
});
test('sorting uses both fields, puts undated tasks last in date order and does not mutate storage', () => {
  const tasks = [make('undated-high', null, 'high'), make('later-high', '2026-10-02', 'high'),
    make('early-low', '2026-10-01', 'low'), make('early-high', '2026-10-01', 'high')];
  assert.deepEqual(ids(selectTasks(tasks, 'All', 'dueDate', '2026-09-30')), ['early-high', 'early-low', 'later-high', 'undated-high']);
  assert.deepEqual(ids(selectTasks(tasks, 'All', 'priority', '2026-09-30')), ['early-high', 'later-high', 'undated-high', 'early-low']);
  assert.deepEqual(ids(tasks), ['undated-high', 'later-high', 'early-low', 'early-high']);
});
test('form fields reject blank titles and invalid dates', () => {
  assert.equal(validFields({ title: '  ', dueDate: null, priority: 'medium' }), false);
  assert.equal(validFields({ title: 'Task', dueDate: '2026-02-30', priority: 'medium' }), false);
  assert.equal(validFields({ title: 'Task', dueDate: null, priority: 'low' }), true);
});
