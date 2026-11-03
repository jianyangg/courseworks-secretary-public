function formatGradedDeadline(task, timeZone) {
  const deadline = task.deadlineAt || task.dueAt;
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(new Date(deadline));
  const time = task.deadlineIsDateOnly
    ? 'Date only'
    : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(deadline));
  return `${day} · ${time}`;
}

function createGradedWorkRow(task, data, onSelect) {
  const timeZone = data.timeZone || 'America/New_York';
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
  checkbox.addEventListener('change', () => onSelect(task, checkbox.checked));
  const heading = document.createElement('label');
  heading.className = 'graded-work-selection';
  heading.append(checkbox, title);
  copy.append(heading, course);

  const due = document.createElement('div');
  due.className = 'graded-work-due';
  const days = document.createElement('strong');
  const deadline = task.deadlineAt || task.dueAt;
  if (deadline) {
    days.textContent = GradedWork.daysLeftLabel(deadline, new Date(), timeZone);
    const date = document.createElement('time');
    date.dateTime = deadline;
    date.textContent = formatGradedDeadline(task, timeZone);
    due.append(days, date);
  } else {
    days.className = 'graded-work-undated';
    days.textContent = 'No due date';
    due.append(days);
  }
  row.append(copy, due);

  const links = task.links?.length ? task.links : (task.url ? [{ label: task.sourceLabel || 'Source', url: task.url }] : []);
  const actions = createSourceButtons(links, task.title, 'graded-work-links');
  const aikenAction = createAikenTaskLink(task);
  if (aikenAction) actions.prepend(aikenAction);
  // A local mark only: CourseWorks is never told, and the mark is undone from
  // the "Marked done" list below.
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'graded-work-done';
  done.textContent = 'Mark done';
  done.setAttribute('aria-label', `Mark ${task.title} done and hide it`);
  done.addEventListener('click', () => toggleTaskDone(task.id));
  actions.append(done);
  row.append(actions);
  return row;
}

function createDoneDisclosure(tasks, data) {
  const timeZone = data.timeZone || 'America/New_York';
  const disclosure = document.createElement('details');
  disclosure.className = 'graded-work-done-list';
  const summary = document.createElement('summary');
  summary.textContent = `Marked done · ${tasks.length}`;
  const list = document.createElement('ul');
  tasks.forEach((task) => {
    const item = document.createElement('li');
    const copy = document.createElement('span');
    const deadline = task.deadlineAt || task.dueAt;
    copy.textContent = `${task.title} · ${task.course}${deadline ? ` · ${formatGradedDeadline(task, timeZone)}` : ''}`;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'graded-work-done';
    undo.textContent = 'Undo';
    undo.setAttribute('aria-label', `Show ${task.title} again`);
    undo.addEventListener('click', () => toggleTaskDone(task.id));
    item.append(copy, undo);
    list.append(item);
  });
  disclosure.append(summary, list);
  return disclosure;
}

function renderGradedWork(data) {
  const tasks = GradedWork.gradedTasks(data);
  const undated = GradedWork.undatedGradedTasks(data);
  const done = GradedWork.doneGradedTasks(data);
  gradedWork.replaceChildren();
  if (!tasks.length && !undated.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming graded work is confirmed for the visible courses.';
    gradedWork.append(empty);
    if (done.length) gradedWork.append(createDoneDisclosure(done, data));
    return;
  }
  const count = document.createElement('p');
  count.className = 'graded-work-count';
  count.textContent = `${tasks.length} upcoming graded ${tasks.length === 1 ? 'item' : 'items'}`
    + (undated.length ? ` · ${undated.length} without a due date` : '');
  gradedWork.append(count);
  const selection = new Set();
  const bulkAction = document.createElement('button');
  bulkAction.className = 'source-button';
  bulkAction.disabled = true;
  const updateSelection = () => {
    bulkAction.textContent = `Send selected to Aiken Chat (${selection.size})`;
    bulkAction.disabled = selection.size === 0;
  };
  const onSelect = (task, selected) => {
    if (selected) selection.add(task);
    else selection.delete(task);
    updateSelection();
  };
  updateSelection();
  bulkAction.addEventListener('click', () => AikenActions.openChat([...tasks, ...undated].filter((task) => selection.has(task)), bulkAction));
  gradedWork.append(bulkAction);
  tasks.forEach((task) => gradedWork.append(createGradedWorkRow(task, data, onSelect)));
  if (undated.length) {
    const heading = document.createElement('h3');
    heading.className = 'graded-work-section';
    heading.textContent = 'No due date set';
    const note = document.createElement('p');
    note.className = 'graded-work-count';
    note.textContent = 'CourseWorks lists these as graded but gives no deadline. Check the course page or syllabus for when they are expected.';
    gradedWork.append(heading, note);
    undated.forEach((task) => gradedWork.append(createGradedWorkRow(task, data, onSelect)));
  }
  if (done.length) gradedWork.append(createDoneDisclosure(done, data));
}
