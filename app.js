const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const timelineView = document.getElementById('timeline-view');
const timeline = document.getElementById('timeline');
const timelineSummary = document.getElementById('timeline-summary');
const gradedWork = document.getElementById('graded-work');
const allWorkButton = document.getElementById('all-work-button');
const calendarButton = document.getElementById('calendar-button');
const gradedWorkButton = document.getElementById('graded-work-button');
const calendar = document.getElementById('calendar');
const calendarMonth = document.getElementById('calendar-month');
const calendarGrid = document.getElementById('calendar-grid');
const calendarAgendaTitle = document.getElementById('calendar-agenda-title');
const calendarAgendaItems = document.getElementById('calendar-agenda-items');
const calendarPrevious = document.getElementById('calendar-previous');
const calendarNext = document.getElementById('calendar-next');
const calendarToday = document.getElementById('calendar-today');
const syncButton = document.getElementById('sync-button');
const syncMessage = document.getElementById('sync-message');
const logoutButton = document.getElementById('logout-button');
const courseFilters = document.getElementById('course-filters');
const courseGuideView = document.getElementById('course-guide-view');
const courseGuideSummary = document.getElementById('course-guide-summary');
const courseGuideTabs = document.getElementById('course-guide-tabs');
const courseGuideContent = document.getElementById('course-guide-content');
let guideData;
let timelineData;
let hiddenCourseKeys = new Set();
let displayMode = 'timeline';
let calendarYear;
let calendarMonthIndex;
let selectedCalendarDate;

const hiddenCoursesStorageKey = 'courseworks-hidden-courses';

const linkIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 7h2a5 5 0 0 1 0 10h-2"></path>
    <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
    <path d="M8 12h8"></path>
  </svg>`;

const addIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 5v14"></path>
    <path d="M5 12h14"></path>
  </svg>`;

function createAikenTaskLink(task) {
  if (!AikenIntegration.canAddTask(task)) return null;
  const link = document.createElement('a');
  link.className = 'aiken-task-link';
  link.href = AikenIntegration.buildTaskUrl(task);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = addIcon;
  link.title = 'Add to Aiken';
  link.setAttribute('aria-label', `Add ${task.title} to Aiken Dewit`);
  return link;
}

// Stable palette: the same course keeps the same color across refreshes and devices.
const courseColors = [
  '#315f54', '#2f6f9f', '#7a5c9e', '#a06413',
  '#b04a4a', '#287b78', '#6d7f2f', '#8a4f78',
];

