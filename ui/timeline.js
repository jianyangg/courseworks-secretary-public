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

// Undated work has no place on a dated track, so it gets its own disclosure.
// It stays collapsed like "Later", but its count is always visible.
function createUndatedDisclosure(tasks) {
  const disclosure = document.createElement('details');
  disclosure.className = 'later-tasks undated-tasks';
  const summary = document.createElement('summary');
  summary.className = 'later-tasks-summary';
  const icon = document.createElement('span');
  icon.className = 'later-tasks-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = `No due date · ${tasks.length} ${tasks.length === 1 ? 'item' : 'items'}`;
  const rule = document.createElement('span');
  rule.className = 'later-tasks-rule';
  rule.setAttribute('aria-hidden', 'true');
  summary.append(icon, label, rule);
  const list = document.createElement('div');
  list.className = 'undated-list';
  list.append(...tasks.map((task) => createTask({ ...task, time: 'No due date' })));
  disclosure.append(summary, list);
  return disclosure;
}

// What CourseWorks changed in recent syncs: new or removed assignments, moved
// deadlines, and new announcements. "Mark all seen" hides the current entries
// on this browser; later changes appear again.
function createChangeFeed(changes) {
  const feed = document.createElement('section');
  feed.className = 'change-feed';
  feed.setAttribute('aria-labelledby', 'change-feed-title');
  const header = document.createElement('div');
  header.className = 'change-feed-header';
  const title = document.createElement('h2');
  title.id = 'change-feed-title';
  title.textContent = `What changed · ${changes.length}`;
  const seen = document.createElement('button');
  seen.type = 'button';
  seen.className = 'quiet-button change-feed-seen';
  seen.textContent = 'Mark all seen';
  seen.addEventListener('click', () => markChangesSeen(changes));
  header.append(title, seen);
  const list = document.createElement('ul');
  changes.forEach((change) => {
    const item = document.createElement('li');
    item.className = 'change-item';
    item.dataset.kind = change.kind;
    const badge = document.createElement('span');
    badge.className = 'change-badge';
    badge.textContent = change.label;
    const copy = document.createElement('div');
    copy.className = 'change-copy';
    const heading = document.createElement('div');
    heading.className = 'task-title';
    const dot = document.createElement('span');
    dot.className = 'course-dot';
    dot.style.setProperty('--course-color', courseColor(change.colorKey || change.course));
    dot.setAttribute('aria-hidden', 'true');
    heading.append(dot, change.title);
    const detail = document.createElement('div');
    detail.className = 'task-course';
    detail.textContent = `${change.course} · ${change.detail}`;
    copy.append(heading, detail);
    item.append(badge, copy);
    const links = safeSourceRecords(change.url ? [{ label: 'CourseWorks', url: change.url }] : []);
    if (links.length) {
      const link = createSourceAnchor(links[0], change.title);
      link.className = 'task-link';
      link.innerHTML = linkIcon;
      item.append(link);
    }
    list.append(item);
  });
  feed.append(header, list);
  return feed;
}

function renderTimelineContent(data) {
  timeline.replaceChildren();
  timeline.classList.remove('showing-past');
  const nearCount = data.upcomingTaskCount;
  const doneCount = data.doneTasks?.length || 0;
  timelineSummary.textContent = `${nearCount} ${nearCount === 1 ? 'item' : 'items'} in the next 21 days`
    + (doneCount ? ` · ${doneCount} marked done` : '')
    + ` · ${formatUpdated(data.syncedAt || data.generatedAt)}`;
  if (data.changes?.length) timeline.append(createChangeFeed(data.changes));
  if (!data.groups.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    // Groups can be empty because of hidden courses or done marks, not only
    // because nothing is scheduled.
    empty.textContent = timelineData && timelineData.groups.length
      ? 'Nothing left to show for the visible courses.'
      : 'Nothing scheduled.';
    timeline.append(empty);
    if (data.undated?.length) timeline.append(createUndatedDisclosure(data.undated));
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
  if (data.undated?.length) timeline.append(createUndatedDisclosure(data.undated));
}
