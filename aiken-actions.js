/* Shared destination picker for timeline and graded coursework. */
window.AikenActions = (() => {
  // Shown when the automatic handoff cannot finish: either the clipboard
  // refused the write (the message is shown for manual copying) or the popup
  // was blocked (the message is already copied; the user opens Aiken here).
  function showFallback(message, trigger, copied) {
    const dialog = document.createElement('dialog');
    const heading = document.createElement('h2');
    heading.textContent = copied ? 'Message copied — open Aiken Chat' : 'Copy your message to Aiken Chat';
    const text = document.createElement('textarea');
    text.value = message;
    text.readOnly = true;
    text.setAttribute('aria-label', 'Coursework message');
    const link = document.createElement('a');
    link.href = AikenIntegration.AIKEN_APP_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open Aiken Chat';
    link.addEventListener('click', () => dialog.close());
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); trigger.focus(); });
    dialog.className = 'aiken-copy-dialog';
    dialog.append(heading, text, link, close);
    document.body.append(dialog);
    dialog.showModal();
    if (copied) link.focus();
    else { text.focus(); text.select(); }
  }

  async function openChat(tasks, trigger) {
    const message = AikenIntegration.buildChatMessage(tasks);
    // Must run straight from the click handler (no await before this call) so
    // the clipboard write still counts as part of the user's gesture.
    const result = await AikenIntegration.copyThenOpen(message, {
      writeText: (value) => navigator.clipboard.writeText(value),
      open: (url, target) => window.open(url, target),
    });
    if (!result.copied || !result.opened) {
      showFallback(message, trigger, result.copied);
      return;
    }
    const original = trigger.textContent;
    trigger.textContent = 'Copied — paste into Aiken Chat';
    setTimeout(() => { trigger.textContent = original; }, 4000);
  }

  function create(task) {
    const picker = document.createElement('details');
    picker.className = 'aiken-destination';
    const summary = document.createElement('summary');
    summary.className = 'aiken-task-link';
    summary.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>';
    summary.title = 'Add to Aiken';
    summary.setAttribute('aria-label', `Add ${task.title} to Aiken Dewit`);
    const choices = document.createElement('div');
    choices.className = 'aiken-destination-choices';
    const chat = document.createElement('button');
    chat.type = 'button';
    chat.textContent = 'Plan in Aiken Chat';
    chat.title = 'Copies a message with this task, then opens Aiken Chat for you to paste it';
    chat.addEventListener('click', () => openChat([task], chat));
    const draft = document.createElement('a');
    draft.href = AikenIntegration.buildTaskUrl(task);
    draft.target = '_blank';
    draft.rel = 'noopener noreferrer';
    draft.textContent = 'New task in Aiken';
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
