function createTaskDetails(task, timeZone = 'America/New_York') {
  if (!task.detail && !task.deadlineConflict && !task.guideTitle) return null;

  const disclosure = document.createElement('details');
  disclosure.className = task.deadlineConflict ? 'task-detail task-detail-conflict' : 'task-detail';
  const summary = document.createElement('summary');
  const subject = task.detail ? 'instructions' : 'guide note';
  summary.setAttribute('aria-label', `${task.deadlineConflict ? 'Review deadline' : task.detail ? 'Instructions' : 'Guide note'} for ${task.title}`);

  const closedLabel = document.createElement('span');
  closedLabel.className = 'task-detail-label-closed';
  closedLabel.textContent = task.deadlineConflict ? 'Review deadline' : `View ${subject}`;
  const openLabel = document.createElement('span');
  openLabel.className = 'task-detail-label-open';
  openLabel.textContent = task.deadlineConflict ? 'Review deadline' : `Hide ${subject}`;
  const chevron = document.createElement('span');
  chevron.className = 'task-detail-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5.5 7.75 4.5 4.5 4.5-4.5"/></svg>';
  summary.append(closedLabel, openLabel, chevron);

  const content = document.createElement('div');
  content.className = 'task-detail-content';
  if (task.deadlineConflict) {
    const conflict = document.createElement('p');
    conflict.className = 'deadline-notice';
    const format = value => new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium', timeStyle: 'short', timeZone,
    }).format(new Date(value));
    conflict.textContent = `Canvas lists ${format(task.deadlineConflict.synced)}; the reviewed guide lists ${format(task.deadlineConflict.reviewed)}. Check the sources. The timeline uses the Canvas deadline.`;
    content.append(conflict);
  }
  if (task.guideTitle) {
    const guideTitle = document.createElement('p');
    guideTitle.className = 'task-detail-guide-title';
    guideTitle.textContent = `Reviewed guide: ${task.guideTitle}`;
    content.append(guideTitle);
  }
  if (task.detail) {
    const detail = document.createElement('p');
    detail.textContent = task.detail;
    content.append(detail);
  }
  disclosure.append(summary, content);
  return disclosure;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createTaskDetails };
