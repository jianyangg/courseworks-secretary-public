(function exposeGradedWork(root, factory) {
  const helpers = factory();
  if (typeof module === 'object' && module.exports) module.exports = helpers;
  if (root) root.GradedWork = helpers;
}(typeof window === 'undefined' ? undefined : window, () => {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  });

  function easternDay(value) {
    const parts = Object.fromEntries(dateParts.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  }

  function daysLeftLabel(dueAt, now = new Date()) {
    const days = Math.round((easternDay(dueAt) - easternDay(now)) / 86400000);
    if (days < 0) return 'Past due';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  }

  function gradedTasks(data, now = new Date()) {
    return (data.groups || [])
      .flatMap((group) => group.tasks || [])
      .filter((task) => task.isGraded && new Date(task.dueAt) >= now)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }

  return { gradedTasks, daysLeftLabel };
}));
