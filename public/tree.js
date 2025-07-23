// tree.js
// עץ משפחה גרפי אינטראקטיבי (מציג עץ ממשפחת המשתמש)
fetch('/gedcom/' + new URLSearchParams(window.location.search).get('family'))
  .then(res => res.text())
  .then(data => {
    const lines = data.split('\n');
    const names = lines.filter(l => l.includes('NAME')).map(l => l.split('NAME ')[1]);
    const container = document.getElementById('tree-container');
    names.forEach(name => {
      const el = document.createElement('div');
      el.className = 'person-box';
      el.innerText = name;
      container.appendChild(el);
    });
  });
