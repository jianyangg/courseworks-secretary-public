(function exposeAikenIntegration(root, factory) {
  const integration = factory();
  if (typeof module === 'object' && module.exports) module.exports = integration;
  if (root) root.AikenIntegration = integration;
})(typeof globalThis === 'undefined' ? this : globalThis, function createIntegration() {
  const AIKEN_APP_URL = 'https://aikendewit.com/app/';

  function canAddTask(task) {
    return Boolean(
      task
      && task.kind !== 'meeting'
      && String(task.title || '').trim(),
    );
  }

  function taskSourceUrl(task) {
    if (task.url) return String(task.url);
    const source = (task.links || []).find((link) => link?.url);
    return source ? String(source.url) : '';
  }

  function taskNotes(task) {
    const description = [task.typeLabel, task.sourceLabel]
      .filter(Boolean)
      .join(' from ');
    return [description, taskSourceUrl(task)].filter(Boolean).join('\n');
  }

  function taskDueDate(task) {
    if (!task.dueAt) return '';
    // Curated date-only entries use 11:59 PM for timeline ordering. Do not
    // present that synthetic time as a real deadline in Aiken.
    if (task.time === 'Date only') return String(task.dueAt).slice(0, 10);
    return String(task.dueAt);
  }

  function buildTaskUrl(task, baseUrl = AIKEN_APP_URL) {
    if (!canAddTask(task)) throw new Error('An actionable timeline item is required.');
    const params = new URLSearchParams();
    params.set('title', String(task.title).trim());
    if (task.course) params.set('project', String(task.course).trim());
    const dueDate = taskDueDate(task);
    if (dueDate) params.set('dueDate', dueDate);
    const notes = taskNotes(task);
    if (notes) params.set('notes', notes);

    const url = new URL(baseUrl);
    url.hash = `add-task?${params.toString()}`;
    return url.toString();
  }

  return { AIKEN_APP_URL, buildTaskUrl, canAddTask };
});
