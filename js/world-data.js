/**
 * world-data.js
 * Carga el catálogo de continentes → países → ciudades desde un JSON
 * estático. Separado de markers.js para que quede claro qué es "traer
 * datos" y qué es "dibujar" — el día que esto venga de D1 en vez de un
 * fichero estático, solo se toca esta función.
 */
async function loadWorldData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo cargar ' + url + ' (HTTP ' + res.status + ')');
  return res.json();
}