function courseColor(course) {
  let hash = 0;
  for (const character of course || 'Course') {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return courseColors[hash % courseColors.length];
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function showLogin(message = '') {
  timelineView.hidden = true;
  courseGuideView.hidden = true;
  login.hidden = false;
  loginMessage.textContent = message;
  document.getElementById('password').focus();
}

function showTimeline() {
  login.hidden = true;
  courseGuideView.hidden = true;
  timelineView.hidden = false;
}

function showCourseGuide() {
  login.hidden = true;
  timelineView.hidden = true;
  courseGuideView.hidden = false;
}

function formatUpdated(value) {
  if (!value) return 'Never synced';
  const date = new Date(value);
  return `Updated ${new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  }).format(date)}`;
}

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
  row.append(copy, time);

  const links = task.links?.length ? task.links : (task.url ? [{ label: task.sourceLabel || 'Source', url: task.url }] : []);
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

function createSourceAnchor(record, context) {
  const link = document.createElement('a');
  const host = new URL(record.url).hostname.replace(/^www\./, '');
  link.href = record.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = `${record.label} · ${host}`;
  link.setAttribute('aria-label', `Open ${record.label} for ${context} at ${host}`);
  return link;
}

function createSourceButtons(records, context, className) {
  const container = document.createElement('div');
  container.className = className;
  records.forEach((record) => {
    const link = createSourceAnchor(record, context);
    link.className = 'source-button';
    link.textContent = record.label;
    container.append(link);
  });
  return container;
}

function createGuideItem(item) {
  const row = document.createElement('div');
  row.className = 'guide-item';

  const date = document.createElement('span');
  date.className = 'guide-item-date';
  date.textContent = item.date;

  const dot = document.createElement('i');
  dot.className = `guide-item-dot ${item.tone || ''}`.trim();
  dot.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = item.title;
  const detail = document.createElement('span');
  detail.textContent = item.detail;
  copy.append(title, detail);
  if (item.links?.length) {
    copy.append(createSourceButtons(item.links, item.title, 'guide-item-links'));
  }
  row.append(date, dot, copy);
  return row;
}

function createGuideSection(section) {
  const block = document.createElement('section');
  block.className = 'guide-section';
  const label = document.createElement('h3');
  label.textContent = section.label;
  const body = document.createElement('div');
  body.className = 'guide-section-body';

  if (section.items) {
    const items = document.createElement('div');
    items.className = 'guide-items';
    items.append(...section.items.map(createGuideItem));
    body.append(items);
  }
  if (section.bullets) {
    const list = document.createElement('ul');
    section.bullets.forEach((bullet) => {
      const item = document.createElement('li');
      item.textContent = bullet.text;
      list.append(item);
    });
    body.append(list);
  }
  if (section.note) {
    const note = document.createElement('p');
    note.textContent = section.note;
    body.append(note);
  }
  block.append(label, body);
  return block;
}

function renderGuideCourse(course) {
  const header = document.createElement('header');
  header.className = 'guide-course-header';
  const headingCopy = document.createElement('div');
  const heading = document.createElement('h2');
  const dot = document.createElement('span');
  dot.className = 'course-dot guide-course-dot';
  dot.style.setProperty('--course-color', courseColor(course.colorKey || course.title));
  dot.setAttribute('aria-hidden', 'true');
  const title = document.createElement('span');
  title.textContent = course.title;
  heading.append(dot, title);
  const subtitle = document.createElement('p');
  subtitle.textContent = course.subtitle;
  headingCopy.append(heading, subtitle);

  const sources = document.createElement('div');
  sources.className = 'guide-source-links';
  const sourceRecords = course.sources || [{
    label: course.sourceLabel,
    url: course.sourceUrl || course.courseUrl,
  }];
  sourceRecords.forEach((record) => {
    const source = document.createElement('a');
    source.className = 'guide-source-link';
    source.href = record.url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = record.label;
    source.setAttribute('aria-label', `${record.label}; open source`);
    sources.append(source);
  });
  header.append(headingCopy, sources);

  courseGuideContent.setAttribute('aria-labelledby', `guide-tab-${course.id}`);
  courseGuideContent.replaceChildren(header, ...course.sections.map(createGuideSection));
  courseGuideTabs.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.courseId === course.id;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
}

function renderCourseGuide(data) {
  guideData = data;
  const reviewed = new Date(data.reviewedAt);
  courseGuideSummary.textContent = `Reviewed ${new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  }).format(reviewed)}`;
  courseGuideTabs.replaceChildren();
  if (!data.courses.length) {
    courseGuideContent.textContent = 'No courses have been synced yet. Choose Sync to load your CourseWorks account.';
    return;
  }
  data.courses.forEach((course, index) => {
    const tab = document.createElement('button');
    tab.className = 'course-guide-tab';
    tab.id = `guide-tab-${course.id}`;
    tab.type = 'button';
    tab.role = 'tab';
    tab.dataset.courseId = course.id;
    tab.setAttribute('aria-controls', 'course-guide-content');
    tab.setAttribute('aria-selected', String(index === 0));
    tab.textContent = course.shortTitle;
    tab.addEventListener('click', () => renderGuideCourse(course));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + data.courses.length) % data.courses.length;
      const nextTab = courseGuideTabs.children[nextIndex];
      nextTab.focus();
      renderGuideCourse(data.courses[nextIndex]);
    });
    courseGuideTabs.append(tab);
  });
  renderGuideCourse(data.courses[0]);
}

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
  timelineSummary.textContent = `${nearCount} ${nearCount === 1 ? 'item' : 'items'} in the next 21 days · ${formatUpdated(data.generatedAt)}`;
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
  tasks.forEach((task) => {
    const row = document.createElement('article');
    row.className = 'graded-work-row';
    const copy = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = task.title;
    const course = document.createElement('p');
    course.className = 'graded-work-course';
    course.textContent = task.course;
    copy.append(title, course);
    const due = document.createElement('div');
    due.className = 'graded-work-due';
    const days = document.createElement('strong');
    days.textContent = GradedWork.daysLeftLabel(task.dueAt);
    const date = document.createElement('time');
    date.dateTime = task.dueAt;
    date.textContent = `${new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', timeZone: 'America/New_York',
    }).format(new Date(task.dueAt))} · ${task.time}`;
    due.append(days, date);
    row.append(copy, due);
    const links = task.links?.length ? task.links : (task.url ? [{ label: task.sourceLabel || 'Source', url: task.url }] : []);
    if (links.length) row.append(createSourceButtons(links, task.title, 'graded-work-links'));
    gradedWork.append(row);
  });
}

