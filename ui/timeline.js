function createTimelineStop(group) {
  const stop = document.createElement('article');
  stop.className = 'timeline-stop';
  stop.dataset.state = group.state;

  const date = document.createElement('div');
  date.className = 'timeline-date';
  const dateLabel = document.createElement('strong');
  dateLabel.textContent = group.dateLabel;
  const weekday = document.createElement('span');
  weekday.textContent = group.weekday;
  date.append(dateLabel, weekday);

  const dot = document.createElement('span');
  dot.className = 'timeline-dot';
  dot.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'timeline-content';
  const status = document.createElement('div');
  status.className = 'timeline-status';
  status.textContent = group.statusLabel;
  content.append(status, ...group.tasks.map(createTask));
  stop.append(date, dot, content);
  return stop;
}

function createTimelineTrack(groups, className = '') {
  const track = document.createElement('div');
  track.className = `timeline-track ${className}`.trim();
  track.append(...groups.map(createTimelineStop));
  return track;
}

function groupsMatching(groups, predicate) {
  return groups.flatMap((group) => {
    const tasks = group.tasks.filter(predicate);
    if (!tasks.length) return [];
    return [{ ...group, state: tasks[0].state || group.state, tasks }];
  });
}

function createPastDisclosure(groups, taskCount) {
  const disclosure = document.createElement('details');
  disclosure.className = 'past-tasks';
  const summary = document.createElement('summary');
  summary.className = 'past-tasks-summary';
  const icon = document.createElement('span');
  icon.className = 'past-tasks-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = `Past · ${taskCount} ${taskCount === 1 ? 'item' : 'items'}`;
  const rule = document.createElement('span');
  rule.className = 'past-tasks-rule';
  rule.setAttribute('aria-hidden', 'true');
  summary.append(icon, label, rule);
  disclosure.append(summary, createTimelineTrack(groups, 'past-timeline'));
  disclosure.addEventListener('toggle', () => {
    timeline.classList.toggle('showing-past', disclosure.open);
  });
  return disclosure;
}

function createLaterDisclosure(groups, taskCount, standalone = false) {
  const disclosure = document.createElement('details');
  disclosure.className = 'later-tasks';
  const summary = document.createElement('summary');
  summary.className = 'later-tasks-summary';
  const icon = document.createElement('span');
  icon.className = 'later-tasks-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = `Later · ${taskCount} ${taskCount === 1 ? 'item' : 'items'}`;
  const rule = document.createElement('span');
  rule.className = 'later-tasks-rule';
  rule.setAttribute('aria-hidden', 'true');
  summary.append(icon, label, rule);

  if (standalone) {
    disclosure.append(summary, createTimelineTrack(groups, 'later-timeline'));
  } else {
    const content = document.createElement('div');
    content.className = 'later-timeline';
    content.append(...groups.map(createTimelineStop));
    disclosure.append(summary, content);
  }
  return disclosure;
}

function renderTimelineContent(data) {
  timeline.replaceChildren();
  timeline.classList.remove('showing-past');
  const nearCount = data.upcomingTaskCount;
  timelineSummary.textContent = `${nearCount} ${nearCount === 1 ? 'item' : 'items'} in the next 21 days · ${formatUpdated(data.syncedAt || data.generatedAt)}`;
  if (!data.groups.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = timelineData && timelineData.groups.length
      ? 'All timeline courses are hidden.'
      : 'Nothing scheduled.';
    timeline.append(empty);
    return;
  }

  const pastGroups = groupsMatching(data.groups, (task) => task.isPast);
  const upcomingGroups = groupsMatching(data.groups, (task) => !task.isPast && !task.isLater);
  const laterGroups = groupsMatching(data.groups, (task) => !task.isPast && task.isLater);
  if (pastGroups.length) {
    timeline.append(createPastDisclosure(pastGroups, data.pastTaskCount));
  }
  if (upcomingGroups.length) {
    const futureTrack = createTimelineTrack(upcomingGroups);
    if (laterGroups.length) {
      futureTrack.append(createLaterDisclosure(laterGroups, data.laterTaskCount));
    }
    timeline.append(futureTrack);
  } else if (laterGroups.length) {
    timeline.append(createLaterDisclosure(laterGroups, data.laterTaskCount, true));
  }
}
