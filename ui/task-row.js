function createTask(task) {
  const row = document.createElement('div');
  row.className = `task-row ${task.kind === 'meeting' ? 'meeting-row' : ''}`.trim();

  const copy = document.createElement('div');
  copy.className = 'task-copy';
  const title = document.createElement('div');
  title.className = 'task-title';
  const courseDot = document.createElement('span');
  courseDot.className = 'course-dot';
  courseDot.style.setProperty('--course-color', courseColor(task.colorKey || task.course));
  courseDot.setAttribute('aria-hidden', 'true');
  title.textContent = task.title;
  title.prepend(courseDot);
  const course = document.createElement('div');
  course.className = 'task-course';
  const metadata = [task.course];
  if (task.typeLabel) metadata.push(task.typeLabel);
  if (task.sourceLabel && task.sourceLabel !== 'CourseWorks') {
    metadata.push(task.sourceLabel);
  }
  course.textContent = metadata.join(' · ');
  copy.append(title, course);
  const time = document.createElement('time');
  time.className = 'task-time';
  time.dateTime = task.dueAt;
  time.textContent = task.time;
  if (task.isPreparation) {
    time.classList.add('preparation-time');
    copy.append(time);
    row.append(copy);
  } else {
    row.append(copy, time);
  }
  const disclosure = createTaskDetails(task, timelineData?.timeZone);
  if (disclosure) copy.append(disclosure);

  const links = safeSourceRecords(task.links?.length ? task.links : (task.url ? [{ label: task.sourceLabel || 'Source', url: task.url }] : []));
  const aikenLink = createAikenTaskLink(task);
  if (links.length > 1) {
    row.classList.add('task-row-multi-link');
    const taskLinks = createSourceButtons(links, task.title, 'task-links');
    if (aikenLink) taskLinks.prepend(aikenLink);
    row.append(taskLinks);
  } else if (links.length === 1 || aikenLink) {
    const actions = document.createElement('div');
    actions.className = 'task-row-actions';
    if (aikenLink) actions.append(aikenLink);
    if (links.length === 1) {
      const link = createSourceAnchor(links[0], task.title);
      link.className = 'task-link';
      link.innerHTML = linkIcon;
      actions.append(link);
    }
    row.append(actions);
  }
  return row;
}
