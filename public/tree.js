document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/family-tree")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("tree-container");
      container.innerHTML = renderTree(data);
    });

  function renderTree(data) {
    if (!data || !data.name) return '';
    let html = `<ul><li>${data.name}`;
    if (data.children && data.children.length > 0) {
      html += '<ul>';
      data.children.forEach(child => {
        html += `<li>${renderTree(child)}</li>`;
      });
      html += '</ul>';
    }
    html += '</li></ul>';
    return html;
  }
});
