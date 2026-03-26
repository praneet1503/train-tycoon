const map = L.map('map').setView([20.5937,78.9629],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);
window.trainTycoonMap = map;

const BASE_DISTANCE = 2000;
const BASE_COST = 200000;
const BASE_TIME = 10;
const MS_PER_GAME_DAY = 60000;
const TRAIN_UPDATE_INTERVAL_MS = 50;
const BASE_TRIP_TIME_DAYS = 5;

const routes = [];
const trains = [];
let stationsCache = [];
let pendingRoute = null;
let playerMoney = 1000000;
let trainIdCounter = 1;

const fromStationSelect = document.getElementById('fromStation');
const toStationSelect = document.getElementById('toStation');
const calculateRouteBtn = document.getElementById('calculateRouteBtn');
const buildRouteBtn = document.getElementById('buildRouteBtn');
const routeDistanceEl = document.getElementById('routeDistance');
const routeCostEl = document.getElementById('routeCost');
const routeTimeEl = document.getElementById('routeTime');
const routeStatusEl = document.getElementById('routeStatus');
const gameDayEl = document.getElementById('gameDay');
const playerMoneyEl = document.getElementById('playerMoney');
const incomePopupContainerEl = document.getElementById('incomePopupContainer');

let currentGameDay = 0;

const smallIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [14, 22],
  iconAnchor: [7, 22],
  popupAnchor: [0, -22],
});

const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = value => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function scaleToGame(distance) {
  const factor = distance / BASE_DISTANCE;

  const cost = Math.floor(BASE_COST * factor);
  const time = Math.max(1, Math.floor(BASE_TIME * factor));

  return { cost, time };
}

const renderRoute = (fromStation, toStation) => {
  return L.polyline([
    [fromStation.lat, fromStation.lng],
    [toStation.lat, toStation.lng],
  ], {
    color: 'orange',
    weight: 5,
  }).addTo(map);
};

const getStationById = stationId => {
  return stationsCache.find(station => String(station.id) === String(stationId));
};

const routeExists = (a, b) => {
  return routes.some(route =>
    (route.from === a.id && route.to === b.id) ||
    (route.from === b.id && route.to === a.id)
  );
};

const formatNumber = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatCurrency = value => '$' + Math.round(value).toLocaleString();

const generateRouteId = route => {
  if (route.id) return route.id;
  return `route_${route.from}_${route.to}_${route.startDay}`;
};

const getRouteById = routeId => {
  return routes.find(route => route.id === routeId) || null;
};

const getTrainByRouteId = routeId => {
  return trains.find(train => train.routeId === routeId) || null;
};

const interpolatePosition = (from, to, t) => {
  return [
    from.lat + (to.lat - from.lat) * t,
    from.lng + (to.lng - from.lng) * t,
  ];
};

const calculateIncome = distance => {
  const BASE_INCOME = 5000;
  return Math.floor(BASE_INCOME * (distance / 500));
};

const updateMoneyUI = () => {
  if (playerMoneyEl) {
    playerMoneyEl.textContent = formatCurrency(playerMoney);
  }
};

const showIncomePopup = income => {
  if (!incomePopupContainerEl) return;

  const popup = document.createElement('div');
  popup.className = 'income-popup';
  popup.textContent = `+${formatCurrency(income)}`;
  incomePopupContainerEl.appendChild(popup);

  requestAnimationFrame(() => {
    popup.classList.add('income-popup-visible');
  });

  setTimeout(() => {
    popup.classList.remove('income-popup-visible');
    popup.classList.add('income-popup-hide');
  }, 1000);

  setTimeout(() => {
    popup.remove();
  }, 1500);
};

const onTripCompleted = train => {
  const route = getRouteById(train.routeId);
  if (!route) return;

  const income = calculateIncome(route.distance);
  playerMoney += income;
  updateMoneyUI();
  showIncomePopup(income);
};

