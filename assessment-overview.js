(function exposeAssessmentOverview(root) {
  function render(guide) {
    const grid = document.getElementById('assessments-grid');
    const cards = [];
    for (const course of guide?.courses || []) {
      const items = (course.sections || []).flatMap(section => section.items || [])
        .filter(item => item.showInAssessmentOverview === true);
      if (!items.length) continue;
      const card = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = course.shortTitle || course.title;
      card.append(heading);
      for (const item of items) {
        const line = document.createElement('span');
        line.textContent = `${item.title} · ${item.date || item.dueOn || 'Date to be confirmed'}`;
        card.append(line);
      }
      cards.push(card);
    }
    grid.replaceChildren(...cards);
    document.getElementById('assessments-empty').hidden = cards.length > 0;
  }
  root.AssessmentOverview = { render };
})(window);
