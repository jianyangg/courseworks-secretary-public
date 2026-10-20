const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTaskUrl,
  canAddTask,
} = require('../aiken-integration.js');

test('builds a private Aiken task-draft link from timeline metadata', () => {
  const url = new URL(buildTaskUrl({
    title: 'Submit research memo',
    course: 'MRKT 8656',
    dueAt: '2026-09-22T23:59:00-04:00',
    typeLabel: 'Assignment',
    sourceLabel: 'CourseWorks',
    url: 'https://courseworks2.columbia.edu/courses/1/assignments/2',
  }));

  assert.equal(url.origin + url.pathname, 'https://aikendewit.com/app/');
  assert.equal(url.search, '');
  assert.match(url.hash, /^#add-task\?/);

  const params = new URLSearchParams(url.hash.slice('#add-task?'.length));
  assert.equal(params.get('title'), 'Submit research memo');
  assert.equal(params.get('project'), 'MRKT 8656');
  assert.equal(params.get('dueDate'), '2026-09-22T23:59:00-04:00');
  assert.equal(
    params.get('notes'),
    'Assignment from CourseWorks\nhttps://courseworks2.columbia.edu/courses/1/assignments/2',
  );
});

test('offers the handoff for actionable work but not class meetings', () => {
  assert.equal(canAddTask({ kind: 'task', title: 'Read chapter 4' }), true);
  assert.equal(canAddTask({ kind: 'meeting', title: 'Lecture' }), false);
  assert.equal(canAddTask({ kind: 'task', title: '  ' }), false);
});

test('does not invent a deadline time for date-only course guide work', () => {
  const url = new URL(buildTaskUrl({
    title: 'Prepare discussion',
    dueAt: '2026-09-24T23:59:00-04:00',
    time: 'Date only',
  }));
  const params = new URLSearchParams(url.hash.slice('#add-task?'.length));
  assert.equal(params.get('dueDate'), '2026-09-24');
});

test('combines selected work into one chat message with source and precise dates', () => {
  const { buildChatMessage } = require('../aiken-integration.js');
  const message = buildChatMessage([
    { title: 'Memo', course: 'Marketing', dueAt: '2026-10-20T23:59:00-04:00', time: 'Date only', url: 'https://example.com/memo' },
    { title: 'Homework', course: 'Robotics', dueAt: '2026-10-21T17:00:00-04:00' },
  ]);
  assert.match(message, /Memo/);
  assert.match(message, /Homework/);
  assert.match(message, /Marketing/);
  assert.match(message, /Due: 2026-10-20\n/);
  assert.match(message, /https:\/\/example.com\/memo/);
  assert.throws(() => buildChatMessage([]));
  assert.throws(() => buildChatMessage([{ kind: 'meeting', title: 'Lecture' }]));
});

test('exports the actual preparation deadline rather than the suggested start', () => {
  const task = { title: 'Read chapter', dueAt: '2026-10-20T19:00:00-04:00', deadlineAt: '2026-10-21T10:00:00-04:00' };
  const due = value => new URLSearchParams(new URL(buildTaskUrl(value)).hash.split('?')[1]).get('dueDate');
  assert.equal(due(task), task.deadlineAt);
  assert.equal(due({ ...task, deadlineIsDateOnly: true }), '2026-10-21');
});
