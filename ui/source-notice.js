function createSourceNotice(container, { isDemo = false, onDismiss = () => {} } = {}) {
  const storageKey = isDemo ? 'courseworks-demo-dismissed-source-sync' : 'courseworks-dismissed-source-sync';
  let storage;
  let dismissedSyncId = null;
  try {
    storage = globalThis.localStorage;
    dismissedSyncId = storage?.getItem(storageKey) ?? null;
  } catch (_error) {
    // Dismissal still works for this page when browser storage is unavailable.
  }

  function rememberDismissal(syncId) {
    dismissedSyncId = syncId;
    try {
      if (syncId === null) storage?.removeItem(storageKey);
      else storage?.setItem(storageKey, syncId);
    } catch (_error) {
      // Keep the in-memory preference when storage is blocked or full.
    }
  }

  return function renderRefreshStatus(warnings = [], { refreshed = false, syncId } = {}) {
    container.replaceChildren();
    container.className = 'sync-message';
    const currentSyncId = syncId ?? dismissedSyncId ?? '';
    if (refreshed || (syncId !== undefined && dismissedSyncId !== null && syncId !== dismissedSyncId)) {
      rememberDismissal(null);
    }
    const messages = [...new Set((Array.isArray(warnings) ? warnings : [])
      .filter((warning) => typeof warning === 'string'))];
    if (!messages.length) {
      if (refreshed) container.textContent = isDemo ? 'Demo reset.' : 'Coursework refreshed.';
      return;
    }

    if (currentSyncId === dismissedSyncId) return;

    const filePattern = /^(.+): could not read files \(CourseWorks API request failed with HTTP 403\)$/;
    const fileCourses = [];
    const otherWarnings = [];
    messages.forEach((message) => {
      const match = filePattern.exec(message);
      if (match) fileCourses.push(match[1]);
      else otherWarnings.push(message);
    });

    const notice = document.createElement('details');
    notice.className = 'sync-notice';
    if (otherWarnings.length) notice.classList.add('sync-notice--warning');
    const summary = document.createElement('summary');
    const title = document.createElement('span');
    title.className = 'sync-notice-title';
    title.textContent = otherWarnings.length
      ? (refreshed ? 'Refreshed with source gaps' : 'Some sources unavailable')
      : (refreshed ? 'Coursework refreshed' : 'Source availability');
    const count = document.createElement('span');
    count.className = 'sync-notice-count';
    count.textContent = otherWarnings.length
      ? `${messages.length} source ${messages.length === 1 ? 'notice' : 'notices'}`
      : `${fileCourses.length} file ${fileCourses.length === 1 ? 'list' : 'lists'} unavailable`;
    summary.append(title, count);

    const body = document.createElement('div');
    body.className = 'sync-notice-body';
    const appendList = (parent, items) => {
      const list = document.createElement('ul');
      items.forEach((item) => {
        const entry = document.createElement('li');
        entry.textContent = item;
        list.append(entry);
      });
      parent.append(list);
    };
    if (fileCourses.length) {
      const explanation = document.createElement('p');
      explanation.textContent = 'These courses may have no files, or CourseWorks may restrict access to their file list. We couldn’t check which applies.';
      body.append(explanation);
      appendList(body, fileCourses);
    }
    if (otherWarnings.length) {
      const label = document.createElement('p');
      label.textContent = 'Other sources that could not be fully refreshed:';
      body.append(label);
      appendList(body, otherWarnings);
    }
    const technical = document.createElement('details');
    technical.className = 'sync-notice-technical';
    const technicalSummary = document.createElement('summary');
    technicalSummary.textContent = 'Technical details';
    technical.append(technicalSummary);
    appendList(technical, messages);
    body.append(technical);
    notice.append(summary, body);
    const wrapper = document.createElement('div');
    wrapper.className = 'sync-notice-wrapper';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'sync-notice-dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss source availability notice');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => {
      rememberDismissal(currentSyncId);
      container.replaceChildren();
      onDismiss();
    });
    wrapper.append(notice, dismiss);
    container.append(wrapper);
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createSourceNotice };
