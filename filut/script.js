document.addEventListener('DOMContentLoaded', async () => {
  // Leaflet map initialization
  const map = L.map('map').setView([60.17, 24.94], 12); // Centered on Helsinki
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Fetching restaurant data and creating table
  const restaurants = await fetchRestaurants();
  sortRestaurants(restaurants);
  createTable(restaurants);
  createCityFilter(restaurants);

  // Add markers to map for each restaurant
  addMarkersToMap(restaurants, map);

  // Highlight nearest restaurant
  highlightNearestRestaurant(restaurants, map);

  // Add user location marker
  addCurrentUserLocationMarker(map);
});

const addCurrentUserLocationMarker = (map) => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLatLng = [position.coords.latitude, position.coords.longitude];
      const userMarker = L.circleMarker(userLatLng, {
        radius: 8,
        color: 'blue',
        fillOpacity: 0.7,
      }).addTo(map);
      userMarker.bindPopup('Your Location');
    });
  } else {
    console.log('Geolocation is not available');
  }
};

const makeFetch = async (url) => {
  const result = await fetch(url);
  return await result.json();
};

const fetchRestaurants = async () =>
  await makeFetch('https://10.120.32.94/restaurant/api/v1/restaurants');

const fetchDailyMenu = async (id) =>
  makeFetch(
    `https://10.120.32.94/restaurant/api/v1/restaurants/daily/${id}/fi`
  );

const fetchMenuByDate = async (id, date) =>
  makeFetch(
    `https://10.120.32.94/restaurant/api/v1/restaurants/menu/${id}/fi?date=${date}`
  );

const sortRestaurants = (restaurants) => {
  restaurants.sort((a, b) =>
    a.name.toLowerCase().trim().localeCompare(b.name.toLowerCase().trim())
  );
};

const createPhoneLink = (phone) => {
  const cleanedNumber = phone.replaceAll(' ', '').replace(/[a-zA-Z-]+/g, '');
  return `<a href="tel:${cleanedNumber}">${cleanedNumber}</a>`;
};

const highlightNearestRestaurant = async (restaurants, map) => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const userLatLng = [position.coords.latitude, position.coords.longitude];

      let nearestDistance = Infinity;
      let nearestRestaurant = null;

      restaurants.forEach((restaurant) => {
        const {coordinates} = restaurant.location;
        const restaurantLatLng = [coordinates[1], coordinates[0]];
        const distance = L.latLng(userLatLng).distanceTo(restaurantLatLng);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestRestaurant = restaurant;
        }
      });

      if (nearestRestaurant) {
        const {coordinates} = nearestRestaurant.location;
        map.setView([coordinates[1], coordinates[0]], 12);
        const marker = L.marker([coordinates[1], coordinates[0]], {
          icon: L.divIcon({className: 'nearest-restaurant-icon'}),
        }).addTo(map);
        marker.bindPopup(
          `<b>${nearestRestaurant.name}</b><br>${nearestRestaurant.address}`
        );
      }
    });
  } else {
    console.log('Geolocation is not available');
  }
};

const createDialog = (restaurant, dialogNode, menu) => {
  const phone =
    restaurant.phone !== '-' ? createPhoneLink(restaurant.phone) : '';
  dialogNode.innerHTML = `
      <h1>${restaurant.name}</h1>
      <p>${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}</p>
      <p>${restaurant.company} ${phone}</p>


      <ul>
      ${menu.courses
        .map(
          ({name, price, diets}) =>
            `<li>${name} - ${price} (${diets.join(', ')})</li>`
        )
        .join('')}
      </ul>

      <form method="dialog">
      <button>Sulje</button>
      </form>
  `;
  dialogNode.showModal();
};

const handleTableRowClick = async (tr, restaurant, dialogNode) => {
  document.querySelectorAll('tr').forEach((tr) => {
    tr.classList.remove('highlight');
  });

  tr.classList.add('highlight');

  const menu = await fetchDailyMenu(restaurant._id);
  console.log('menu', menu);

  createDialog(restaurant, dialogNode, menu);
};

const createTable = (restaurants) => {
  const tableNode = document.getElementById('restaurant-table');
  const dialogNode = document.getElementById('restaurant-dialog');

  restaurants.forEach((restaurant) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${restaurant.name}</td><td>${restaurant.address}</td>`;
    tableNode.querySelector('tbody').appendChild(tr);

    tr.addEventListener('click', () => {
      handleTableRowClick(tr, restaurant, dialogNode);
    });
  });
};

const addMarkersToMap = (restaurants, map) => {
  restaurants.forEach((restaurant) => {
    const {coordinates} = restaurant.location;
    const marker = L.marker([coordinates[1], coordinates[0]]).addTo(map);
    marker.bindPopup(`<b>${restaurant.name}</b><br>${restaurant.address}`);
  });
};

const createCityFilter = (restaurants) => {
  const uniqueCities = [
    ...new Set(restaurants.map((restaurant) => restaurant.city)),
  ];
  const selectNode = document.getElementById('city-filter');

  uniqueCities.forEach((city) => {
    const optionNode = document.createElement('option');
    optionNode.textContent = city;
    optionNode.value = city;
    selectNode.appendChild(optionNode);
  });

  selectNode.addEventListener('change', () => {
    const selectedCity = selectNode.value;
    const filteredRestaurants = restaurants.filter(
      (restaurant) => restaurant.city === selectedCity
    );
    refreshTable(filteredRestaurants);
  });
};

const refreshTable = (restaurants) => {
  const tableBodyNode = document.querySelector('#restaurant-table tbody');
  tableBodyNode.innerHTML = '';
  restaurants.forEach((restaurant) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${restaurant.name}</td><td>${restaurant.address}</td>`;
    tableBodyNode.appendChild(tr);
  });
};
