(function exposeCalendarView(root, factory) {
  const calendar = factory();
  if (typeof module === 'object' && module.exports) module.exports = calendar;
  if (root) root.CalendarView = calendar;
}(typeof window === 'undefined' ? undefined : window, () => {
  function dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function buildMonthDays(year, month, todayKey) {
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cellCount = Math.ceil((firstWeekday + lastDay) / 7) * 7;
    const start = new Date(Date.UTC(year, month, 1 - firstWeekday));

    return Array.from({ length: cellCount }, (_value, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return {
        dateKey: key,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month,
        isToday: key === todayKey,
      };
    });
  }

  function groupTasksByDate(groups) {
    return new Map((groups || []).map((group) => [group.date, group.tasks || []]));
  }

  function chooseInitialDate(tasksByDate, year, month, todayKey) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    if (todayKey.startsWith(prefix) && tasksByDate.has(todayKey)) return todayKey;
    const firstScheduled = [...tasksByDate.keys()].sort().find((key) => key.startsWith(prefix));
    if (firstScheduled) return firstScheduled;
    return todayKey.startsWith(prefix) ? todayKey : `${prefix}01`;
  }

  function shiftMonth(year, month, offset) {
    const shifted = new Date(Date.UTC(year, month + offset, 1));
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
  }

  function easternDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  return {
    buildMonthDays,
    chooseInitialDate,
    easternDateKey,
    groupTasksByDate,
    shiftMonth,
  };
}));
