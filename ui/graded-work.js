function renderGradedWork(data) {
  const tasks = GradedWork.gradedTasks(data);
  gradedWork.replaceChildren();
  if (!tasks.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming graded work is confirmed for the visible courses.';
    gradedWork.append(empty);
    return;
  }
  const count = document.createElement('p');
  count.className = 'graded-work-count';
  count.textContent = `${tasks.length} upcoming graded ${tasks.length === 1 ? 'item' : 'items'}`;
  gradedWork.append(count);
  const selection = new Set();
  const bulkAction = document.createElement('button');
  bulkAction.className = 'source-button';
  bulkAction.disabled = true;
  const updateSelection = () => {
    bulkAction.textContent = `Send selected to Aiken Chat (${selection.size})`;
    bulkAction.disabled = selection.size === 0;
  };
  updateSelection();
  bulkAction.addEventListener('click', () => AikenActions.openChat(tasks.filter((task) => selection.has(task)), bulkAction));
  gradedWork.append(bulkAction);
  tasks.forEach((task) => {
    const row = document.createElement('article');
    row.className = 'graded-work-row';
    const copy = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = task.title;
    const course = document.createElement('p');
    course.className = 'graded-work-course';
    course.textContent = task.course;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `Select ${task.title}`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selection.add(task);
      else selection.delete(task);
      updateSelection();
    });
    const heading = document.createElement('label');
    heading.className = 'graded-work-selection';
    heading.append(checkbox, title);
    copy.append(heading, course);
    const due = document.createElement('div');
    due.className = 'graded-work-due';
    const days = document.createElement('strong');
    const deadline = task.deadlineAt || task.dueAt;
    days.textContent = GradedWork.daysLeftLabel(deadline, new Date(), data.timeZone);
    const date = document.createElement('time');
    date.dateTime = deadline;
    date.textContent = `${new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', timeZone: data.timeZone || 'America/New_York',
    }).format(new Date(deadline))} · ${task.deadlineIsDateOnly ? 'Date only' : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: data.timeZone || 'America/New_York' }).format(new Date(deadline))}`;
    due.append(days, date);
    row.append(copy, due);
    const links = task.links?.length ? task.links : (task.url ? [{ label: task.sourceLabel || 'Source', url: task.url }] : []);
    const actions = createSourceButtons(links, task.title, 'graded-work-links');
    const aikenAction = createAikenTaskLink(task);
    if (aikenAction) actions.prepend(aikenAction);
    row.append(actions);
    gradedWork.append(row);
  });
}
