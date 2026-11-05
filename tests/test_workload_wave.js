const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildWave,
  effectiveSize,
  formatHours,
  niceCeiling,
  parseRange,
  parseSizeOverrides,
  tickStep,
  serializeSizeOverrides,
  withSizeOverride,
} = require('../workload-wave.js');

const options = { todayKey: '2026-11-05', timeZone: 'America/New_York', horizonDays: 28, spreadDays: 5 };

function task(id, dueAt, hours, extra = {}) {
  return { id, title: id, course: 'EX', dueAt, effort: hours ? { hours, basis: 'test' } : null, ...extra };
}

test('the viewer override wins and keeps the estimate for reference', () => {
  const estimated = task('a', '2026-11-06T17:00:00Z', 4);
  assert.deepEqual(effectiveSize(estimated, new Map()), { hours: 4, source: 'estimate', estimate: estimated.effort });
  const size = effectiveSize(estimated, new Map([['a', 7]]));
  assert.equal(size.hours, 7);
  assert.equal(size.source, 'override');
  assert.equal(size.estimate.hours, 4);
  assert.equal(effectiveSize(task('b', '2026-11-06T17:00:00Z', null), new Map()), null);
});

test('unestimated work is reported as unsized, never given a default height', () => {
  const wave = buildWave([{ tasks: [task('a', '2026-11-07T17:00:00Z', null)] }], new Map(), options);
  assert.equal(wave.days[2].total, 0);
  assert.deepEqual(wave.days[2].unsized.map((item) => item.id), ['a']);
  assert.equal(wave.unsizedCount, 1);
  assert.equal(wave.totalHours, 0);
});

test('places work on its Eastern due date and stacks the largest first', () => {
  const wave = buildWave([{ tasks: [
    task('small', '2026-11-08T15:00:00Z', 1),
    task('big', '2026-11-08T20:00:00Z', 6),
    // 11:30 PM Eastern on Nov 8 is already Nov 9 in UTC; it still belongs to Nov 8.
    task('late-night', '2026-11-09T04:30:00Z', 2),
  ] }], new Map(), options);
  assert.equal(wave.days[3].dateKey, '2026-11-08');
  assert.deepEqual(wave.days[3].segments.map((segment) => segment.task.id), ['big', 'late-night', 'small']);
  assert.equal(wave.days[3].total, 9);
  assert.equal(wave.maxTotal, 9);
});

test('separates overdue and beyond-horizon work and skips class meetings', () => {
  const wave = buildWave([{ tasks: [
    task('late', '2026-11-03T17:00:00Z', 3),
    task('far', '2026-12-20T17:00:00Z', 10),
    task('class', '2026-11-06T17:00:00Z', 2, { kind: 'meeting' }),
  ] }], new Map(), options);
  assert.equal(wave.overdue.total, 3);
  assert.deepEqual(wave.beyond, { count: 1, hours: 10, unsized: 0 });
  assert.equal(wave.days.reduce((sum, day) => sum + day.segments.length, 0), 0);
});

test('plots preparation by its real deadline rather than the reminder', () => {
  const prep = task('prep', '2026-11-09T00:00:00Z', 2, { deadlineAt: '2026-11-10T15:00:00Z', isPreparation: true });
  const wave = buildWave([{ tasks: [prep] }], new Map(), options);
  assert.equal(wave.days[5].segments[0].task.id, 'prep');
});

test('pace spreads hours over the days before the deadline, clipped to today', () => {
  const wave = buildWave([{ tasks: [
    task('next-week', '2026-11-14T17:00:00Z', 10), // offset 9: spread over offsets 5..9
    task('tomorrow', '2026-11-06T17:00:00Z', 4), // offset 1: only today and tomorrow remain
    task('late', '2026-11-01T17:00:00Z', 3), // overdue: all owed today
  ] }], new Map(), options);
  const pace = wave.pace.map((day) => day.hours);
  assert.equal(pace[0], 2 + 3);
  assert.equal(pace[1], 2);
  assert.deepEqual(pace.slice(5, 10), [2, 2, 2, 2, 2]);
  assert.equal(pace[4], 0);
  const paceTotal = pace.reduce((sum, hours) => sum + hours, 0);
  assert.equal(paceTotal, 17, 'pace conserves every hour of work in range');
});

test('stored overrides ignore invalid values instead of trusting them', () => {
  const parsed = parseSizeOverrides('{"a": 3, "b": -1, "c": "4", "d": 999, "e": 0.5}');
  assert.deepEqual([...parsed], [['a', 3], ['e', 0.5]]);
  assert.equal(parseSizeOverrides('not json').size, 0);
  assert.equal(parseSizeOverrides('[1,2]').size, 0);
  assert.equal(serializeSizeOverrides(parsed), '{"a":3,"e":0.5}');
});

test('setting and clearing an override returns a new map and validates hours', () => {
  const original = new Map([['a', 3]]);
  const updated = withSizeOverride(original, 'b', 2);
  assert.deepEqual([...updated], [['a', 3], ['b', 2]]);
  assert.equal(original.has('b'), false);
  assert.deepEqual([...withSizeOverride(updated, 'a', null)], [['b', 2]]);
  assert.throws(() => withSizeOverride(original, 'a', 0), RangeError);
  assert.throws(() => withSizeOverride(original, 'a', Number.NaN), RangeError);
});

test('axis ceilings and labels stay readable', () => {
  assert.equal(niceCeiling(0), 1);
  assert.equal(niceCeiling(7), 10);
  assert.equal(niceCeiling(12), 20);
  assert.equal(niceCeiling(20), 20);
  assert.equal(formatHours(2), '2 h');
  assert.equal(formatHours(2.25), '2.3 h');
});

test('hiding late work drops it from the chart and from today\'s pace', () => {
  const tasks = [{ tasks: [task('late', '2026-11-01T17:00:00Z', 3), task('old', '2026-10-20T17:00:00Z', null)] }];
  const hidden = buildWave(tasks, new Map(), { ...options, includeOverdue: false });
  assert.equal(hidden.hiddenOverdueCount, 2);
  assert.equal(hidden.overdue.total, 0);
  assert.equal(hidden.unsizedCount, 0);
  assert.equal(hidden.pace[0].hours, 0);
  const shown = buildWave(tasks, new Map(), options);
  assert.equal(shown.hiddenOverdueCount, 0);
  assert.equal(shown.pace[0].hours, 3);
});

test('range follows the chosen window and rejects unknown values', () => {
  const wave = buildWave([{ tasks: [task('day10', '2026-11-15T17:00:00Z', 2)] }], new Map(), { ...options, horizonDays: 7 });
  assert.equal(wave.days.length, 7);
  assert.equal(wave.beyond.count, 1);
  assert.equal(parseRange('7'), 7);
  assert.equal(parseRange('56'), 56);
  assert.equal(parseRange('30'), 14);
  assert.equal(parseRange(null), 14);
  assert.deepEqual([7, 14, 28, 56].map(tickStep), [1, 2, 7, 7]);
});
