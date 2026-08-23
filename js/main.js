/**
 * main.js
 * Punto de entrada. Conecta todas las piezas: al tocar un país, esconde
 * el globo y muestra el mapa plano de ese país; al volver, al revés.
 */
(async function () {
  const globeCanvas = document.getElementById('globe-canvas');
  const mapCanvas = document.getElementById('map-canvas');
  const globe = new Globe(globeCanvas);

  await globe.loadBorders('data/borders.json');
  globe.mount();

  const worldData = await loadWorldData('data/world.json');
  const countryBorders = await loadWorldData('data/country-borders.json');
  const collection = new Collection();
  const panel = new CityPanel(document.getElementById('panel'), collection);

  const markers = new MarkerLayer(globe, worldData);
  markers.mount();

  const countryMap = new CountryMap(mapCanvas, worldData, countryBorders, collection, panel);

  let currentView = 'globe'; // 'globe' | 'map'

  markers.onCountrySelected = (contKey, isoKey) => {
    currentView = 'map';
    globe.setVisible(false);
    countryMap.show(contKey, isoKey);
  };

  // El botón de "‹ Mundo · ..." hace de "volver": si estamos en el mapa de
  // país, retrocede a la lista de países de ese continente; si ya estamos
  // en esa lista, va al mundo entero.
  document.getElementById('breadcrumb').addEventListener('click', () => {
    if (currentView === 'map') {
      const contKey = countryMap.state.contKey;
      countryMap.hide();
      globe.setVisible(true);
      currentView = 'globe';
      markers.goToContinent(contKey);
    } else {
      markers.goToWorld();
    }
  });

  document.getElementById('zoom-in').addEventListener('click', () => {
    if (currentView === 'map') countryMap.zoomBy(1.35);
    else globe.zoomBy(-4);
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    if (currentView === 'map') countryMap.zoomBy(1 / 1.35);
    else globe.zoomBy(4);
  });

  // Se dejan accesibles en consola por comodidad mientras probamos.
  window.__globe = globe;
  window.__markers = markers;
  window.__collection = collection;
  window.__countryMap = countryMap;
})();
