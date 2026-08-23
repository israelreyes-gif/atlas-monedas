/**
 * main.js
 * Punto de entrada. Solo conecta piezas: carga datos, crea el Globe,
 * la colección, el panel y los marcadores. La lógica en sí vive en cada
 * módulo por separado.
 */
(async function () {
  const canvas = document.getElementById('globe-canvas');
  const globe = new Globe(canvas);

  await globe.loadBorders('data/borders.json');
  globe.mount();

  document.getElementById('zoom-in').addEventListener('click', () => globe.zoomBy(-4));
  document.getElementById('zoom-out').addEventListener('click', () => globe.zoomBy(4));

  const worldData = await loadWorldData('data/world.json');
  const collection = new Collection();
  const panel = new CityPanel(document.getElementById('panel'), collection);
  const markers = new MarkerLayer(globe, worldData, collection, panel);
  markers.mount();

  // Se dejan accesibles en consola por comodidad mientras probamos.
  window.__globe = globe;
  window.__markers = markers;
  window.__collection = collection;
})();
