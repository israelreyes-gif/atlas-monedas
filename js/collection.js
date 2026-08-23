/**
 * collection.js
 * Estado de "qué monedas tengo ya comprada". Deliberadamente aislado del
 * resto: hoy vive en memoria (se pierde al recargar), pero cuando
 * conectemos D1 solo hay que reescribir esta clase para que en vez de un
 * Set hable con la API — markers.js y city-panel.js no necesitarán
 * cambiar ni una línea.
 */
class Collection {
  constructor() {
    this._owned = new Set();
  }

  _key(contKey, isoKey, cityName) {
    return contKey + '|' + isoKey + '|' + cityName;
  }

  isOwned(contKey, isoKey, cityName) {
    return this._owned.has(this._key(contKey, isoKey, cityName));
  }

  /** Cambia el estado y devuelve el nuevo valor (true = ya comprada). */
  toggle(contKey, isoKey, cityName) {
    const k = this._key(contKey, isoKey, cityName);
    if (this._owned.has(k)) this._owned.delete(k);
    else this._owned.add(k);
    return this._owned.has(k);
  }
}
