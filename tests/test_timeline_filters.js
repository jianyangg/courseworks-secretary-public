const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterTimelineData,
  parseStoredKeys,
  toggleKey,
} = require('../timeline-filters.js');

test('filters tasks and recalculates visible counts', () => {
  const data = {
    groups: [
      {
        date: '2026-09-21',
        tasks: [
          { colorKey: 'games', isPast: false, isLater: false },
          { colorKey: 'robotics', isPast: false, isLater: true },
        ],
      },
    ],
  };

  const filtered = filterTimelineData(data, new Set(['games']));

  assert.equal(filtered.groups.length, 1);
  assert.deepEqual(filtered.groups[0].tasks.map((task) => task.colorKey), ['robotics']);
  assert.equal(filtered.upcomingTaskCount, 0);
  assert.equal(filtered.laterTaskCount, 1);
  assert.equal(filtered.pastTaskCount, 0);
});

test('drops empty date groups when every course is hidden', () => {
  const data = {
    groups: [{ date: '2026-09-21', tasks: [{ colorKey: 'games' }] }],
  };

  assert.deepEqual(filterTimelineData(data, new Set(['games'])).groups, []);
});

test('parses only known hidden course keys', () => {
  const storageValue = JSON.stringify(['games', 'removed-course', 42]);

  assert.deepEqual(
    [...parseStoredKeys(storageValue, ['games', 'robotics'])],
    ['games'],
  );
  assert.deepEqual([...parseStoredKeys('not json', ['games'])], []);
});

test('toggles a hidden course without mutating the original set', () => {
  const original = new Set(['games']);
  const shown = toggleKey(original, 'games');
  const hidden = toggleKey(shown, 'robotics');

  assert.deepEqual([...original], ['games']);
  assert.deepEqual([...shown], []);
  assert.deepEqual([...hidden], ['robotics']);
});

test('done marks hide tasks everywhere and are returned for undo', () => {
  const data = {
    groups: [{ tasks: [
      { id: 'a', colorKey: 'games', isPast: false, isLater: false },
      { id: 'b', colorKey: 'games', isPast: false, isLater: false },
    ] }],
    undated: [{ id: 'c', colorKey: 'games' }, { id: 'd', colorKey: 'robotics' }],
    changes: [{ id: 'x', colorKey: 'games' }, { id: 'y', colorKey: 'robotics' }],
  };

  const filtered = filterTimelineData(data, new Set(['robotics']), new Set(['b', 'c', 'd']));

  assert.deepEqual(filtered.groups[0].tasks.map((task) => task.id), ['a']);
  assert.deepEqual(filtered.undated, []);
  // A done task in a hidden course stays hidden by the course filter, not listed for undo.
  assert.deepEqual(filtered.doneTasks.map((task) => task.id), ['b', 'c']);
  assert.deepEqual(filtered.changes.map((change) => change.id), ['x']);
  assert.equal(filtered.upcomingTaskCount, 1);
});

test('stored keys are kept unpruned when no known list is given', () => {
  assert.deepEqual([...parseStoredKeys('["a","gone"]', null)], ['a', 'gone']);
  assert.deepEqual([...parseStoredKeys('["a","gone"]', ['a'])], ['a']);
});
