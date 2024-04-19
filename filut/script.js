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

  // Add markers to map for each restaurant
  addMarkersToMap(restaurants, map);
});

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

const sortRestaurants = (restaurants) => {
  restaurants.sort((a, b) =>
    a.name.toLowerCase().trim().localeCompare(b.name.toLowerCase().trim())
  );
};

const createPhoneLink = (phone) => {
  const cleanedNumber = phone.replaceAll(' ', '').replace(/[a-zA-Z-]+/g, '');
  return `<a href="tel:${cleanedNumber}">${cleanedNumber}</a>`;
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
