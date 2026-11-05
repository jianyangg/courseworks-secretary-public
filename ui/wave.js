// Wave view: upcoming work as stacked bars on a time axis that starts today.
// Bar height = hours (the review's estimate, or the viewer's override); a
// second strip underneath shows the daily pace that load implies. All of the
// maths lives in workload-wave.js; this file only draws it.

const SVG_NS = 'http://www.w3.org/2000/svg';
let lastWaveData;

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

// Every bar and unsized marker is a keyboard-operable button, so the chart is
// usable without a pointer.
function makeSelectable(element, task, label) {
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', label);
  element.classList.add('wave-mark');
  element.classList.toggle('is-selected', task.id === selectedWaveTaskId);
  const select = () => {
    selectedWaveTaskId = task.id;
    renderWave(lastWaveData);
    document.getElementById('wave-detail')?.querySelector('input')?.focus();
  };
  element.addEventListener('click', select);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  });
  const title = svgElement('title');
  title.textContent = label;
  element.append(title);
}

function drawStack(svg, segments, unsized, x, barWidth, baseline, scale, unsizedTop) {
  let top = baseline;
  segments.forEach((segment) => {
    const height = segment.hours * scale;
    // A 2px gap separates stacked tasks; tiny tasks keep at least 2px of ink.
    const drawn = Math.max(height - 2, 2);
    const rect = svgElement('rect', {
      x, y: top - drawn, width: barWidth, height: drawn, rx: Math.min(3, barWidth / 3),
      fill: courseColor(segment.task.colorKey || segment.task.course),
    });
    if (segment.source === 'override') rect.classList.add('is-override');
    makeSelectable(rect, segment.task, `${segment.task.title}, ${segment.task.course}, ${WorkloadWave.formatHours(segment.hours)}${segment.source === 'override' ? ' (your size)' : ' (estimated)'}, due ${waveDeadlineLabel(segment.task)}`);
    svg.append(rect);
    top -= height;
  });
  // Unknown sizes are hollow rings below the axis, never a guessed bar.
  unsized.slice(0, 3).forEach((task, index) => {
    const ring = svgElement('circle', {
      cx: x + barWidth / 2, cy: unsizedTop + index * 11, r: 4,
      class: 'wave-unsized', stroke: courseColor(task.colorKey || task.course),
    });
    makeSelectable(ring, task, `${task.title}, ${task.course}, size not estimated, due ${waveDeadlineLabel(task)}`);
    svg.append(ring);
  });
  if (unsized.length > 3) {
    svg.append(svgText(`+${unsized.length - 3}`, { x: x + barWidth / 2, y: unsizedTop + 3 * 11 + 3, class: 'wave-axis-label', 'text-anchor': 'middle' }));
  }
}

function createWaveChart(wave, width) {
  const hasOverdue = wave.overdue.segments.length + wave.overdue.unsized.length > 0;
  const left = 34;
  const right = 8;
  const overdueWidth = hasOverdue ? 30 : 0;
  const plotLeft = left + overdueWidth;
  const dayWidth = (width - plotLeft - right) / wave.horizonDays;
  const barWidth = Math.max(4, Math.min(18, dayWidth * 0.68));
  const top = 14;
  const barBaseline = 190;
  const unsizedTop = barBaseline + 12;
  const axisLabelY = unsizedTop + 42;
  const paceTop = axisLabelY + 26;
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
    svg.append(svgText(WorkloadWave.formatHours(value), { x: left - 6, y: y + 4, class: 'wave-axis-label', 'text-anchor': 'end' }));
  });

  if (hasOverdue) {
    svg.append(svgElement('rect', { x: left, y: top, width: overdueWidth - 4, height: barBaseline - top, class: 'wave-overdue-zone' }));
    drawStack(svg, wave.overdue.segments, wave.overdue.unsized, left + (overdueWidth - 4 - barWidth) / 2, barWidth, barBaseline, scale, unsizedTop);
    svg.append(svgText('Late', { x: left + (overdueWidth - 4) / 2, y: axisLabelY, class: 'wave-axis-label wave-overdue-label', 'text-anchor': 'middle' }));
  }

  wave.days.forEach((day) => {
    const x = plotLeft + day.offset * dayWidth + (dayWidth - barWidth) / 2;
    drawStack(svg, day.segments, day.unsized, x, barWidth, barBaseline, scale, unsizedTop);
  });

  svg.append(svgElement('line', { x1: left, x2: width - right, y1: barBaseline, y2: barBaseline, class: 'wave-baseline' }));
  svg.append(svgElement('line', { x1: plotLeft, x2: plotLeft, y1: top - 6, y2: paceBaseline, class: 'wave-today' }));

  // Week ticks: today, then every seven days.
  for (let offset = 0; offset < wave.horizonDays; offset += 7) {
    const x = plotLeft + offset * dayWidth + dayWidth / 2;
    const label = offset === 0 ? 'Today' : calendarDateLabel(wave.days[offset].dateKey, { month: 'short', day: 'numeric' });
    svg.append(svgText(label, { x, y: axisLabelY, class: 'wave-axis-label', 'text-anchor': offset === 0 ? 'start' : 'middle' }));
  }

  // Daily pace strip, on its own scale (hours per day, not hours).
  const paceCeiling = WorkloadWave.niceCeiling(wave.maxPace);
  const paceScale = (paceBaseline - paceTop) / paceCeiling;
  svg.append(svgText(`${WorkloadWave.formatHours(paceCeiling)}/day`, { x: left - 6, y: paceTop + 4, class: 'wave-axis-label', 'text-anchor': 'end' }));
  svg.append(svgElement('line', { x1: plotLeft, x2: width - right, y1: paceTop, y2: paceTop, class: 'wave-grid' }));
  wave.pace.forEach((day, offset) => {
    if (!(day.hours > 0)) return;
    const barHeight = day.hours * paceScale;
    const rect = svgElement('rect', {
      x: plotLeft + offset * dayWidth + 1, y: paceBaseline - barHeight, width: Math.max(dayWidth - 2, 1), height: barHeight, class: 'wave-pace',
    });
    const title = svgElement('title');
    title.textContent = `${calendarDateLabel(day.dateKey, { weekday: 'short', month: 'short', day: 'numeric' })}: about ${WorkloadWave.formatHours(day.hours)} of work`;
    rect.append(title);
    svg.append(rect);
  });
  svg.append(svgElement('line', { x1: left, x2: width - right, y1: paceBaseline, y2: paceBaseline, class: 'wave-baseline' }));
  return svg;
}

