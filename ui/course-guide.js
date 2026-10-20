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
  const links = item.links?.length ? item.links : (item.sourceUrl ? [{ label: item.sourceLabel || 'Source', url: item.sourceUrl }] : []);
  if (links.length) {
    copy.append(createSourceButtons(links, item.title, 'guide-item-links'));
  }
  row.append(date, dot, copy);
  return row;
}

function createGuideSection(section) {
  const collapsed = ['Synced announcements', 'Linked assignment resources', 'Linked page resources'].includes(section.label);
  if (collapsed) {
    const disclosure = document.createElement('details');
    disclosure.className = 'guide-source-section';
    const summary = document.createElement('summary');
    summary.textContent = `${section.label} (${section.items?.length || 0})`;
    const items = document.createElement('div');
    items.className = 'guide-items';
    items.append(...(section.items || []).map(createGuideItem));
    disclosure.append(summary, items);
    return disclosure;
  }
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
      if (bullet.url) item.append(createSourceButtons([{ label: 'Source', url: bullet.url }], bullet.text, 'guide-item-links'));
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
  safeSourceRecords(sourceRecords).forEach((record) => {
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
  courseGuideContent.replaceChildren(header, ...(course.sections || []).map(createGuideSection));
  courseGuideTabs.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.courseId === course.id;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
}

function renderCourseGuide(data) {
  guideData = data;
  const reviewed = data.reviewedAt ? new Date(data.reviewedAt) : null;
  courseGuideSummary.textContent = data.isDemo ? 'Example course brief · fictional sources' : reviewed && !Number.isNaN(reviewed.getTime()) ? `Guide reviewed ${new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: data.timeZone || timelineData?.timeZone || 'America/New_York', timeZoneName: 'short',
  }).format(reviewed)}` : 'Synced course information · no reviewed guide yet';
  courseGuideTabs.replaceChildren();
  if (!data.courses?.length) {
    courseGuideContent.textContent = 'No courses have been synced yet. Refresh to load your courses.';
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
