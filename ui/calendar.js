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
  const todayKey = CalendarView.easternDateKey(new Date(), timelineData?.timeZone || 'America/New_York');
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
    timelineSummary.textContent = `${monthTaskCount} ${monthTaskCount === 1 ? 'item' : 'items'} in ${calendarMonth.textContent} · ${formatUpdated(data.syncedAt || data.generatedAt)}`;
  }
}
