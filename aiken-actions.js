/* Shared destination picker for timeline and graded coursework. */
window.AikenActions = (() => {
  async function openChat(tasks, trigger) {
    const message = AikenIntegration.buildChatMessage(tasks);
    // Open synchronously so browsers do not block the tab after clipboard work.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      await navigator.clipboard.writeText(message);
      if (tab) tab.location.replace(AikenIntegration.AIKEN_APP_URL);
      else window.open(AikenIntegration.AIKEN_APP_URL, '_blank', 'noopener,noreferrer');
      const original = trigger.textContent;
      trigger.textContent = 'Copied — paste into Aiken Chat';
      setTimeout(() => { trigger.textContent = original; }, 4000);
    } catch {
      if (tab) tab.close();
      const dialog = document.createElement('dialog');
      const heading = document.createElement('h2');
      heading.textContent = 'Copy your message to Aiken Chat';
      const text = document.createElement('textarea');
      text.value = message;
      text.readOnly = true;
      text.setAttribute('aria-label', 'Coursework message');
      const link = document.createElement('a');
      link.href = AikenIntegration.AIKEN_APP_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open Aiken Chat';
      const close = document.createElement('button');
      close.textContent = 'Close';
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => { dialog.remove(); trigger.focus(); });
      dialog.className = 'aiken-copy-dialog';
      dialog.append(heading, text, link, close);
      document.body.append(dialog);
      dialog.showModal();
      text.focus();
      text.select();
    }
  }

  function create(task) {
    const picker = document.createElement('details');
    picker.className = 'aiken-destination';
    const summary = document.createElement('summary');
    summary.className = 'aiken-task-link';
    summary.textContent = '+';
    summary.title = 'Add to Aiken';
    summary.setAttribute('aria-label', `Add ${task.title} to Aiken Dewit`);
    const choices = document.createElement('div');
    choices.className = 'aiken-destination-choices';
    const chat = document.createElement('button');
    chat.type = 'button';
    chat.textContent = 'Chat — copy message';
    chat.addEventListener('click', () => openChat([task], chat));
    const draft = document.createElement('a');
    draft.href = AikenIntegration.buildTaskUrl(task);
    draft.target = '_blank';
    draft.rel = 'noopener noreferrer';
    draft.textContent = 'New Task';
    draft.addEventListener('click', () => { picker.open = false; });
    picker.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { picker.open = false; summary.focus(); }
    });
    picker.addEventListener('toggle', () => {
      if (picker.open) document.querySelectorAll('.aiken-destination[open]').forEach((other) => {
        if (other !== picker) other.open = false;
      });
    });
    choices.append(chat, draft);
    picker.append(summary, choices);
    return picker;
  }
  return { create, openChat };
})();