function createSizeEditor(task) {
  const size = WorkloadWave.effectiveSize(task, sizeOverrides);
  const panel = document.createElement('section');
  panel.className = 'wave-detail';
  panel.id = 'wave-detail';
  panel.setAttribute('aria-label', `Size of ${task.title}`);

  const status = document.createElement('p');
  status.className = 'wave-size-status';
  if (!size) status.textContent = 'Not estimated yet. The next course-guide review can estimate it, or enter your own size.';
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
  label.append(input);
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save size';
  const message = document.createElement('p');
  message.className = 'wave-size-message';
  message.setAttribute('role', 'alert');
  form.append(label, save);
  if (size?.source === 'override') {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'wave-size-reset';
    reset.textContent = size.estimate ? 'Use estimate' : 'Clear my size';
    reset.addEventListener('click', () => setSizeOverride(task.id, null));
    form.append(reset);
  }
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

  panel.append(createTask(task), status, form, message);
  return panel;
}

function findWaveTask(wave, taskId) {
  const all = [wave.overdue, ...wave.days].flatMap((bucket) => [
    ...bucket.segments.map((segment) => segment.task), ...bucket.unsized,
  ]);
  return all.find((task) => task.id === taskId);
}

function renderWave(data) {
  lastWaveData = data;
  if (!data || waveView.hidden) return;
  const timeZone = timelineData?.timeZone || 'America/New_York';
  const wave = WorkloadWave.buildWave(data.groups, sizeOverrides, {
    todayKey: CalendarView.easternDateKey(new Date(), timeZone), timeZone,
  });
  const chartArea = document.getElementById('wave-chart-area');
  // Drawn at the container's real pixel width so labels stay legible on phones.
  const width = Math.max(chartArea.clientWidth, 300);
  chartArea.replaceChildren(createWaveChart(wave, width));

  const note = document.getElementById('wave-note');
  const notes = [`Pace spreads each task over the ${wave.spreadDays} days before it is due.`];
  if (wave.beyond.count) notes.push(`${wave.beyond.count} more ${wave.beyond.count === 1 ? 'item is' : 'items are'} due after ${wave.horizonDays} days.`);
  note.textContent = notes.join(' ');

  const detail = document.getElementById('wave-detail-area');
  const selected = selectedWaveTaskId && findWaveTask(wave, selectedWaveTaskId);
  if (selected) detail.replaceChildren(createSizeEditor(selected));
  else {
    const hint = document.createElement('p');
    hint.className = 'wave-hint';
    hint.textContent = 'Select a bar or an empty ring to see its estimate or set your own size.';
    detail.replaceChildren(hint);
  }

  if (displayMode === 'wave') {
    const unsized = wave.unsizedCount ? ` · ${wave.unsizedCount} not estimated` : '';
    timelineSummary.textContent = `${WorkloadWave.formatHours(wave.totalHours)} of work in the next ${wave.horizonDays / 7} weeks${unsized} · ${formatUpdated(data.syncedAt || data.generatedAt)}`;
  }
}

let waveResizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(waveResizeFrame);
  waveResizeFrame = requestAnimationFrame(() => renderWave(lastWaveData));
});
