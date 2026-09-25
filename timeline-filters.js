(function exposeTimelineFilters(root, factory) {
  const filters = factory();
  if (typeof module === 'object' && module.exports) module.exports = filters;
  if (root) root.TimelineFilters = filters;
}(typeof window === 'undefined' ? undefined : window, () => {
  function filterTimelineData(data, hiddenCourseKeys) {
    const groups = (data.groups || []).flatMap((group) => {
      const tasks = (group.tasks || []).filter(
        (task) => !hiddenCourseKeys.has(task.colorKey),
      );
      return tasks.length ? [{ ...group, tasks }] : [];
    });
    const tasks = groups.flatMap((group) => group.tasks);
    return {
      ...data,
      groups,
      pastTaskCount: tasks.filter((task) => task.isPast).length,
      upcomingTaskCount: tasks.filter((task) => !task.isPast && !task.isLater).length,
      laterTaskCount: tasks.filter((task) => !task.isPast && task.isLater).length,
    };
  }

  function parseHiddenCourseKeys(value, knownCourseKeys) {
    try {
      const parsed = JSON.parse(value || '[]');
      if (!Array.isArray(parsed)) return new Set();
      const known = new Set(knownCourseKeys);
      return new Set(parsed.filter((key) => typeof key === 'string' && known.has(key)));
    } catch (_error) {
      return new Set();
    }
  }

  function toggleHiddenCourse(hiddenCourseKeys, courseKey) {
    const next = new Set(hiddenCourseKeys);
    if (next.has(courseKey)) next.delete(courseKey);
    else next.add(courseKey);
    return next;
  }

  return { filterTimelineData, parseHiddenCourseKeys, toggleHiddenCourse };
}));
