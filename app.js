const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const timelineView = document.getElementById('timeline-view');
const timeline = document.getElementById('timeline');
const timelineSummary = document.getElementById('timeline-summary');
const gradedWork = document.getElementById('graded-work');
const allWorkButton = document.getElementById('all-work-button');
const calendarButton = document.getElementById('calendar-button');
const waveButton = document.getElementById('wave-button');
const waveView = document.getElementById('wave');
const gradedWorkButton = document.getElementById('graded-work-button');
const assessmentsButton = document.getElementById('assessments-button');
const assessments = document.getElementById('assessments');
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
// Work the viewer marked done that CourseWorks does not know about (e.g. handed
// in on paper or on another site). Per-browser, like the course filter.
let doneTaskIds = new Set();
let seenChangeIds = new Set();
// Hours the viewer typed for a task, by task id. They take precedence over the
// course-guide review's estimate and stay in this browser, like done marks.
let sizeOverrides = new Map();
let selectedWaveTaskId;
let displayMode = 'timeline';
let calendarYear;
let calendarMonthIndex;
let selectedCalendarDate;
const isDemo = document.body.hasAttribute('data-demo');
if (isDemo) {
  document.getElementById('demo-notice').hidden = false;
  document.querySelectorAll('#logout-button, .logout-button').forEach(button => { button.hidden = true; });
  syncButton.textContent = 'Reset demo';
}

const renderRefreshStatus = createSourceNotice(syncMessage, {
  isDemo,
  onDismiss: () => syncButton.focus(),
});

const storagePrefix = isDemo ? 'courseworks-demo-' : 'courseworks-';
const hiddenCoursesStorageKey = `${storagePrefix}hidden-courses`;
const doneTasksStorageKey = `${storagePrefix}done-tasks`;
const seenChangesStorageKey = `${storagePrefix}seen-changes`;
const sizeOverridesStorageKey = `${storagePrefix}size-overrides`;

const linkIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 7h2a5 5 0 0 1 0 10h-2"></path>
    <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
    <path d="M8 12h8"></path>
  </svg>`;

function createAikenTaskLink(task) {
  if (!AikenIntegration.canAddTask(task)) return null;
  return AikenActions.create(task);

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

const { request } = CourseworksApi;

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
  return `Synced ${new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: timelineData?.timeZone || 'America/New_York', timeZoneName: 'short',
  }).format(date)}`;
}

function setDisplayMode(mode) {
  displayMode = mode;
  const graded = mode === 'graded';
  const calendarVisible = mode === 'calendar';
  timeline.hidden = mode !== 'timeline';
  calendar.hidden = !calendarVisible;
  waveView.hidden = mode !== 'wave';
  gradedWork.hidden = !graded;
  assessments.hidden = mode !== 'assessments';
  courseFilters.hidden = !(timelineData?.courses || []).length;
  allWorkButton.setAttribute('aria-pressed', String(mode === 'timeline'));
  calendarButton.setAttribute('aria-pressed', String(calendarVisible));
  waveButton.setAttribute('aria-pressed', String(mode === 'wave'));
  gradedWorkButton.setAttribute('aria-pressed', String(graded));
  assessmentsButton.setAttribute('aria-pressed', String(mode === 'assessments'));
  if (timelineData) renderVisibleWork();
}

function renderVisibleWork() {
  const visible = TimelineFilters.filterTimelineData(timelineData, hiddenCourseKeys, doneTaskIds);
  visible.changes = visible.changes.filter((change) => !seenChangeIds.has(change.id));
  renderTimelineContent(visible);
  renderCalendar(visible);
  renderWave(visible);
  renderGradedWork(visible);
  AssessmentOverview.render(visible);
  if (displayMode === 'graded') {
    const count = GradedWork.gradedTasks(visible).length;
    timelineSummary.textContent = `${count} upcoming graded ${count === 1 ? 'item' : 'items'} · ${formatUpdated(visible.syncedAt || visible.generatedAt)}`;
  } else if (displayMode === 'assessments') {
    timelineSummary.textContent = `Exams and project milestones · ${formatUpdated(visible.syncedAt || visible.generatedAt)}`;
  }
}

function loadStoredKeys(storageKey, knownKeys) {
  let stored = '';
  try {
    stored = localStorage.getItem(storageKey);
  } catch (_error) {
    // Use the default state when storage is unavailable.
  }
  return TimelineFilters.parseStoredKeys(stored, knownKeys);
}

function saveStoredKeys(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...keys]));
  } catch (_error) {
    // The preference still applies for this page load when storage is unavailable.
  }
}

function toggleTaskDone(taskId) {
  doneTaskIds = TimelineFilters.toggleKey(doneTaskIds, taskId);
  saveStoredKeys(doneTasksStorageKey, doneTaskIds);
  renderVisibleWork();
}

function loadSizeOverrides() {
  let stored = '';
  try {
    stored = localStorage.getItem(sizeOverridesStorageKey);
  } catch (_error) {
    // Without storage, sizes set now still apply for this page load.
  }
  return WorkloadWave.parseSizeOverrides(stored);
}

function setSizeOverride(taskId, hours) {
  sizeOverrides = WorkloadWave.withSizeOverride(sizeOverrides, taskId, hours);
  try {
    localStorage.setItem(sizeOverridesStorageKey, WorkloadWave.serializeSizeOverrides(sizeOverrides));
  } catch (_error) {
    // The size still applies for this page load when storage is unavailable.
  }
  renderVisibleWork();
}

function markChangesSeen(changes) {
  seenChangeIds = new Set([...seenChangeIds, ...changes.map((change) => change.id)]);
  saveStoredKeys(seenChangesStorageKey, seenChangeIds);
  renderVisibleWork();
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
      hiddenCourseKeys = TimelineFilters.toggleKey(hiddenCourseKeys, course.key);
      saveStoredKeys(hiddenCoursesStorageKey, hiddenCourseKeys);
      renderCourseFilters(course.key);
      renderVisibleWork();
    });
    if (course.key === focusCourseKey) buttonToFocus = button;
    courseFilters.append(button);
  });
  courseFilters.hidden = !(timelineData.courses || []).length;
  if (buttonToFocus) buttonToFocus.focus();
}

function showSyncError(message) {
  syncMessage.className = 'sync-message sync-message--error';
  syncMessage.textContent = message;
}

function render(data) {
  timelineData = data;
  renderRefreshStatus(data.warnings, { syncId: data.syncedAt || data.generatedAt });
  hiddenCourseKeys = loadStoredKeys(hiddenCoursesStorageKey, (data.courses || []).map((course) => course.key));
  // Done marks are not pruned: a task can be absent from one sync because a
  // source failed to load, and its mark must still apply when it returns.
  doneTaskIds = loadStoredKeys(doneTasksStorageKey, null);
  // Not pruned either, for the same reason as done marks.
  sizeOverrides = loadSizeOverrides();
  seenChangeIds = loadStoredKeys(seenChangesStorageKey, (data.changes || []).map((change) => change.id));
  renderCourseFilters();
  renderVisibleWork();
}

allWorkButton.addEventListener('click', () => setDisplayMode('timeline'));
calendarButton.addEventListener('click', () => setDisplayMode('calendar'));
waveButton.addEventListener('click', () => setDisplayMode('wave'));
gradedWorkButton.addEventListener('click', () => setDisplayMode('graded'));
assessmentsButton.addEventListener('click', () => setDisplayMode('assessments'));

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
  const todayKey = CalendarView.easternDateKey(new Date(), timelineData?.timeZone || 'America/New_York');
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
    showSyncError(payload.error || payload.detail || 'Could not load the timeline.');
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
  renderRefreshStatus();
  const { response, payload } = await request('/api/sync', { method: 'POST' });
  syncButton.disabled = false;
  syncButton.textContent = isDemo ? 'Reset demo' : 'Refresh';
  if (response.status === 401) {
    showLogin('Your session expired.');
    return;
  }
  if (!response.ok) {
    showSyncError(payload.error || payload.detail || 'Refresh failed. Your previously loaded coursework is still shown.');
    return;
  }
  render(payload);
  renderRefreshStatus(payload.warnings, {
    refreshed: true,
    syncId: payload.syncedAt || payload.generatedAt,
  });
  guideData = undefined;
});

logoutButton.addEventListener('click', async () => {
  await request('/api/logout', { method: 'POST' });
  guideData = undefined;
  timelineData = undefined;
  timeline.replaceChildren();
  gradedWork.replaceChildren();
  courseGuideContent.replaceChildren();
  showLogin();
});

document.querySelectorAll('.logout-button').forEach((button) => {
  button.addEventListener('click', () => logoutButton.click());
});

window.addEventListener('hashchange', loadCurrentView);
loadCurrentView();
