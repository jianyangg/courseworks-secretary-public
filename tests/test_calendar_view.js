const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMonthDays,
  chooseInitialDate,
  groupTasksByDate,
  shiftMonth,
} = require('../calendar-view.js');

test('builds complete calendar weeks around the requested month', () => {
  const days = buildMonthDays(2026, 8, '2026-09-21');

  assert.equal(days.length, 35);
  assert.equal(days[0].dateKey, '2026-08-30');
  assert.equal(days.at(-1).dateKey, '2026-10-03');
  assert.equal(days.find((day) => day.isToday).dateKey, '2026-09-21');
  assert.equal(days.find((day) => day.dateKey === '2026-09-01').inMonth, true);
  assert.equal(days[0].inMonth, false);
});

test('indexes every visible task by its timeline date', () => {
  const tasksByDate = groupTasksByDate([
    { date: '2026-09-21', tasks: [{ title: 'One' }, { title: 'Two' }] },
    { date: '2026-09-22', tasks: [{ title: 'Three' }] },
  ]);

  assert.deepEqual(tasksByDate.get('2026-09-21').map((task) => task.title), ['One', 'Two']);
  assert.deepEqual(tasksByDate.get('2026-09-22').map((task) => task.title), ['Three']);
});

test('selects today when present, otherwise the first scheduled day in the month', () => {
  const tasksByDate = new Map([
    ['2026-09-04', [{ title: 'Earlier' }]],
    ['2026-09-21', [{ title: 'Today' }]],
  ]);

  assert.equal(chooseInitialDate(tasksByDate, 2026, 8, '2026-09-21'), '2026-09-21');
  assert.equal(chooseInitialDate(tasksByDate, 2026, 8, '2026-09-10'), '2026-09-04');
  assert.equal(chooseInitialDate(new Map(), 2026, 8, '2026-09-10'), '2026-09-10');
});

test('shifts across year boundaries', () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});
