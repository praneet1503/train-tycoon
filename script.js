const map = L.map('map', {
  minZoom: 3,
  maxBoundsViscosity: 1,
  worldCopyJump: true,
}).setView([39.5, -98.35], 4);
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
const STATE_SYNC_INTERVAL_MS = 1000;

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
const runningTrainsListEl = document.getElementById('runningTrainsList');
const buildingRoutesListEl = document.getElementById('buildingRoutesList');
const gameClockCardEl = document.getElementById('gameClock');
const routeBuilderCardEl = document.getElementById('routeBuilder');
const trainPanelCardEl = document.getElementById('trainPanel');
const panelDockEl = document.getElementById('panelDock');
const settingsWrapEl = document.getElementById('settingsWrap');
const settingsBtnEl = document.getElementById('settingsBtn');
const settingsMenuEl = document.getElementById('settingsMenu');
const resetGameBtnEl = document.getElementById('resetGameBtn');
const panelDockButtons = Array.from(document.querySelectorAll('.panel-dock-btn'));

let currentGameDay = 0;
let lastGameDayTickAtMs = Date.now();
let gameClockStarted = false;
let gameClockTimeoutId = null;
let activeDockPanel = null;

const dockPanels = {
  stats: gameClockCardEl,
  routes: routeBuilderCardEl,
  trains: trainPanelCardEl,
};
const dockPanelElements = Object.values(dockPanels).filter(Boolean);

const stationPinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [15, 26],
  
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

