// tree-loader.js
fetch("/api/user")
  .then(res => res.json())
  .then(user => {
    const side = user.side.replace(/ /g, "_").toLowerCase();
    const gedcomPath = `/gedcom/${side}.json`;
    return fetch(gedcomPath);
  })
  .then(res => res.json())
  .then(data => {
    FamilyTree.SE.spacing = 60;
    const tree = new FamilyTree(document.getElementById("tree"), {
      mode: "light",
      nodeBinding: {
        field_0: "name",
        img_0: "photo"
      },
      nodes: data
    });
  })
  .catch(err => {
    document.getElementById("tree").innerHTML = "<p style='text-align:center;color:red;'>לא ניתן לטעון את האילן המשפחתי.</p>";
    console.error("שגיאה בטעינת עץ:", err);
  });
