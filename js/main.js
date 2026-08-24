/**
 * main.js
 * Punto de entrada. Conecta todas las piezas: al tocar un país, esconde
 * el globo (lienzo 3D + sus etiquetas) y muestra el mapa plano de ese
 * país; al volver, al revés.
 */
(async function () {
  const globeCanvas = document.getElementById('globe-canvas');
  const mapCanvas = document.getElementById('map-canvas');
  const globe = new Globe(globeCanvas);

  await globe.loadBorders('data/borders.json');
  globe.mount();

  const worldData = await loadWorldData('data/world.json');
  const countryBorders = await loadWorldData('data/country-borders.json');
  const API_BASE_URL = 'https://atlas-monedas-api.pages.dev';
  const collection = new Collection(API_BASE_URL);
  await collection.load(); // carga lo ya guardado antes de dibujar nada que dependa de ello
  const panel = new CityPanel(document.getElementById('panel'), collection);

  const markers = new MarkerLayer(globe, worldData);
  markers.mount();

  const countryMap = new CountryMap(mapCanvas, worldData, countryBorders, collection, panel);

  const search = new SearchBox(
    document.getElementById('search-input'),
    document.getElementById('search-results'),
    worldData
  );

  let currentView = 'globe'; // 'globe' | 'map'

  markers.onCountrySelected = (contKey, isoKey) => {
    currentView = 'map';
    globe.setVisible(false);
    markers.hideLabels();
    countryMap.show(contKey, isoKey);
  };

  search.onSelect = (contKey, isoKey, cityName) => {
    currentView = 'map';
    globe.setVisible(false);
    markers.hideLabels();
    countryMap.show(contKey, isoKey);
    panel.open(contKey, isoKey, worldData[contKey].name, worldData[contKey].countries[isoKey].name, cityName);
  };

  // El botón de "‹ Mundo · ..." hace de "volver": si estamos en el mapa de
  // país, retrocede a la lista de países de ese continente; si ya estamos
  // en esa lista, va al mundo entero.
  document.getElementById('breadcrumb').addEventListener('click', () => {
    if (currentView === 'map') {
      const contKey = countryMap.state.contKey;
      countryMap.hide();
      globe.setVisible(true);
      markers.showLabels();
      currentView = 'globe';
      markers.goToContinent(contKey);
    } else {
      markers.goToWorld();
    }
  });

  // Se dejan accesibles en consola por comodidad mientras probamos.
  window.__globe = globe;
  window.__markers = markers;
  window.__collection = collection;
  window.__countryMap = countryMap;
})();