const formatDeltaTime = totalMs => {
  const safeMs = Math.max(0, Math.floor(totalMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

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

const getTrainSpeed = () => {
  return 1 / (BASE_TRIP_TIME_DAYS * MS_PER_GAME_DAY / TRAIN_UPDATE_INTERVAL_MS);
};

const updateMoneyUI = (animate = false) => {
  if (playerMoneyEl) {
    playerMoneyEl.textContent = formatCurrency(playerMoney);
    if (animate) {
      playerMoneyEl.classList.remove('money-pulse');
      requestAnimationFrame(() => {
        playerMoneyEl.classList.add('money-pulse');
      });
    }
  }
};

const createPanelItemHTML = (main, meta) => {
  return `
    <li class="panel-item">
      <div class="panel-item-main">${main}</div>
      <div class="panel-item-meta">${meta}</div>
    </li>
  `;
};

const renderRunningTrainsPanel = () => {
  if (!runningTrainsListEl) return;

  if (trains.length === 0) {
    runningTrainsListEl.innerHTML = '<li class="panel-empty">No trains running.</li>';
    return;
  }

  const items = trains
    .map(train => {
      const route = getRouteById(train.routeId);
      if (!route || route.status !== 'active') return null;

      const directionLabel = train.direction === 1
        ? `${route.fromName} -> ${route.toName}`
        : `${route.toName} -> ${route.fromName}`;
      const ticksToStation = train.direction === 1
        ? (1 - train.progress) / train.speed
        : train.progress / train.speed;
      const etaMs = ticksToStation * TRAIN_UPDATE_INTERVAL_MS;

      const progressPercent = Math.max(0, Math.min(100, train.progress * 100));
      return `
        <li class="panel-item">
          <div class="panel-item-main">Train ${train.id}</div>
          <div class="panel-item-meta">Route ${directionLabel}</div>
          <div class="train-progress-track">
            <div class="train-progress-fill" data-progress="${progressPercent.toFixed(2)}"></div>
          </div>
          <div class="panel-item-meta">Progress ${progressPercent.toFixed(1)}% | ETA ${formatDeltaTime(etaMs)}</div>
        </li>
      `;
    })
    .filter(Boolean)
    .join('');

  runningTrainsListEl.innerHTML = items || '<li class="panel-empty">No trains running.</li>';

  runningTrainsListEl.querySelectorAll('.train-progress-fill').forEach(fillEl => {
    const progress = Number(fillEl.getAttribute('data-progress'));
    const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
    fillEl.style.width = `${clamped}%`;
  });
};

const getMsUntilNextGameDay = () => {
  const elapsed = Date.now() - lastGameDayTickAtMs;
  return Math.max(0, MS_PER_GAME_DAY - elapsed);
};

const getRouteBuildRemainingMs = route => {
  const daysRemaining = route.endDay - currentGameDay;
  if (daysRemaining <= 0) return 0;

  const msUntilNextDay = getMsUntilNextGameDay();
  return ((daysRemaining - 1) * MS_PER_GAME_DAY) + msUntilNextDay;
};

const renderBuildingRoutesPanel = () => {
  if (!buildingRoutesListEl) return;

  const buildingRoutes = routes.filter(route => route.status === 'building');
  if (buildingRoutes.length === 0) {
    buildingRoutesListEl.innerHTML = '<li class="panel-empty">No routes building.</li>';
    return;
  }

  const items = buildingRoutes
    .map(route => {
      const remainingMs = getRouteBuildRemainingMs(route);
      return createPanelItemHTML(
        `${route.fromName} -> ${route.toName}`,
        `Distance ${formatNumber(route.distance)} km | Delta ${formatDeltaTime(remainingMs)}`
      );
    })
    .join('');

  buildingRoutesListEl.innerHTML = items;
};

const updateTrainPanel = () => {
  renderRunningTrainsPanel();
  renderBuildingRoutesPanel();
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
  updateMoneyUI(true);
  showIncomePopup(income);
  saveGameState();
};

function createTrain(route, initialState = null) {
  if (!route || route.status !== 'active') return null;
  if (getTrainByRouteId(route.id)) return null;

  const from = getStationById(route.from);
  const to = getStationById(route.to);
  if (!from || !to) return null;

  const initialProgress = Math.max(0, Math.min(1, initialState?.progress ?? 0));
  const initialDirection = initialState?.direction === -1 ? -1 : 1;
  const initialPosition = interpolatePosition(from, to, initialProgress);

  const marker = L.circleMarker(initialPosition, {
    radius: 6,
    color: '#ffffff',
    fillColor: '#ffd60a',
    fillOpacity: 0.95,
    weight: 2,
    pane: 'markerPane',
  }).addTo(map);

  const trainId = typeof initialState?.id === 'number' ? initialState.id : trainIdCounter;

  marker.bindTooltip(`Train ${trainId}: ${route.fromName} <-> ${route.toName}`, {
    direction: 'top',
    opacity: 0.9,
    offset: [0, -6],
  });

  const speed = initialState?.speed || getTrainSpeed();

  const train = {
    id: trainId,
    routeId: route.id,
    progress: initialProgress,
    speed,
    direction: initialDirection,
    marker,
  };

  trainIdCounter = Math.max(trainIdCounter, train.id + 1);

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

const spawnTrainsForActiveRoutes = (savedTrainStates = []) => {
  const trainByRouteId = new Map(savedTrainStates.map(train => [train.routeId, train]));

  routes.forEach(route => {
    if (route.status === 'active') {
      createTrain(route, trainByRouteId.get(route.id) || null);
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

const toggleSettingsMenu = forceOpen => {
  if (!settingsMenuEl) return;

  const isOpen = settingsMenuEl.classList.contains('settings-menu-open');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
  settingsMenuEl.classList.toggle('settings-menu-open', shouldOpen);
};

const setActiveDockPanel = panelName => {
  const nextPanel = panelName || null;

  Object.entries(dockPanels).forEach(([name, panelEl]) => {
    if (!panelEl) return;
    const isActive = nextPanel === name;
    panelEl.classList.toggle('dock-panel-open', isActive);
  });

  panelDockButtons.forEach(buttonEl => {
    const isActive = buttonEl.dataset.panelTarget === nextPanel;
    buttonEl.classList.toggle('panel-dock-btn-active', isActive);
    buttonEl.setAttribute('aria-pressed', String(isActive));
  });

  activeDockPanel = nextPanel;
  if (activeDockPanel) {
    toggleSettingsMenu(false);
  }
};

const toggleDockPanel = panelName => {
  if (!panelName) return;
  const nextPanel = activeDockPanel === panelName ? null : panelName;
  setActiveDockPanel(nextPanel);
};

const resetGameData = () => {
  const confirmed = window.confirm('Reset all game data? This cannot be undone.');
  if (!confirmed) return;

  localStorage.removeItem('trainTycoonState');
  window.location.reload();
};

function saveGameState() {
  const state = {
    currentGameDay,
    lastGameDayTickAtMs,
    playerMoney,
    trains: trains.map(train => ({
      id: train.id,
      routeId: train.routeId,
      progress: train.progress,
      speed: train.speed,
      direction: train.direction,
    })),
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
      if (typeof state.currentGameDay === 'number') {
        currentGameDay = state.currentGameDay;
      }
      if (typeof state.playerMoney === 'number') {
        playerMoney = state.playerMoney;
      }
      if (typeof state.lastGameDayTickAtMs === 'number') {
        lastGameDayTickAtMs = state.lastGameDayTickAtMs;

        const elapsedSinceSavedTick = Date.now() - lastGameDayTickAtMs;
        if (elapsedSinceSavedTick > 0) {
          const elapsedDays = Math.floor(elapsedSinceSavedTick / MS_PER_GAME_DAY);
          if (elapsedDays > 0) {
            currentGameDay += elapsedDays;
            lastGameDayTickAtMs += elapsedDays * MS_PER_GAME_DAY;
          }
        }
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
      const savedTrains = Array.isArray(state.trains) ? state.trains : [];
      spawnTrainsForActiveRoutes(savedTrains);
      updateGameClockUI();
      updateMoneyUI();
      updateBuildStatusUI();
      updateTrainPanel();
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
  updateTrainPanel();
};

function startGameClock() {
  if (gameClockStarted) return;
  gameClockStarted = true;

  updateGameClockUI();

  const scheduleNextTick = () => {
    const elapsedSinceTick = Date.now() - lastGameDayTickAtMs;
    const delay = Math.max(0, MS_PER_GAME_DAY - elapsedSinceTick);

    gameClockTimeoutId = setTimeout(() => {
      const now = Date.now();
      const elapsed = now - lastGameDayTickAtMs;
      const daySteps = Math.max(1, Math.floor(elapsed / MS_PER_GAME_DAY));

      currentGameDay += daySteps;
      lastGameDayTickAtMs += daySteps * MS_PER_GAME_DAY;
      if (lastGameDayTickAtMs > now) {
        lastGameDayTickAtMs = now;
      }

      updateGameClockUI();
      updateBuildStatusUI();
      updateTrainPanel();
      saveGameState();
      scheduleNextTick();
    }, delay);
  };

  scheduleNextTick();
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
  const alreadyBuilt = routeExists(from, to);

  pendingRoute = alreadyBuilt ? null : { from, to, distance, cost, buildTime: time };
  routeDistanceEl.textContent = formatNumber(distance) + ' km';
  routeCostEl.textContent = formatCurrency(cost);
  routeTimeEl.textContent = formatNumber(time) + ' days';

  if (alreadyBuilt) {
    buildRouteBtn.disabled = true;
    setRouteStatus('This route has already been built.');
    return;
  }

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
  updateTrainPanel();
  saveGameState();
}

async function loadStations() {
  const res = await fetch('stations.json');
  return await res.json();
}

async function initStations() {
  const stations = await loadStations();

  stations.forEach(station => {
    L.marker([station.lat, station.lng], {
      icon: stationPinIcon,
      opacity: 0.95,
      keyboard: false,
    })
      .addTo(map)
      .bindTooltip(station.name, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.9,
      });
  });

  stationsCache = stations;
  window._stations = stations;
  populateStationSelectors(stations);

  loadGameState();
  startGameClock();

  clearRouteStats();
  updateMoneyUI();
  setRouteStatus('Select stations, then click Calculate Route.');
  updateTrainPanel();

  if (stations.length > 0) {
    const stationBounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
    map.setMaxBounds(stationBounds.pad(1.1));
    map.fitBounds(stationBounds, { padding: [40, 40], maxZoom: 6 });
  } else {
    L.popup({ closeButton: false, autoClose: false })
      .setLatLng(map.getCenter())
      .setContent('No stations found. Click on a marker to open its popup.')
      .openOn(map);
  }
}

initStations();
setInterval(checkRouteCompletion, 1000);
setInterval(updateTrains, TRAIN_UPDATE_INTERVAL_MS);
setInterval(saveGameState, STATE_SYNC_INTERVAL_MS);
setInterval(updateTrainPanel, 250);

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

if (settingsBtnEl) {
  settingsBtnEl.addEventListener('click', event => {
    event.stopPropagation();
    toggleSettingsMenu();
  });
}

if (resetGameBtnEl) {
  resetGameBtnEl.addEventListener('click', event => {
    event.stopPropagation();
    resetGameData();
  });
}

document.addEventListener('click', event => {
  if (!settingsMenuEl || !settingsWrapEl) return;
  if (!settingsMenuEl.classList.contains('settings-menu-open')) return;

  const clickTarget = event.target;
  if (!(clickTarget instanceof Node)) return;
  if (!settingsWrapEl.contains(clickTarget)) {
    toggleSettingsMenu(false);
  }
});

document.addEventListener('click', event => {
  if (!activeDockPanel) return;

  const clickTarget = event.target;
  if (!(clickTarget instanceof Node)) return;

  const clickedDockButton = panelDockEl && panelDockEl.contains(clickTarget);
  const clickedPanel = dockPanelElements.some(panelEl => panelEl.contains(clickTarget));

  if (!clickedDockButton && !clickedPanel) {
    setActiveDockPanel(null);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    toggleSettingsMenu(false);
    setActiveDockPanel(null);
  }
});

panelDockButtons.forEach(buttonEl => {
  buttonEl.addEventListener('click', () => {
    const targetPanel = buttonEl.dataset.panelTarget;
    toggleDockPanel(targetPanel);
  });
});

setActiveDockPanel(null);