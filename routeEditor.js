(function initRouteEditor() {
  const map = window.trainTycoonMap;
  if (!map || !window.L || !L.Control.Draw) {
    return;
  }

  const ROUTES_FILE = 'routes.json';
  const ROUTES = [];

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    draw: {
      polyline: true,
      polygon: false,
      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: drawnItems,
    },
  });

  map.addControl(drawControl);
  let controlAttached = true;

  function normalizeRoutes(input) {
    if (!Array.isArray(input)) return [];

    return input
      .map((route, index) => {
        if (!route || !Array.isArray(route.path)) return null;
        const path = route.path
          .filter(point => Array.isArray(point) && point.length >= 2)
          .map(point => [Number(point[0]), Number(point[1])])
          .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]));

        if (path.length < 2) return null;

        const id = route.id ? String(route.id) : 'route_' + (index + 1);
        return { id, path };
      })
      .filter(Boolean);
  }

  function clearDrawnRoutes() {
    drawnItems.clearLayers();
  }

  function drawRouteLayer(route) {
    const layer = L.polyline(route.path, {
      color: 'yellow',
      weight: 4,
    });
    drawnItems.addLayer(layer);
    return layer;
  }

  function getRoutesFromDrawnItems() {
    const routes = [];

    drawnItems.eachLayer(layer => {
      if (!(layer instanceof L.Polyline)) return;

      const latlngs = layer.getLatLngs();
      const path = latlngs.map(p => [p.lat, p.lng]);
      if (path.length < 2) return;

      routes.push({
        id: 'route_' + (routes.length + 1),
        path,
      });
    });

    return routes;
  }

  function setRoutes(routes) {
    const normalized = normalizeRoutes(routes);
    ROUTES.length = 0;
    ROUTES.push(...normalized);

    clearDrawnRoutes();
    ROUTES.forEach(route => drawRouteLayer(route));
  }

  function getCurrentRoutes() {
    const routes = getRoutesFromDrawnItems();
    ROUTES.length = 0;
    ROUTES.push(...routes);
    return routes;
  }

  async function loadRoutesFromFile() {
    try {
      const response = await fetch(ROUTES_FILE, { cache: 'no-store' });
      if (!response.ok) {
        if (response.status !== 404) {
          console.warn('Failed to fetch routes.json:', response.status);
        }
        return;
      }

      const parsed = await response.json();
      setRoutes(parsed);
    } catch (error) {
      console.warn('Failed to load routes.json:', error);
    }
  }

  function downloadRoutesFile(routes) {
    const json = JSON.stringify(routes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = ROUTES_FILE;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function saveRoutesToFile(routes) {
    const json = JSON.stringify(routes, null, 2);

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: ROUTES_FILE,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        console.log('Saved routes to file picker selection.');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          return;
        }
      }
    }

    downloadRoutesFile(routes);
  }

  function setEditorMode(enabled) {
    const drawToolbar = drawControl._toolbars && drawControl._toolbars.draw;
    const editToolbar = drawControl._toolbars && drawControl._toolbars.edit;

    if (drawToolbar && drawToolbar._modes) {
      Object.values(drawToolbar._modes).forEach(mode => {
        if (mode && mode.handler && mode.handler.enabled()) {
          mode.handler.disable();
        }
      });
    }

    if (editToolbar && editToolbar._modes) {
      Object.values(editToolbar._modes).forEach(mode => {
        if (mode && mode.handler && mode.handler.enabled()) {
          mode.handler.disable();
        }
      });
    }

    if (enabled) {
      if (!controlAttached) {
        map.addControl(drawControl);
        controlAttached = true;
      }
    } else if (controlAttached) {
      map.removeControl(drawControl);
      controlAttached = false;
    }
  }

  function renderRoutes() {
    setRoutes(ROUTES);
  }

  map.on(L.Draw.Event.CREATED, function onRouteCreated(event) {
    const layer = event.layer;
    layer.setStyle({ color: 'yellow', weight: 4 });
    drawnItems.addLayer(layer);

    const latlngs = layer.getLatLngs();
    const path = latlngs.map(p => [p.lat, p.lng]);

    console.log('ROUTE PATH:', JSON.stringify(path));
    getCurrentRoutes();
  });

  map.on(L.Draw.Event.EDITED, function onRoutesEdited() {
    getCurrentRoutes();
  });

  map.on(L.Draw.Event.DELETED, function onRoutesDeleted() {
    getCurrentRoutes();
  });

  const exportButton = document.getElementById('exportRoutes');
  if (exportButton) {
    exportButton.onclick = async () => {
      const routes = getCurrentRoutes();
      await saveRoutesToFile(routes);

      console.log('EXPORTED ROUTES:', JSON.stringify(routes, null, 2));
    };
  }

  let editorEnabled = false;
  setEditorMode(editorEnabled);

  const toggleButton = document.getElementById('toggleEditor');
  if (toggleButton) {
    toggleButton.onclick = () => {
      editorEnabled = !editorEnabled;
      setEditorMode(editorEnabled);
    };
  }

  loadRoutesFromFile().then(() => {
    renderRoutes();
  });

  window.routeEditor = {
    ROUTES,
    drawnItems,
    renderRoutes,
    setEditorMode,
  };
})();
