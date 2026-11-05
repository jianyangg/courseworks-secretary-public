// Wave view: upcoming work as stacked bars on a time axis that starts today.
// Bar height = hours (the review's estimate, or the viewer's override); a
// second strip underneath shows the daily pace that load implies. All of the
// maths lives in workload-wave.js; this file only draws it.
//
// Interaction model: a whole day column is the click target, not individual
// bars. A 1-hour task can be a few pixels tall, which is impossible to hit;
// a full-height column is easy, and the panel below then lists every task due
// that day with its own size editor.

const SVG_NS = 'http://www.w3.org/2000/svg';
const LATE_KEY = 'late';
let lastWaveData;
let selectedWaveDay;
// Read on first render: this script loads before app.js defines storagePrefix.
let waveRangeDays;
let waveShowLate;

const waveRangeStorageKey = () => `${storagePrefix}wave-range`;
const waveLateStorageKey = () => `${storagePrefix}wave-show-late`;

function loadWavePreferences() {
  if (waveRangeDays !== undefined) return;
  waveRangeDays = WorkloadWave.parseRange(readWavePreference(waveRangeStorageKey()));
  // Off by default: late items are often already handled, just not marked done.
  waveShowLate = readWavePreference(waveLateStorageKey()) === 'true';
}

function readWavePreference(key) {
  try {
    return localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function saveWavePreference(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (_error) {
    // The choice still applies for this page load when storage is unavailable.
  }
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function svgText(text, attributes) {
  const element = svgElement('text', attributes);
  element.textContent = text;
  return element;
}

function waveDeadlineLabel(task) {
  const timeZone = timelineData?.timeZone || 'America/New_York';
  const deadline = new Date(task.deadlineAt || task.dueAt);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone }).format(deadline);
  return task.deadlineIsDateOnly ? day : `${day}, ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(deadline)}`;
}

function bucketLabel(key) {
  return key === LATE_KEY ? 'Late work' : calendarDateLabel(key, { weekday: 'long', month: 'long', day: 'numeric' });
}

function bucketTasks(bucket) {
  return [...bucket.segments.map((segment) => segment.task), ...bucket.unsized];
}

function drawStack(svg, bucket, x, barWidth, baseline, scale, unsizedTop) {
  let top = baseline;
  bucket.segments.forEach((segment) => {
    const height = segment.hours * scale;
    // A 2px gap separates stacked tasks; tiny tasks keep at least 2px of ink.
    const drawn = Math.max(height - 2, 2);
    svg.append(svgElement('rect', {
      x, y: top - drawn, width: barWidth, height: drawn, rx: Math.min(3, barWidth / 3),
      fill: courseColor(segment.task.colorKey || segment.task.course),
      class: segment.source === 'override' ? 'wave-bar is-override' : 'wave-bar',
    }));
    top -= height;
  });
  // Unknown sizes are hollow rings below the axis, never a guessed bar.
  bucket.unsized.slice(0, 3).forEach((task, index) => {
    svg.append(svgElement('circle', {
      cx: x + barWidth / 2, cy: unsizedTop + index * 11, r: 4,
      class: 'wave-unsized', stroke: courseColor(task.colorKey || task.course),
    }));
  });
  if (bucket.unsized.length > 3) {
    svg.append(svgText(`+${bucket.unsized.length - 3}`, {
      x: x + barWidth / 2, y: unsizedTop + 3 * 11 + 4, class: 'wave-axis-label', 'text-anchor': 'middle',
    }));
  }
}

// The click target for a day: a transparent column covering bars and rings.
function addDayTarget(svg, key, bucket, x, width, top, bottom) {
  const tasks = bucketTasks(bucket);
  const sized = bucket.segments.reduce((sum, segment) => sum + segment.hours, 0);
  const summary = tasks.length
    ? `${bucketLabel(key)}: ${tasks.length} ${tasks.length === 1 ? 'item' : 'items'}${sized ? `, ${WorkloadWave.formatHours(sized)}` : ''}${bucket.unsized.length ? `, ${bucket.unsized.length} not estimated` : ''}`
    : `${bucketLabel(key)}: nothing due`;
  const target = svgElement('rect', {
    x, y: top, width, height: bottom - top, class: 'wave-day-target',
    role: 'button', tabindex: tasks.length ? 0 : -1, 'aria-label': summary,
  });
  target.classList.toggle('is-selected', key === selectedWaveDay);
  const title = svgElement('title');
  title.textContent = [summary, ...tasks.map((task) => `• ${task.title}`)].join('\n');
  target.append(title);
  if (tasks.length) {
    const select = () => {
      selectedWaveDay = key;
      renderWave(lastWaveData);
      document.getElementById('wave-detail-area')?.querySelector('input')?.focus();
    };
    target.addEventListener('click', select);
    target.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  }
  svg.append(target);
}

function createWaveChart(wave, width) {
  const hasLate = wave.includeOverdue && bucketTasks(wave.overdue).length > 0;
  const left = 52;
  const right = 8;
  const lateWidth = hasLate ? 40 : 0;
  const plotLeft = left + lateWidth;
  const dayWidth = (width - plotLeft - right) / wave.horizonDays;
  const barWidth = Math.max(4, Math.min(40, dayWidth * 0.62));
  const top = 14;
  const barBaseline = 190;
  const unsizedTop = barBaseline + 12;
  const axisLabelY = unsizedTop + 46;
  const paceTop = axisLabelY + 30;
  const paceBaseline = paceTop + 54;
  const height = paceBaseline + 18;

  const svg = svgElement('svg', {
    viewBox: `0 0 ${width} ${height}`, width, height, class: 'wave-chart',
    role: 'group', 'aria-label': 'Upcoming work by due date, sized in hours',
  });

  // Weekend columns are shaded so the shape of each week is readable.
  wave.days.forEach((day) => {
    const weekday = new Date(`${day.dateKey}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      svg.append(svgElement('rect', {
        x: plotLeft + day.offset * dayWidth, y: top, width: dayWidth, height: paceBaseline - top, class: 'wave-weekend',
      }));
    }
  });

  const ceiling = WorkloadWave.niceCeiling(wave.maxTotal);
  const scale = (barBaseline - top) / ceiling;
  [ceiling / 2, ceiling].forEach((value) => {
    const y = barBaseline - value * scale;
    svg.append(svgElement('line', { x1: plotLeft, x2: width - right, y1: y, y2: y, class: 'wave-grid' }));
    svg.append(svgText(WorkloadWave.formatHours(value), { x: left - 8, y: y + 4, class: 'wave-axis-label', 'text-anchor': 'end' }));
  });

  if (hasLate) {
    svg.append(svgElement('rect', { x: left, y: top, width: lateWidth - 6, height: barBaseline - top, class: 'wave-overdue-zone' }));
    drawStack(svg, wave.overdue, left + (lateWidth - 6 - barWidth) / 2, barWidth, barBaseline, scale, unsizedTop);
    // Sits above the zone so it never collides with the rings' "+N" count.
    svg.append(svgText('Late', { x: left + (lateWidth - 6) / 2, y: top - 2, class: 'wave-axis-label wave-overdue-label', 'text-anchor': 'middle' }));
  }

  wave.days.forEach((day) => {
    const x = plotLeft + day.offset * dayWidth + (dayWidth - barWidth) / 2;
    drawStack(svg, day, x, barWidth, barBaseline, scale, unsizedTop);
  });

  svg.append(svgElement('line', { x1: left, x2: width - right, y1: barBaseline, y2: barBaseline, class: 'wave-baseline' }));
  svg.append(svgElement('line', { x1: plotLeft, x2: plotLeft, y1: top - 6, y2: paceBaseline, class: 'wave-today' }));

  const step = WorkloadWave.tickStep(wave.horizonDays);
  for (let offset = 0; offset < wave.horizonDays; offset += step) {
    const x = plotLeft + offset * dayWidth + dayWidth / 2;
    const options = step === 1 ? { weekday: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' };
    const label = offset === 0 ? 'Today' : calendarDateLabel(wave.days[offset].dateKey, options);
    svg.append(svgText(label, { x, y: axisLabelY, class: 'wave-axis-label', 'text-anchor': 'middle' }));
  }

  // Daily pace strip, on its own scale (hours per day, not hours).
  const paceCeiling = WorkloadWave.niceCeiling(wave.maxPace);
  const paceScale = (paceBaseline - paceTop) / paceCeiling;
  svg.append(svgText(WorkloadWave.formatHours(paceCeiling), { x: left - 8, y: paceTop + 4, class: 'wave-axis-label', 'text-anchor': 'end' }));
  svg.append(svgText('per day', { x: left - 8, y: paceTop + 18, class: 'wave-axis-label', 'text-anchor': 'end' }));
  svg.append(svgElement('line', { x1: plotLeft, x2: width - right, y1: paceTop, y2: paceTop, class: 'wave-grid' }));
  wave.pace.forEach((day, offset) => {
    if (!(day.hours > 0)) return;
    const barHeight = day.hours * paceScale;
    svg.append(svgElement('rect', {
      x: plotLeft + offset * dayWidth + 1, y: paceBaseline - barHeight, width: Math.max(dayWidth - 2, 1), height: barHeight, class: 'wave-pace',
    }));
  });
  svg.append(svgElement('line', { x1: left, x2: width - right, y1: paceBaseline, y2: paceBaseline, class: 'wave-baseline' }));

  // Targets go last so they sit above every mark and receive the clicks.
  // Each covers the bars, the rings and the day's share of the pace strip.
  if (hasLate) addDayTarget(svg, LATE_KEY, wave.overdue, left, lateWidth - 6, top, unsizedTop + 40);
  wave.days.forEach((day) => {
    addDayTarget(svg, day.dateKey, day, plotLeft + day.offset * dayWidth, dayWidth, top, paceBaseline);
  });
  return svg;
}

function createSizeRow(task) {
  const size = WorkloadWave.effectiveSize(task, sizeOverrides);
  const row = document.createElement('article');
  row.className = 'wave-task';

  const heading = document.createElement('div');
  heading.className = 'wave-task-heading';
  const dot = document.createElement('i');
  dot.className = 'wave-task-dot';
  dot.style.setProperty('--course-color', courseColor(task.colorKey || task.course));
  dot.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h4');
  title.textContent = task.title;
  heading.append(dot, title);

  const meta = document.createElement('p');
  meta.className = 'wave-task-meta';
  meta.textContent = `${task.course} · ${waveDeadlineLabel(task)}`;

  const status = document.createElement('p');
  status.className = 'wave-size-status';
  if (!size) status.textContent = 'Not estimated yet.';
  else if (size.source === 'override') {
    status.textContent = `Your size: ${WorkloadWave.formatHours(size.hours)}.`;
    if (size.estimate) status.textContent += ` Estimated ${WorkloadWave.formatHours(size.estimate.hours)}: ${size.estimate.basis}`;
  } else status.textContent = `Estimated ${WorkloadWave.formatHours(size.hours)}: ${size.estimate.basis}`;

  const form = document.createElement('form');
  form.className = 'wave-size-form';
  const label = document.createElement('label');
  label.textContent = 'Hours';
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0.5';
  input.max = String(WorkloadWave.MAX_HOURS);
  input.step = '0.5';
  input.required = true;
  input.value = size ? String(size.hours) : '';
  input.setAttribute('aria-label', `Hours for ${task.title}`);
  label.append(input);
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save';
  form.append(label, save);
  if (size?.source === 'override') {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'wave-size-reset';
    reset.textContent = size.estimate ? 'Use estimate' : 'Clear my size';
    reset.addEventListener('click', () => setSizeOverride(task.id, null));
    form.append(reset);
  }
  const message = document.createElement('p');
  message.className = 'wave-size-message';
  message.setAttribute('role', 'alert');
  input.addEventListener('input', () => { message.textContent = ''; });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const hours = input.valueAsNumber;
    if (!(hours > 0 && hours <= WorkloadWave.MAX_HOURS)) {
      message.textContent = `Enter hours above 0 and at most ${WorkloadWave.MAX_HOURS}.`;
      return;
    }
    setSizeOverride(task.id, hours);
  });

  row.append(heading, meta, status, form, message);
  return row;
}

function createDayPanel(key, bucket) {
  const panel = document.createElement('section');
  panel.className = 'wave-day';
  const heading = document.createElement('h3');
  const sized = bucket.segments.reduce((sum, segment) => sum + segment.hours, 0);
  heading.textContent = sized ? `${bucketLabel(key)} · ${WorkloadWave.formatHours(sized)}` : bucketLabel(key);
  // Largest first, then the unestimated work that needs a size.
  panel.append(heading, ...bucketTasks(bucket).map(createSizeRow));
  return panel;
}

function syncWaveToolbar(wave) {
  document.querySelectorAll('#wave-range button').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.days) === waveRangeDays));
  });
  const toggle = document.getElementById('wave-late-toggle');
  const lateCount = wave.includeOverdue ? bucketTasks(wave.overdue).length : wave.hiddenOverdueCount;
  toggle.hidden = lateCount === 0;
  toggle.setAttribute('aria-pressed', String(waveShowLate));
  toggle.textContent = `${waveShowLate ? 'Hide' : 'Show'} late work (${lateCount})`;
}

function renderWave(data) {
  lastWaveData = data;
  if (!data || waveView.hidden) return;
  loadWavePreferences();
  const timeZone = timelineData?.timeZone || 'America/New_York';
  const wave = WorkloadWave.buildWave(data.groups, sizeOverrides, {
    todayKey: CalendarView.easternDateKey(new Date(), timeZone),
    timeZone,
    horizonDays: waveRangeDays,
    includeOverdue: waveShowLate,
  });
  syncWaveToolbar(wave);
  const chartArea = document.getElementById('wave-chart-area');
  // Drawn at the container's real pixel width so labels stay legible on phones.
  const width = Math.max(chartArea.clientWidth, 300);
  chartArea.replaceChildren(createWaveChart(wave, width));

  const note = document.getElementById('wave-note');
  const notes = [`Pace spreads each task over the ${wave.spreadDays} days before it is due.`];
  if (wave.beyond.count) notes.push(`${wave.beyond.count} more ${wave.beyond.count === 1 ? 'item is' : 'items are'} due later.`);
  note.textContent = notes.join(' ');

  const buckets = new Map(wave.days.map((day) => [day.dateKey, day]));
  if (wave.includeOverdue) buckets.set(LATE_KEY, wave.overdue);
  const bucket = buckets.get(selectedWaveDay);
  const detail = document.getElementById('wave-detail-area');
  if (bucket && bucketTasks(bucket).length) detail.replaceChildren(createDayPanel(selectedWaveDay, bucket));
  else {
    selectedWaveDay = undefined;
    const hint = document.createElement('p');
    hint.className = 'wave-hint';
    hint.textContent = 'Select a day to see what is due and adjust its sizes.';
    detail.replaceChildren(hint);
  }

  if (displayMode === 'wave') {
    const unsized = wave.unsizedCount ? ` · ${wave.unsizedCount} not estimated` : '';
    const range = waveRangeDays % 7 === 0 ? `${waveRangeDays / 7} ${waveRangeDays === 7 ? 'week' : 'weeks'}` : `${waveRangeDays} days`;
    timelineSummary.textContent = `${WorkloadWave.formatHours(wave.totalHours)} of work in the next ${range}${unsized} · ${formatUpdated(data.syncedAt || data.generatedAt)}`;
  }
}

document.querySelectorAll('#wave-range button').forEach((button) => {
  button.addEventListener('click', () => {
    loadWavePreferences();
    waveRangeDays = WorkloadWave.parseRange(button.dataset.days);
    saveWavePreference(waveRangeStorageKey(), waveRangeDays);
    renderWave(lastWaveData);
  });
});

document.getElementById('wave-late-toggle').addEventListener('click', () => {
  loadWavePreferences();
  waveShowLate = !waveShowLate;
  saveWavePreference(waveLateStorageKey(), waveShowLate);
  renderWave(lastWaveData);
});

let waveResizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(waveResizeFrame);
  waveResizeFrame = requestAnimationFrame(() => renderWave(lastWaveData));
});
