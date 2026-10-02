const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { transpileModule, ModuleKind } = require('typescript');
const vm = require('node:vm');
function load(name, imports = {}) {
  const code = transpileModule(readFileSync(resolve(__dirname, '../src/utils', `${name}.ts`), 'utf8'),
    { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name], Date, Set, Error });
  return exports;
}
const tasks = load('tasks');
const h = load('habits', { './tasks': tasks });
const json = value => JSON.parse(JSON.stringify(value));
const daily = { title: 'Daily habit', weekdays: [0, 1, 2, 3, 4, 5, 6] };
const create = (fields = daily, date = '2026-09-28') => h.newHabit('h', fields, date);

test('new habits are incomplete and only count on selected weekdays', () => {
  const habit = create({ title: ' Weekdays ', weekdays: [1, 3] });
  assert.equal(habit.title, 'Weekdays'); assert.equal(habit.completions.length, 0);
  assert.equal(h.scheduledOn(habit, '2026-09-28'), true);
  assert.equal(h.scheduledOn(habit, '2026-09-29'), false);
  assert.equal(h.scheduledOn(habit, '2026-09-27'), false);
  assert.deepEqual(json(h.habitProgress([habit], '2026-09-29')), { done: 0, total: 0, percentage: 0 });
});
test('today toggles are reversible, idempotent in storage, and skip rest days', () => {
  const habit = create({ title: 'Monday', weekdays: [1] });
  const done = h.toggleHabit(habit, '2026-09-28');
  assert.deepEqual(json(done.completions), ['2026-09-28']);
  assert.deepEqual(json(h.habitProgress([done], '2026-09-28')), { done: 1, total: 1, percentage: 100 });
  assert.equal(h.toggleHabit(done, '2026-09-29'), done);
  assert.equal(h.toggleHabit(done, '2026-09-28').completions.length, 0);
});
test('daily rollover keeps yesterday history and starts today incomplete', () => {
  const done = h.toggleHabit(create(), '2026-09-28');
  assert.equal(h.habitProgress([done], '2026-09-29').done, 0);
  assert.equal(h.dayStatus(done, '2026-09-28', '2026-09-29'), 'complete');
  assert.equal(h.dayStatus(done, '2026-09-29', '2026-09-29'), 'pending');
});
test('edit schedules from today while preserving previous history and completion records', () => {
  const original = h.toggleHabit(create(), '2026-09-28');
  const changed = h.updateHabit(original, { title: 'Tuesday only', weekdays: [2] }, '2026-09-30');
  assert.equal(h.scheduledOn(changed, '2026-09-28'), true);
  assert.equal(h.dayStatus(changed, '2026-09-28', '2026-09-30'), 'complete');
  assert.equal(h.scheduledOn(changed, '2026-09-30'), false);
  assert.equal(h.scheduledOn(changed, '2026-10-06'), true);
  assert.equal(h.scheduledOn(changed, '2026-10-05'), false);
  const revised = h.updateHabit(changed, daily, '2026-09-30');
  assert.equal(revised.schedules.length, 2);
  assert.equal(h.scheduledOn(revised, '2026-09-30'), true);
  assert.equal(revised.completions.length, 1);
});
test('removing today from schedule excludes its completion without erasing the record', () => {
  const done = h.toggleHabit(create(), '2026-09-30');
  const off = h.updateHabit(done, { title: 'Friday', weekdays: [5] }, '2026-09-30');
  assert.equal(h.habitProgress([off], '2026-09-30').total, 0);
  assert.equal(off.completions.includes('2026-09-30'), true);
});
test('consistency includes today, excludes rest days and dates before creation', () => {
  let habit = create({ title: 'MWF', weekdays: [1, 3, 5] });
  habit = h.toggleHabit(habit, '2026-09-28');
  assert.deepEqual(json(h.consistency(habit, '2026-09-30')), { done: 1, total: 2, percentage: 50 });
  habit = h.toggleHabit(habit, '2026-09-30');
  assert.deepEqual(json(h.consistency(habit, '2026-09-30')), { done: 2, total: 2, percentage: 100 });
  assert.deepEqual(json(h.consistency(create({ title: 'Fri', weekdays: [5] }, '2026-09-30'), '2026-09-30')),
    { done: 0, total: 0, percentage: null });
});
test('weekly history uses Monday to Sunday and distinct statuses', () => {
  const habit = h.toggleHabit(create(), '2026-09-28');
  assert.deepEqual(json(h.weekDates('2026-09-30')), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.equal(h.weekDates('2026-09-30', -1)[0], '2026-09-21');
  assert.equal(h.dayStatus(habit, '2026-09-27', '2026-09-30'), 'off');
  assert.equal(h.dayStatus(habit, '2026-09-28', '2026-09-30'), 'complete');
  assert.equal(h.dayStatus(habit, '2026-09-29', '2026-09-30'), 'missed');
  assert.equal(h.dayStatus(habit, '2026-09-30', '2026-09-30'), 'pending');
  assert.equal(h.dayStatus(habit, '2026-10-01', '2026-09-30'), 'future');
});
test('local calendar arithmetic crosses month, year and daylight saving boundaries', () => {
  assert.equal(h.shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(h.shiftDate('2028-02-28', 1), '2028-02-29');
  assert.equal(h.shiftDate('2026-03-29', 1), '2026-03-30');
  assert.equal(h.shiftDate('2026-10-25', -1), '2026-10-24');
});
test('storage restores schedules and all completions, including an empty saved list', () => {
  const habit = h.updateHabit(h.toggleHabit(create(), '2026-09-28'), { title: 'MWF', weekdays: [1, 3, 5] }, '2026-09-30');
  assert.deepEqual(json(h.parseHabits(h.serializeHabits([habit]))), json([habit]));
  assert.equal(h.parseHabits(null).length, 0);
  assert.equal(h.parseHabits(h.serializeHabits([])).length, 0);
});
test('reject corrupt saved data and invalid forms rather than wiping history', () => {
  for (const weekdays of [[], [1, 1], [7], ['1']]) assert.equal(h.validHabitFields({ title: 'Habit', weekdays }), false);
  assert.equal(h.validHabitFields({ title: ' ', weekdays: [1] }), false);
  const habit = create();
  for (const data of ['bad json', '{}', JSON.stringify({ version: 2, habits: [] }),
    h.serializeHabits([habit, habit]), h.serializeHabits([{ ...habit, completions: ['2026-02-30'] }]),
    h.serializeHabits([{ ...habit, schedules: [{ from: '2026-09-28', weekdays: [] }] }])]) {
    assert.throws(() => h.parseHabits(data));
  }
});
