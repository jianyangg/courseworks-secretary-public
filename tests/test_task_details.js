const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskDetails } = require('../ui/task-details.js');

function element(tagName) {
  return {
    tagName, children: [], attributes: {}, textContent: '',
    append(...children) { this.children.push(...children); },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}
global.document = { createElement: element };

function text(node) {
  return [node.textContent, ...node.children.map(text)].join(' ');
}

test('tasks without extra information have no empty disclosure', () => {
  assert.equal(createTaskDetails({ title: 'Homework' }), null);
});

test('instructions use a native disclosure with task context and safely rendered text', () => {
  const instructions = '<img src=x onerror=alert(1)>\nInclude the data notes.';
  const disclosure = createTaskDetails({ title: 'Dashboard', detail: instructions });
  assert.equal(disclosure.tagName, 'details');
  assert.equal(disclosure.children[0].tagName, 'summary');
  assert.equal(disclosure.children[0].attributes['aria-label'], 'Instructions for Dashboard');
  assert.match(text(disclosure.children[0]), /View instructions/);
  assert.match(text(disclosure.children[0]), /Hide instructions/);
  assert.equal(disclosure.children[1].children[0].textContent, instructions);
  assert.equal(disclosure.children[1].children[0].innerHTML, undefined);
});

test('deadline conflicts stay prominent and show both sources in the configured timezone', () => {
  const disclosure = createTaskDetails({
    title: 'Project', detail: 'Submit the report.', guideTitle: 'Reviewed project title',
    deadlineConflict: { synced: '2026-10-20T12:00:00Z', reviewed: '2026-10-21T12:00:00Z' },
  }, 'America/Los_Angeles');
  assert.equal(disclosure.children[0].attributes['aria-label'], 'Review deadline for Project');
  assert.match(text(disclosure.children[0]), /Review deadline/);
  assert.match(text(disclosure.children[1]), /Canvas lists Oct 20, 2026, 5:00 AM/);
  assert.match(text(disclosure.children[1]), /reviewed guide lists Oct 21, 2026, 5:00 AM/);
  assert.match(text(disclosure.children[1]), /timeline uses the Canvas deadline/);
  assert.match(text(disclosure.children[1]), /Reviewed project title/);
  assert.match(text(disclosure.children[1]), /Submit the report/);
});

test('a guide title alone is labelled as a guide note', () => {
  const disclosure = createTaskDetails({ title: 'Problem set', guideTitle: 'Weekly work' });
  assert.equal(disclosure.children[0].attributes['aria-label'], 'Guide note for Problem set');
  assert.match(text(disclosure.children[1]), /Reviewed guide: Weekly work/);
});
