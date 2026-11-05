(function exposeWorkloadWave(root, factory) {
  // Reuses the calendar's Eastern-time date keys so a task lands on the same
  // day in the wave as it does in the calendar and timeline.
  const calendar = root ? root.CalendarView : require('./calendar-view.js');
  const wave = factory(calendar);
  if (typeof module === 'object' && module.exports) module.exports = wave;
  if (root) root.WorkloadWave = wave;
}(typeof window === 'undefined' ? undefined : window, (CalendarView) => {
  // Pure workload maths for the Wave view: no DOM, so it is unit-tested in Node.
  //
  // Vocabulary:
  // - size: hours a task is expected to take. Either the course-guide review's
  //   estimate or a number the viewer typed (an override). Never defaulted.
  // - offset: whole days from today (0 = today, negative = overdue).
  // - pace: hours per day you would need to work if each task's hours were
  //   spread evenly over the days just before its deadline. Bars show *when*
  //   work is due; pace shows how hard the coming days are.

  const MAX_HOURS = 200;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function validHours(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_HOURS;
  }

  // Stored as a JSON object {taskId: hours}. Invalid entries are dropped
  // rather than trusted: a corrupt value must not draw a giant bar.
  function parseSizeOverrides(value) {
    try {
      const parsed = JSON.parse(value || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
      return new Map(Object.entries(parsed).filter(([, hours]) => validHours(hours)));
    } catch (_error) {
      return new Map();
    }
  }

  function serializeSizeOverrides(overrides) {
    return JSON.stringify(Object.fromEntries(overrides));
  }

  // Returns a new Map; `hours === null` removes the override.
  function withSizeOverride(overrides, taskId, hours) {
    const next = new Map(overrides);
    if (hours === null) next.delete(taskId);
    else if (validHours(hours)) next.set(taskId, hours);
    else throw new RangeError(`Hours must be above 0 and at most ${MAX_HOURS}.`);
    return next;
  }

  // The viewer's number wins over the estimate; the estimate is kept so the
  // UI can still show what the review thought and offer to restore it.
  function effectiveSize(task, overrides) {
    const estimate = task.effort && validHours(task.effort.hours) ? task.effort : null;
    if (overrides.has(task.id)) {
      return { hours: overrides.get(task.id), source: 'override', estimate };
    }
    if (estimate) return { hours: estimate.hours, source: 'estimate', estimate };
    return null;
  }

  function dayOffset(fromKey, toKey) {
    const [fy, fm, fd] = fromKey.split('-').map(Number);
    const [ty, tm, td] = toKey.split('-').map(Number);
    return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
  }

  function keyAtOffset(fromKey, offset) {
    const [year, month, day] = fromKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return date.toISOString().slice(0, 10);
  }

  // Preparation reminders sit the evening before their real deadline; the wave
  // plots work by when it is actually due.
  function deadlineOf(task) {
    return task.deadlineAt || task.dueAt;
  }

  function buildWave(groups, overrides, options) {
    const {
      todayKey,
      timeZone = 'America/New_York',
      horizonDays = 28,
      spreadDays = 5,
    } = options;
    const days = Array.from({ length: horizonDays }, (_value, offset) => ({
      dateKey: keyAtOffset(todayKey, offset),
      offset,
      segments: [],
      unsized: [],
      total: 0,
    }));
    const overdue = { segments: [], unsized: [], total: 0 };
    const beyond = { count: 0, hours: 0, unsized: 0 };
    const pace = days.map((day) => ({ dateKey: day.dateKey, hours: 0 }));

    const tasks = (groups || []).flatMap((group) => group.tasks || [])
      // Class meetings are attendance, not work to plan around.
      .filter((task) => task.kind !== 'meeting' && deadlineOf(task));

    tasks.forEach((task) => {
      const dateKey = CalendarView.easternDateKey(new Date(deadlineOf(task)), timeZone);
      const offset = dayOffset(todayKey, dateKey);
      const size = effectiveSize(task, overrides);
      const segment = size && { task, hours: size.hours, source: size.source };

      if (offset < 0) {
        if (segment) {
          overdue.segments.push(segment);
          overdue.total += segment.hours;
        } else overdue.unsized.push(task);
      } else if (offset >= horizonDays) {
        beyond.count += 1;
        if (segment) beyond.hours += segment.hours;
        else beyond.unsized += 1;
      } else if (segment) {
        days[offset].segments.push(segment);
        days[offset].total += segment.hours;
      } else days[offset].unsized.push(task);

      if (!segment) return;
      // Spread the hours over the `spreadDays` days ending on the deadline,
      // clipped to today: work due tomorrow can only be done today and
      // tomorrow, so it shows up as a steep, honest spike. Overdue work is
      // still owed, so all of it lands on today.
      const lastDay = Math.max(offset, 0);
      const firstDay = Math.max(0, offset - spreadDays + 1);
      const perDay = segment.hours / (lastDay - firstDay + 1);
      for (let index = firstDay; index <= Math.min(lastDay, horizonDays - 1); index += 1) {
        pace[index].hours += perDay;
      }
    });

    // Largest work first, so the biggest block sits at the bottom of a stack.
    const bySize = (left, right) => right.hours - left.hours;
    days.forEach((day) => day.segments.sort(bySize));
    overdue.segments.sort(bySize);

    const sizedInHorizon = days.reduce((sum, day) => sum + day.total, 0);
    return {
      days,
      overdue,
      beyond,
      pace,
      horizonDays,
      spreadDays,
      totalHours: sizedInHorizon + overdue.total,
      unsizedCount: days.reduce((sum, day) => sum + day.unsized.length, 0) + overdue.unsized.length,
      maxTotal: Math.max(overdue.total, ...days.map((day) => day.total), 0),
      maxPace: Math.max(...pace.map((day) => day.hours), 0),
    };
  }

  // Axis ceiling of 1, 2 or 5 × 10^n hours, so gridline labels stay readable.
  function niceCeiling(value) {
    if (!(value > 0)) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 5, 10].map((step) => step * magnitude).find((candidate) => candidate >= value);
  }

  function formatHours(hours) {
    const rounded = Math.round(hours * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} h`;
  }

  return {
    MAX_HOURS,
    buildWave,
    dayOffset,
    effectiveSize,
    formatHours,
    niceCeiling,
    parseSizeOverrides,
    serializeSizeOverrides,
    withSizeOverride,
  };
}));
