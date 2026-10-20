const assert = require('node:assert/strict');
function element() {
  return { children: [], hidden: false, textContent: '', append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; } };
}
const grid = element();
const empty = element();
global.window = {};
global.document = {
  getElementById: id => id === 'assessments-grid' ? grid : empty,
  createElement: element,
};
require('../assessment-overview.js');
window.AssessmentOverview.render({ courses: [{ title: 'Example', sections: [{ items: [
  { title: 'Private exam', date: 'Oct 5', showInAssessmentOverview: true },
  { title: 'Reading', date: 'Oct 4' },
] }] }] });
assert.equal(grid.children.length, 1);
assert.equal(grid.children[0].children.length, 2);
assert.equal(grid.children[0].children[1].textContent, 'Private exam · Oct 5');
assert.equal(empty.hidden, true);
window.AssessmentOverview.render(undefined);
assert.equal(grid.children.length, 0);
assert.equal(empty.hidden, false);
console.log('Assessment overview checks passed');
