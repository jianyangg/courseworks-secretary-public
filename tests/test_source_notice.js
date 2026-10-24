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

function setup(isDemo = false) {
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

test('changed warnings are shown after dismissal, independent of warning order', () => {
  const { container, render } = setup();
  const warning = 'Canvas assignments unavailable';
  render([fileWarning, warning]);
  dismiss(container);
  render([warning, fileWarning]);
  assert.equal(container.children.length, 0);
  render(['Ed discussions unavailable']);
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
