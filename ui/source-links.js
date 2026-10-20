function safeSourceRecords(records) {
  return (records || []).filter(record => {
    try {
      const url = new URL(record.url);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch (_error) { return false; }
  });
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
  safeSourceRecords(records).forEach((record) => {
    const link = createSourceAnchor(record, context);
    link.className = 'source-button';
    link.textContent = record.label;
    container.append(link);
  });
  return container;
}
