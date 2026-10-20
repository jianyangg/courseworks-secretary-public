const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterTimelineData,
  parseHiddenCourseKeys,
  toggleHiddenCourse,
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
    [...parseHiddenCourseKeys(storageValue, ['games', 'robotics'])],
    ['games'],
  );
  assert.deepEqual([...parseHiddenCourseKeys('not json', ['games'])], []);
});

test('toggles a hidden course without mutating the original set', () => {
  const original = new Set(['games']);
  const shown = toggleHiddenCourse(original, 'games');
  const hidden = toggleHiddenCourse(shown, 'robotics');

  assert.deepEqual([...original], ['games']);
  assert.deepEqual([...shown], []);
  assert.deepEqual([...hidden], ['robotics']);
});
