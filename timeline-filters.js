(function exposeTimelineFilters(root, factory) {
  const filters = factory();
  if (typeof module === 'object' && module.exports) module.exports = filters;
  if (root) root.TimelineFilters = filters;
}(typeof window === 'undefined' ? undefined : window, () => {
  // Applies both viewer preferences: hidden courses and work marked done.
  // Marked-done tasks are removed everywhere but returned in `doneTasks` so the
  // Graded work view can list them and let the viewer undo the mark.
  function filterTimelineData(data, hiddenCourseKeys, doneTaskIds = new Set()) {
    const courseVisible = (record) => !hiddenCourseKeys.has(record.colorKey);
    const doneTasks = [];
    const keep = (task) => {
      if (!courseVisible(task)) return false;
      if (doneTaskIds.has(task.id)) {
        doneTasks.push(task);
        return false;
      }
      return true;
    };
    const groups = (data.groups || []).flatMap((group) => {
      const tasks = (group.tasks || []).filter(keep);
      return tasks.length ? [{ ...group, tasks }] : [];
    });
    const undated = (data.undated || []).filter(keep);
    const tasks = groups.flatMap((group) => group.tasks);
    return {
      ...data,
      groups,
      undated,
      doneTasks,
      changes: (data.changes || []).filter(courseVisible),
      pastTaskCount: tasks.filter((task) => task.isPast).length,
      upcomingTaskCount: tasks.filter((task) => !task.isPast && !task.isLater).length,
      laterTaskCount: tasks.filter((task) => !task.isPast && task.isLater).length,
    };
  }

  // Parses a stored JSON array of ids. When `knownKeys` is given, ids that no
  // longer exist are dropped so stale preferences do not accumulate. Pass null
  // when a missing id may come back (e.g. after a sync that failed to read a
  // course), where pruning would silently lose the viewer's choice.
  function parseStoredKeys(value, knownKeys = null) {
    try {
      const parsed = JSON.parse(value || '[]');
      if (!Array.isArray(parsed)) return new Set();
      const known = knownKeys && new Set(knownKeys);
      return new Set(parsed.filter((key) => typeof key === 'string' && (!known || known.has(key))));
    } catch (_error) {
      return new Set();
    }
  }

  function toggleKey(keys, key) {
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  return {
    filterTimelineData,
    parseStoredKeys,
    toggleKey,
  };
}));