function createTrain(route) {
  if (!route || route.status !== 'active') return null;
  if (getTrainByRouteId(route.id)) return null;

  const from = getStationById(route.from);
  const to = getStationById(route.to);
  if (!from || !to) return null;

  const marker = L.circleMarker([from.lat, from.lng], {
    radius: 6,
    color: '#ffffff',
    fillColor: '#ffd60a',
    fillOpacity: 0.95,
    weight: 2,
    pane: 'markerPane',
  }).addTo(map);

  marker.bindTooltip(`Train ${trainIdCounter}: ${route.fromName} <-> ${route.toName}`, {
    direction: 'top',
    opacity: 0.9,
    offset: [0, -6],
  });

  const speed = 1 / (BASE_TRIP_TIME_DAYS * MS_PER_GAME_DAY / TRAIN_UPDATE_INTERVAL_MS);

  const train = {
    id: trainIdCounter++,
    routeId: route.id,
    progress: 0,
    speed,
    direction: 1,
    marker,
  };

  trains.push(train);
  return train;
}

function updateTrains() {
  trains.forEach(train => {
    const route = getRouteById(train.routeId);
    if (!route || route.status !== 'active') return;

    const from = getStationById(route.from);
    const to = getStationById(route.to);
    if (!from || !to) return;

    train.progress += train.speed * train.direction;

    if (train.progress >= 1) {
      train.progress = 1;
      train.direction = -1;
      onTripCompleted(train);
    }

    if (train.progress <= 0) {
      train.progress = 0;
      train.direction = 1;
      onTripCompleted(train);
    }

    const interpolatedPosition = interpolatePosition(from, to, train.progress);
    train.marker.setLatLng(interpolatedPosition);
  });
}

const spawnTrainsForActiveRoutes = () => {
  routes.forEach(route => {
    if (route.status === 'active') {
      createTrain(route);
    }
  });
};

const clearRouteStats = () => {
  routeDistanceEl.textContent = '--';
  routeCostEl.textContent = '--';
  routeTimeEl.textContent = '--';
};

const setRouteStatus = message => {
  routeStatusEl.textContent = message || '';
};

function saveGameState() {
  const state = {
    currentGameDay,
    playerMoney,
    routes: routes.map(r => ({
      id: r.id,
      from: r.from,
      to: r.to,
      fromName: r.fromName,
      toName: r.toName,
      distance: r.distance,
      cost: r.cost,
      buildTime: r.buildTime,
      startDay: r.startDay,
      endDay: r.endDay,
      status: r.status,
    }))
  };
  localStorage.setItem('trainTycoonState', JSON.stringify(state));
}

function loadGameState() {
  try {
    const saved = localStorage.getItem('trainTycoonState');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.currentGameDay) {
        currentGameDay = state.currentGameDay;
      }
      if (typeof state.playerMoney === 'number') {
        playerMoney = state.playerMoney;
      }
      if (state.routes) {
        state.routes.forEach(r => {
          const fromStation = getStationById(r.from);
          const toStation = getStationById(r.to);
          if (fromStation && toStation) {
            const line = renderRoute(fromStation, toStation);
            if (r.status === 'building') {
              line.setStyle({ dashArray: '8 6' });
            } else {
              line.setStyle({ color: '#30d158', dashArray: null });
            }
            routes.push({
              ...r,
              id: generateRouteId(r),
              line
            });
          }
        });
      }
      spawnTrainsForActiveRoutes();
      updateGameClockUI();
      updateMoneyUI();
      updateBuildStatusUI();
    }
  } catch (e) {
    console.warn('Failed to load game state', e);
  }
}

const updateGameClockUI = () => {
  if (gameDayEl) {
    gameDayEl.textContent = currentGameDay.toLocaleString();
  }
};

const getLatestBuildingRoute = () => {
  return routes.find(route => route.status === 'building') || null;
};

const updateBuildStatusUI = () => {
  const buildingRoute = getLatestBuildingRoute();
  if (!buildingRoute) return;

  const daysRemaining = Math.max(0, buildingRoute.endDay - currentGameDay);
  setRouteStatus(
    daysRemaining > 0
      ? `Building... ${daysRemaining} days remaining`
      : 'Route Active'
  );
};

const onRouteCompleted = route => {
  if (route.line) {
    route.line.setStyle({ color: '#30d158', dashArray: null });
  }
  createTrain(route);
  setRouteStatus('Route Active');
};

function startGameClock() {
  updateGameClockUI();
  setInterval(() => {
    currentGameDay++;
    updateGameClockUI();
    updateBuildStatusUI();
    saveGameState();
  }, MS_PER_GAME_DAY);
}

