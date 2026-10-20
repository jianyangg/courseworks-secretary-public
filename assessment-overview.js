(function exposeAssessments(root) {
  function overviewCourses(data, now = new Date()) {
    const seen = new Set();
    const groups = new Map();
    const labels = new Map((data.courses || []).map(course => [course.key, course.shortLabel || course.label]));
    const tasks = (data.groups || []).flatMap(group => group.tasks || [])
      .filter(task => task.showInAssessmentOverview && !task.isPreparation && new Date(task.deadlineAt || task.dueAt) >= now)
      .sort((a, b) => new Date(a.deadlineAt || a.dueAt) - new Date(b.deadlineAt || b.dueAt));
    for (const task of tasks) {
      const key = task.id || `${task.course}|${task.title}|${task.dueAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const course = task.colorKey || task.course;
      if (!groups.has(course)) groups.set(course, { title: labels.get(course) || task.course, items: [] });
      groups.get(course).items.push(task);
    }
    return [...groups.values()];
  }

  function render(data) {
    const grid = document.getElementById('assessments-grid');
    const courses = data?.groups ? overviewCourses(data) : (data?.courses || []).map(course => ({
      title: course.shortTitle || course.title,
      items: (course.sections || []).flatMap(section => section.items || []).filter(item => item.showInAssessmentOverview),
    })).filter(course => course.items.length);
    const cards = courses.map(course => {
      const card = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = course.title;
      card.append(heading);
      for (const item of course.items) {
        const source = item.url || item.sourceUrl || item.links?.[0]?.url;
        let safeUrl = '';
        try {
          const parsed = new URL(source);
          if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) safeUrl = parsed.href;
        } catch (_error) { /* Keep the assessment readable without a link. */ }
        const line = document.createElement(safeUrl ? 'a' : 'span');
        if (safeUrl) {
          line.href = safeUrl;
          line.target = '_blank';
          line.rel = 'noopener noreferrer';
          line.title = 'Open assessment source';
        }
        const date = item.deadlineAt || item.dueAt;
        const label = date ? new Intl.DateTimeFormat('en-US', {
          month: 'short', day: 'numeric', timeZone: data.timeZone || 'America/New_York',
        }).format(new Date(date)) : item.date || item.dueOn || 'Date to be confirmed';
        line.textContent = `${item.title} · ${label}`;
        card.append(line);
      }
      return card;
    });
    grid.replaceChildren(...cards);
    document.getElementById('assessments-empty').hidden = cards.length > 0;
  }

  const api = { overviewCourses, render };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssessmentOverview = api;
})(typeof window === 'undefined' ? undefined : window);
