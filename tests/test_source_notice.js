const test = require('node:test');
const assert = require('node:assert/strict');
const { createSourceNotice } = require('../ui/source-notice.js');

function element(tagName) {
  return {
    tagName, children: [], attributes: {}, listeners: {}, textContent: '',
    classList: { add() {} },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; this.textContent = ''; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    click() { this.listeners.click(); },
  };
}
global.document = { createElement: element };

const fileWarning = 'Robotics: could not read files (CourseWorks API request failed with HTTP 403)';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

function setup(isDemo = false, storage = memoryStorage()) {
  global.localStorage = storage;
  const container = element('div');
  return { container, render: createSourceNotice(container, { isDemo }) };
}

function dismiss(container) {
  const button = container.children[0].children.find(child => child.tagName === 'button');
  assert.equal(button.attributes['aria-label'], 'Dismiss source availability notice');
  assert.equal(button.type, 'button');
  button.click();
}

test('source details remain expandable with a separate dismiss button', () => {
  const { container, render } = setup();
  render([fileWarning]);
  const details = container.children[0].children.find(child => child.tagName === 'details');
  assert.equal(details.children[0].tagName, 'summary');
  assert.equal(details.children[0].children[0].textContent, 'Source availability');
  assert.equal(details.children[0].children[1].textContent, '1 file list unavailable');
  dismiss(container);
  assert.equal(container.children.length, 0);
});

test('dismissed warnings stay hidden on re-render, but refresh shows them again', () => {
  const { container, render } = setup();
  render([fileWarning]);
  dismiss(container);
  render([fileWarning, fileWarning]);
  assert.equal(container.children.length, 0);
  render([fileWarning], { refreshed: true });
  assert.equal(container.children.length, 1);
});

test('changed warnings stay dismissed until another sync', () => {
  const { container, render } = setup();
  const warning = 'Canvas assignments unavailable';
  render([fileWarning, warning]);
  dismiss(container);
  render([warning, fileWarning]);
  assert.equal(container.children.length, 0);
  render(['Ed discussions unavailable']);
  assert.equal(container.children.length, 0);
});

test('dismissal survives page reloads until the snapshot has a new sync timestamp', () => {
  const storage = memoryStorage();
  const first = setup(false, storage);
  first.render([fileWarning], { syncId: 'first-sync' });
  dismiss(first.container);
  const reloaded = setup(false, storage);
  reloaded.render([fileWarning], { syncId: 'first-sync' });
  assert.equal(reloaded.container.children.length, 0);
  reloaded.render([fileWarning], { syncId: 'next-sync' });
  assert.equal(reloaded.container.children.length, 1);
  const afterSync = setup(false, storage);
  afterSync.render([fileWarning], { syncId: 'next-sync' });
  assert.equal(afterSync.container.children.length, 1);
});

test('a failed refresh does not forget dismissal and a successful sync does', () => {
  const storage = memoryStorage();
  const { container, render } = setup(false, storage);
  render([fileWarning], { syncId: 'same-sync' });
  dismiss(container);
  render();
  const reloaded = setup(false, storage);
  reloaded.render([fileWarning], { syncId: 'same-sync' });
  assert.equal(reloaded.container.children.length, 0);
  reloaded.render([], { refreshed: true, syncId: 'next-sync' });
  const afterSync = setup(false, storage);
  afterSync.render([fileWarning], { syncId: 'next-sync' });
  assert.equal(afterSync.container.children.length, 1);
});

test('demo dismissal does not hide the personal dashboard notice', () => {
  const storage = memoryStorage();
  const demo = setup(true, storage);
  demo.render([fileWarning]);
  dismiss(demo.container);
  const personal = setup(false, storage);
  personal.render([fileWarning]);
  assert.equal(personal.container.children.length, 1);
});

test('dismissal still works for this page when browser storage is unavailable', () => {
  const unavailable = () => { throw new Error('Storage blocked'); };
  const { container, render } = setup(false, {
    getItem: unavailable, setItem: unavailable, removeItem: unavailable,
  });
  render([fileWarning]);
  dismiss(container);
  render(['Changed warning']);
  assert.equal(container.children.length, 0);
  render([fileWarning], { refreshed: true });
  assert.equal(container.children.length, 1);
});

test('empty and invalid warnings are safe and successful refreshes retain feedback', () => {
  const { container, render } = setup();
  render([null, 42]);
  assert.equal(container.children.length, 0);
  render(undefined, { refreshed: true });
  assert.equal(container.textContent, 'Coursework refreshed.');
  const demo = setup(true);
  demo.render([], { refreshed: true });
  assert.equal(demo.container.textContent, 'Demo reset.');
});