function checkRouteCompletion() {
  let changed = false;
  routes.forEach(route => {
    if (route.status === 'building' && currentGameDay >= route.endDay) {
      route.status = 'active';
      onRouteCompleted(route);
      changed = true;
    }
  });

  updateBuildStatusUI();
  if (changed) {
    saveGameState();
  }
}

const populateStationSelectors = stations => {
  const options = stations
    .map(station => `<option value="${station.id}">${station.name}</option>`)
    .join('');

  fromStationSelect.innerHTML = options;
  toStationSelect.innerHTML = options;

  if (stations.length > 1) {
    toStationSelect.selectedIndex = 1;
  }
};

const calculateSelectedRoute = () => {
  const from = getStationById(fromStationSelect.value);
  const to = getStationById(toStationSelect.value);

  if (!from || !to) {
    pendingRoute = null;
    clearRouteStats();
    buildRouteBtn.disabled = true;
    setRouteStatus('Please select both stations.');
    return;
  }

  if (from.id === to.id) {
    pendingRoute = null;
    clearRouteStats();
    buildRouteBtn.disabled = true;
    setRouteStatus('From and To stations must be different.');
    return;
  }

  const distance = getDistance(from.lat, from.lng, to.lat, to.lng);
  const { cost, time } = scaleToGame(distance);

  pendingRoute = { from, to, distance, cost, buildTime: time };
  routeDistanceEl.textContent = formatNumber(distance) + ' km';
  routeCostEl.textContent = formatCurrency(cost);
  routeTimeEl.textContent = formatNumber(time) + ' days';
  buildRouteBtn.disabled = false;
  setRouteStatus('Route calculated. Ready to build.');
};

function buildRoute() {
  if (!pendingRoute) {
    setRouteStatus('Calculate a route first.');
    return;
  }

  const { from, to, distance, cost, buildTime } = pendingRoute;
  if (routeExists(from, to)) {
    setRouteStatus('This route has already been built.');
    return;
  }

  const startDay = currentGameDay;
  const endDay = currentGameDay + buildTime;
  const line = renderRoute(from, to);
  line.setStyle({ dashArray: '8 6' });

  routes.push({
    id: generateRouteId({ from: from.id, to: to.id, startDay }),
    from: from.id,
    to: to.id,
    fromName: from.name,
    toName: to.name,
    distance,
    cost,
    buildTime,
    startDay,
    endDay,
    status: 'building',
    line,
  });

  buildRouteBtn.disabled = true;
  updateBuildStatusUI();
  saveGameState();
}

async function loadStations() {
  const res = await fetch('stations.json');
  return await res.json();
}

async function initStations() {
  const stations = await loadStations();
  let firstMarker = null;

  stations.forEach(station => {
    const marker = L.marker([station.lat, station.lng], { icon: smallIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size:12px;line-height:1.2;">
          <strong style="margin:0;font-size:13px">${station.name}</strong>
          <div style="margin-top:4px;opacity:0.8">ID: ${station.id}</div>
        </div>
        `, { maxWidth: 160 });

    marker.on('click', () => marker.openPopup());

    if (!firstMarker) firstMarker = marker;
  });

  stationsCache = stations;
  window._stations = stations;
  populateStationSelectors(stations);

  loadGameState();

  clearRouteStats();
  updateMoneyUI();
  setRouteStatus('Select stations, then click Calculate Route.');

  if (stations.length > 0) {
    map.fitBounds(stations.map(s => [s.lat, s.lng]), { padding: [40, 40] });
  }

  if (firstMarker) {
    firstMarker.openPopup();
  } else {
    L.popup({ closeButton: false, autoClose: false })
      .setLatLng(map.getCenter())
      .setContent('No stations found. Click on a marker to open its popup.')
      .openOn(map);
  }
}

initStations();
startGameClock();
setInterval(checkRouteCompletion, 1000);
setInterval(updateTrains, TRAIN_UPDATE_INTERVAL_MS);

calculateRouteBtn.addEventListener('click', calculateSelectedRoute);
buildRouteBtn.addEventListener('click', buildRoute);

const handleRouteSelectionChange = () => {
  pendingRoute = null;
  buildRouteBtn.disabled = true;
  clearRouteStats();
  setRouteStatus('Selection changed. Click Calculate Route.');
};

fromStationSelect.addEventListener('change', handleRouteSelectionChange);
toStationSelect.addEventListener('change', handleRouteSelectionChange);