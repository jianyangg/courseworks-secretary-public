const assert = require('node:assert/strict');
const { buildTaskUrl } = require('../aiken-integration.js');
const task = { title: 'Prepare', dueAt: '2026-10-04T19:00:00-04:00', deadlineAt: '2026-10-05T10:00:00-04:00' };
function due(task) { return new URLSearchParams(new URL(buildTaskUrl(task)).hash.split('?')[1]).get('dueDate'); }
assert.equal(due(task), task.deadlineAt);
assert.equal(due({ ...task, deadlineIsDateOnly: true }), '2026-10-05');
console.log('Preparation handoff checks passed');
