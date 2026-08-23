/**
 * main.js
 * Punto de entrada. Solo conecta piezas: carga datos, crea el Globe,
 * conecta los botones de zoom. La lógica en sí vive en globe.js.
 */
(async function () {
  const canvas = document.getElementById('globe-canvas');
  const globe = new Globe(canvas);

  await globe.loadBorders('data/borders.json');
  globe.mount();

  document.getElementById('zoom-in').addEventListener('click', () => globe.zoomBy(-4));
  document.getElementById('zoom-out').addEventListener('click', () => globe.zoomBy(4));

  const worldData = await loadWorldData('data/world.json');
  const markers = new MarkerLayer(globe, worldData);
  markers.mount();

  // Próximo paso: al tocar un país entraremos en sus ciudades.
  markers.onCountrySelected = (contKey, isoKey) => {
    console.log('País seleccionado:', contKey, isoKey);
  };

  // Se dejan accesibles en consola por comodidad mientras probamos.
  window.__globe = globe;
  window.__markers = markers;
})();