function calendarDateLabel(dateKey, options) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function renderCalendarAgenda(tasksByDate) {
  const tasks = tasksByDate.get(selectedCalendarDate) || [];
  calendarAgendaTitle.textContent = calendarDateLabel(selectedCalendarDate, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  calendarAgendaItems.replaceChildren();
  if (!tasks.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar-empty-day';
    empty.textContent = 'Nothing scheduled.';
    calendarAgendaItems.append(empty);
    return;
  }
  calendarAgendaItems.append(...tasks.map(createTask));
}

function renderCalendar(data) {
  const todayKey = CalendarView.easternDateKey();
  const [todayYear, todayMonth] = todayKey.split('-').map(Number);
  if (calendarYear === undefined || calendarMonthIndex === undefined) {
    calendarYear = todayYear;
    calendarMonthIndex = todayMonth - 1;
  }

  const tasksByDate = CalendarView.groupTasksByDate(data.groups);
  const monthPrefix = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-`;
  if (!selectedCalendarDate || !selectedCalendarDate.startsWith(monthPrefix)) {
    selectedCalendarDate = CalendarView.chooseInitialDate(
      tasksByDate,
      calendarYear,
      calendarMonthIndex,
      todayKey,
    );
  }

  calendarMonth.textContent = new Intl.DateTimeFormat('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(calendarYear, calendarMonthIndex, 1)));
  calendarGrid.replaceChildren();
  CalendarView.buildMonthDays(calendarYear, calendarMonthIndex, todayKey).forEach((day) => {
    const tasks = tasksByDate.get(day.dateKey) || [];
    const button = document.createElement('button');
    button.className = 'calendar-day';
    button.type = 'button';
    button.setAttribute('role', 'gridcell');
    button.dataset.inMonth = String(day.inMonth);
    button.classList.toggle('is-today', day.isToday);
    button.classList.toggle('is-selected', day.dateKey === selectedCalendarDate);
    const fullDate = calendarDateLabel(day.dateKey, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    button.setAttribute('aria-label', `${fullDate}; ${tasks.length} ${tasks.length === 1 ? 'item' : 'items'}`);
    button.setAttribute('aria-selected', String(day.dateKey === selectedCalendarDate));

    const number = document.createElement('time');
    number.className = 'calendar-day-number';
    number.dateTime = day.dateKey;
    number.textContent = day.day;
    button.append(number);

    const previews = document.createElement('span');
    previews.className = 'calendar-day-items';
    tasks.slice(0, 3).forEach((task) => {
      const preview = document.createElement('span');
      preview.className = 'calendar-day-item';
      const dot = document.createElement('i');
      dot.style.setProperty('--course-color', courseColor(task.colorKey || task.course));
      dot.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.textContent = task.title;
      preview.append(dot, title);
      previews.append(preview);
    });
    if (tasks.length > 3) {
      const more = document.createElement('span');
      more.className = 'calendar-day-more';
      more.textContent = `+${tasks.length - 3} more`;
      previews.append(more);
    }
    button.append(previews);
    button.addEventListener('click', () => {
      const [year, month] = day.dateKey.split('-').map(Number);
      calendarYear = year;
      calendarMonthIndex = month - 1;
      selectedCalendarDate = day.dateKey;
      renderCalendar(data);
    });
    calendarGrid.append(button);
  });
  renderCalendarAgenda(tasksByDate);

  const monthTaskCount = [...tasksByDate.entries()]
    .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
    .reduce((count, [, tasks]) => count + tasks.length, 0);
  if (displayMode === 'calendar') {
    timelineSummary.textContent = `${monthTaskCount} ${monthTaskCount === 1 ? 'item' : 'items'} in ${calendarMonth.textContent} · ${formatUpdated(data.generatedAt)}`;
  }
}

function setDisplayMode(mode) {
  displayMode = mode;
  const graded = mode === 'graded';
  const calendarVisible = mode === 'calendar';
  timeline.hidden = mode !== 'timeline';
  calendar.hidden = !calendarVisible;
  gradedWork.hidden = !graded;
  allWorkButton.setAttribute('aria-pressed', String(mode === 'timeline'));
  calendarButton.setAttribute('aria-pressed', String(calendarVisible));
  gradedWorkButton.setAttribute('aria-pressed', String(graded));
  if (timelineData) renderVisibleWork();
}

function renderVisibleWork() {
  const visible = TimelineFilters.filterTimelineData(timelineData, hiddenCourseKeys);
  renderTimelineContent(visible);
  renderCalendar(visible);
  renderGradedWork(visible);
  if (displayMode === 'graded') {
    const count = GradedWork.gradedTasks(visible).length;
    timelineSummary.textContent = `${count} upcoming graded ${count === 1 ? 'item' : 'items'} · ${formatUpdated(visible.generatedAt)}`;
  }
}

function saveHiddenCourseKeys() {
  try {
    localStorage.setItem(hiddenCoursesStorageKey, JSON.stringify([...hiddenCourseKeys]));
  } catch (_error) {
    // Filtering still works for this page load when storage is unavailable.
  }
}

function renderCourseFilters(focusCourseKey) {
  courseFilters.replaceChildren();
  let buttonToFocus;
  (timelineData.courses || []).forEach((course) => {
    const visible = !hiddenCourseKeys.has(course.key);
    const button = document.createElement('button');
    button.className = 'course-filter';
    button.type = 'button';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${course.label}`);

    const dot = document.createElement('span');
    dot.className = 'course-filter-dot';
    dot.style.setProperty('--course-color', courseColor(course.key));
    dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'course-filter-label';
    label.textContent = course.shortLabel;
    button.append(dot, label);
    button.addEventListener('click', () => {
      hiddenCourseKeys = TimelineFilters.toggleHiddenCourse(hiddenCourseKeys, course.key);
      saveHiddenCourseKeys();
      renderCourseFilters(course.key);
      renderVisibleWork();
    });
    if (course.key === focusCourseKey) buttonToFocus = button;
    courseFilters.append(button);
  });
  courseFilters.hidden = !(timelineData.courses || []).length;
  if (buttonToFocus) buttonToFocus.focus();
}

