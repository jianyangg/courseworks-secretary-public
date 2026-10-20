(function exposeGradedWork(root, factory) {
  const helpers = factory();
  if (typeof module === 'object' && module.exports) module.exports = helpers;
  if (root) root.GradedWork = helpers;
}(typeof window === 'undefined' ? undefined : window, () => {
  function easternDay(value, timeZone) {
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = Object.fromEntries(dateParts.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  }

  function daysLeftLabel(dueAt, now = new Date(), timeZone = 'America/New_York') {
    const days = Math.round((easternDay(dueAt, timeZone) - easternDay(now, timeZone)) / 86400000);
    if (days < 0) return 'Past due';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  }

  function gradedTasks(data, now = new Date()) {
    return (data.groups || [])
      .flatMap((group) => group.tasks || [])
      .filter((task) => task.isGraded && new Date(task.deadlineAt || task.dueAt) >= now)
      .sort((a, b) => new Date(a.deadlineAt || a.dueAt) - new Date(b.deadlineAt || b.dueAt));
  }

  return { gradedTasks, daysLeftLabel };
}));
