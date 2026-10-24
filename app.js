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

const hiddenCoursesStorageKey = isDemo ? 'courseworks-demo-hidden-courses' : 'courseworks-hidden-courses';

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
  gradedWork.hidden = !graded;
  assessments.hidden = mode !== 'assessments';
  courseFilters.hidden = !(timelineData?.courses || []).length;
  allWorkButton.setAttribute('aria-pressed', String(mode === 'timeline'));
  calendarButton.setAttribute('aria-pressed', String(calendarVisible));
  gradedWorkButton.setAttribute('aria-pressed', String(graded));
  assessmentsButton.setAttribute('aria-pressed', String(mode === 'assessments'));
  if (timelineData) renderVisibleWork();
}

function renderVisibleWork() {
  const visible = TimelineFilters.filterTimelineData(timelineData, hiddenCourseKeys);
  renderTimelineContent(visible);
  renderCalendar(visible);
  renderGradedWork(visible);
  AssessmentOverview.render(visible);
  if (displayMode === 'graded') {
    const count = GradedWork.gradedTasks(visible).length;
    timelineSummary.textContent = `${count} upcoming graded ${count === 1 ? 'item' : 'items'} · ${formatUpdated(visible.syncedAt || visible.generatedAt)}`;
  } else if (displayMode === 'assessments') {
    timelineSummary.textContent = `Exams and project milestones · ${formatUpdated(visible.syncedAt || visible.generatedAt)}`;
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

function showSyncError(message) {
  syncMessage.className = 'sync-message sync-message--error';
  syncMessage.textContent = message;
}

function render(data) {
  timelineData = data;
  renderRefreshStatus(data.warnings);
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
  renderRefreshStatus(payload.warnings, { refreshed: true });
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
