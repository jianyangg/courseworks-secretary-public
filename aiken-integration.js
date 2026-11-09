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
    const deadline = task.deadlineAt || task.dueAt;
    if (!deadline) return '';
    // Curated date-only entries use 11:59 PM for timeline ordering. Do not
    // present that synthetic time as a real deadline in Aiken.
    if (task.deadlineIsDateOnly || task.time === 'Date only') return String(deadline).slice(0, 10);
    return String(deadline);
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

  function buildChatMessage(tasks) {
    if (!tasks.length || tasks.some((task) => !canAddTask(task))) {
      throw new Error('Select actionable work to send to Aiken.');
    }
    return ['Help me add and plan this coursework:', ...tasks.map((task, index) => {
      return [`${index + 1}. ${String(task.title).trim()}`,
        task.course && `Course: ${task.course}`,
        taskDueDate(task) && `Due: ${taskDueDate(task)}`,
        taskNotes(task)].filter(Boolean).join('\n');
    })].join('\n\n');
  }

  /**
   * Copy a chat message, then open Aiken in a new tab.
   *
   * Order matters. Browsers only allow a clipboard write from a page that
   * still has focus (Chrome rejects it with "Document is not focused"), and
   * opening a tab moves focus to that tab. So the copy must start first,
   * while the click that triggered it still counts as a user gesture, and the
   * tab opens only after the copy settles. The clipboard write finishes in
   * milliseconds, well inside the browser's popup allowance for that click.
   *
   * The browser APIs are passed in so the ordering can be unit-tested without
   * a DOM. Returns what happened so the caller can offer a manual fallback:
   *   { copied: false }               -> show the message for manual copying
   *   { copied: true, opened: false } -> popup blocked; offer a link instead
   */
  async function copyThenOpen(message, { writeText, open }, url = AIKEN_APP_URL) {
    try {
      await writeText(message);
    } catch {
      return { copied: false, opened: false };
    }
    // Do not pass "noopener" in the features string: with it, window.open
    // returns null even on success, so a blocked popup would be undetectable.
    // Clearing `opener` afterwards gives the same isolation.
    const tab = open(url, '_blank');
    if (tab) tab.opener = null;
    return { copied: true, opened: Boolean(tab) };
  }

  return { AIKEN_APP_URL, buildTaskUrl, buildChatMessage, canAddTask, copyThenOpen };
});
