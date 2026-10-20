const test = require('node:test');
const assert = require('node:assert/strict');
const { gradedTasks, daysLeftLabel } = require('../graded-work.js');

test('shows only upcoming graded tasks from the full semester', () => {
  const data = { groups: [
    { tasks: [
      { title: 'Past', dueAt: '2026-09-17T23:59:00-04:00', isGraded: true },
      { title: 'Prep', dueAt: '2026-09-19T23:59:00-04:00', isGraded: false },
      { title: 'Homework', dueAt: '2026-10-19T23:59:00-04:00', isGraded: true, isLater: true },
    ] },
  ] };

  assert.deepEqual(gradedTasks(data, new Date('2026-09-18T12:00:00-04:00')).map((task) => task.title), ['Homework']);
});

test('counts calendar days in Eastern time across daylight saving', () => {
  assert.equal(daysLeftLabel('2026-11-02T23:59:00-05:00', new Date('2026-10-31T12:00:00-04:00')), '2 days left');
  assert.equal(daysLeftLabel('2026-09-18T23:59:00-04:00', new Date('2026-09-18T12:00:00-04:00')), 'Due today');
  assert.equal(daysLeftLabel('2026-09-19T23:59:00-04:00', new Date('2026-09-18T12:00:00-04:00')), 'Due tomorrow');
});

test('uses the actual deadline when preparation started earlier', () => {
  const data = { groups: [{ tasks: [{ title: 'Prepare', isGraded: true, dueAt: '2026-10-19T19:00:00-04:00', deadlineAt: '2026-10-21T10:00:00-04:00' }] }] };
  assert.equal(gradedTasks(data, new Date('2026-10-20T12:00:00Z')).length, 1);
  assert.equal(daysLeftLabel('2026-10-21T01:00:00Z', new Date('2026-10-20T12:00:00Z'), 'Asia/Singapore'), 'Due tomorrow');
});