function render(data) {
  timelineData = data;
  let stored = '';
  try {
    stored = localStorage.getItem(hiddenCoursesStorageKey);
  } catch (_error) {
    // Use the default visible state when storage is unavailable.
  }
  hiddenCourseKeys = TimelineFilters.parseHiddenCourseKeys(
    stored,
    (data.courses || []).map((course) => course.key),
  );
  renderCourseFilters();
  renderVisibleWork();
}

allWorkButton.addEventListener('click', () => setDisplayMode('timeline'));
calendarButton.addEventListener('click', () => setDisplayMode('calendar'));
gradedWorkButton.addEventListener('click', () => setDisplayMode('graded'));

function moveCalendar(offset) {
  const shifted = CalendarView.shiftMonth(calendarYear, calendarMonthIndex, offset);
  calendarYear = shifted.year;
  calendarMonthIndex = shifted.month;
  selectedCalendarDate = undefined;
  renderVisibleWork();
}

calendarPrevious.addEventListener('click', () => moveCalendar(-1));
calendarNext.addEventListener('click', () => moveCalendar(1));
calendarToday.addEventListener('click', () => {
  const todayKey = CalendarView.easternDateKey();
  const [year, month] = todayKey.split('-').map(Number);
  calendarYear = year;
  calendarMonthIndex = month - 1;
  selectedCalendarDate = todayKey;
  renderVisibleWork();
});

async function loadTimeline() {
  const { response, payload } = await request('/api/timeline');
  if (response.status === 401) {
    showLogin();
    return;
  }
  showTimeline();
  if (response.status === 404) {
    timelineSummary.textContent = 'No coursework data yet';
    timeline.innerHTML = '<p class="empty-state">Press Refresh to load your coursework.</p>';
    return;
  }
  if (!response.ok) {
    syncMessage.textContent = payload.error || payload.detail || 'Could not load the timeline.';
    return;
  }
  render(payload);
}

async function loadCourseGuide() {
  showCourseGuide();
  if (guideData) return;
  const { response, payload } = await request('/api/course-guide');
  if (response.status === 401) {
    showLogin();
    return;
  }
  if (!response.ok) {
    courseGuideSummary.textContent = 'Could not load the course guide.';
    return;
  }
  renderCourseGuide(payload);
}

function loadCurrentView() {
  return window.location.hash === '#guide' ? loadCourseGuide() : loadTimeline();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  const submit = loginForm.querySelector('button');
  submit.disabled = true;
  const password = new FormData(loginForm).get('password');
  const { response, payload } = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  loginForm.reset();
  submit.disabled = false;
  if (!response.ok) {
    loginMessage.textContent = payload.error || payload.detail || 'Could not sign in.';
    return;
  }
  await loadCurrentView();
});

syncButton.addEventListener('click', async () => {
  syncButton.disabled = true;
  syncButton.textContent = 'Refreshing…';
  syncMessage.textContent = '';
  const { response, payload } = await request('/api/sync', { method: 'POST' });
  syncButton.disabled = false;
  syncButton.textContent = 'Refresh';
  if (response.status === 401) {
    showLogin('Your session expired.');
    return;
  }
  if (!response.ok) {
    syncMessage.textContent = payload.error || payload.detail || 'Refresh failed. Your previously loaded coursework is still shown.';
    return;
  }
  render(payload);
  syncMessage.textContent = 'Coursework is up to date.';
});

logoutButton.addEventListener('click', async () => {
  await request('/api/logout', { method: 'POST' });
  guideData = undefined;
  showLogin();
});

document.querySelectorAll('.logout-button').forEach((button) => {
  button.addEventListener('click', () => logoutButton.click());
});

window.addEventListener('hashchange', loadCurrentView);
loadCurrentView();
