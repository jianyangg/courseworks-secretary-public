const test = require('node:test');
const assert = require('node:assert/strict');
const { overviewCourses } = require('../assessment-overview.js');
const now = new Date('2026-10-20T12:00:00Z');

test('groups explicit major assessments from the visible timeline without inventing exams', () => {
  const courses = overviewCourses({ groups: [{ tasks: [
    { id: 'exam', title: 'Exam', course: 'Example', dueAt: '2026-11-01T12:00:00Z', showInAssessmentOverview: true },
    { id: 'exam', title: 'Exam', course: 'Example', dueAt: '2026-11-01T12:00:00Z', showInAssessmentOverview: true },
    { title: 'Homework', course: 'Example', dueAt: '2026-11-01T12:00:00Z', isGraded: true },
    { title: 'Old exam', course: 'Example', dueAt: '2026-10-01T12:00:00Z', showInAssessmentOverview: true },
    { title: 'Prepare for exam', course: 'Example', dueAt: '2026-11-01T12:00:00Z', showInAssessmentOverview: true, isPreparation: true },
  ] }] }, now);
  assert.equal(courses.length, 1);
  assert.deepEqual(courses[0].items.map(item => item.title), ['Exam']);
});

test('an empty timeline has no fabricated assessment cards', () => {
  assert.deepEqual(overviewCourses({ groups: [] }, now), []);
});
