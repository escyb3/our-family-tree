let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 31.7683, lng: 35.2137 }, // ירושלים כמרכז התחלה
    zoom: 4,
    mapTypeId: 'terrain'
  });

  fetch('/api/migration-data')
    .then(response => response.json())
    .then(data => {
      data.forEach(family => {
        drawMigrationPath(family);
        placeEvents(family);
      });
    })
    .catch(error => {
      console.error("שגיאה בטעינת נתוני ההגירה:", error);
    });
}

function drawMigrationPath(family) {
  const coordinates = family.path.map(point => ({ lat: point.lat, lng: point.lng }));
  
  const path = new google.maps.Polyline({
    path: coordinates,
    geodesic: true,
    strokeColor: getColor(family.name),
    strokeOpacity: 0.9,
    strokeWeight: 4
  });

  path.setMap(map);

  // תווית התחלה וסיום
  const start = family.path[0];
  const end = family.path[family.path.length - 1];

  new google.maps.Marker({
    position: { lat: start.lat, lng: start.lng },
    map,
    title: `נקודת התחלה: ${start.place}`,
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  });

  new google.maps.Marker({
    position: { lat: end.lat, lng: end.lng },
    map,
    title: `נקודת סיום: ${end.place}`,
    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
  });
}

function placeEvents(family) {
  family.path.forEach(point => {
    const marker = new google.maps.Marker({
      position: { lat: point.lat, lng: point.lng },
      map,
      title: `${point.type}: ${point.place} (${point.date})`,
      icon: getIconForType(point.type)
    });

    const info = new google.maps.InfoWindow({
      content: `<strong>${family.name}</strong><br>${point.type} ב־${point.place}<br>שנה: ${point.date}`
    });

    marker.addListener("click", () => {
      info.open(map, marker);
    });
  });
}

function getIconForType(type) {
  const icons = {
    "נולדו": "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    "היגרו": "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
    "ברחו": "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
    "עברו": "http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
  };
  return icons[type] || "http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png";
}

function getColor(name) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F39C12", "#8E44AD", "#16A085"];
  return colors[hash % colors.length];
}
