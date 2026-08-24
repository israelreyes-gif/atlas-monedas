/**
 * collection.js
 * Estado de "qué monedas tengo ya comprada" — ahora respaldado por la API
 * de Cloudflare (Worker + D1) en vez de vivir solo en memoria.
 *
 * El resto de la app (markers.js, city-panel.js, country-map.js) sigue
 * hablando con isOwned()/toggle() exactamente igual que antes; no hace
 * falta tocar nada ahí.
 */
class Collection {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this._owned = new Set();
  }

  _key(contKey, isoKey, cityName) {
    return contKey + '|' + isoKey + '|' + cityName;
  }

  /** Carga desde el servidor todo lo ya marcado. Llamar una vez al arrancar,
   *  antes de mostrar nada que dependa de isOwned(). */
  async load() {
    try {
      const res = await fetch(this.apiBaseUrl + '/owned');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      this._owned = new Set(rows.map(r => this._key(r.cont_key, r.iso_key, r.city_name)));
    } catch (err) {
      console.error('No se pudo cargar la colección guardada:', err);
    }
  }

  isOwned(contKey, isoKey, cityName) {
    return this._owned.has(this._key(contKey, isoKey, cityName));
  }

  /**
   * Cambia el estado al instante (para que la interfaz responda ya, sin
   * esperar a la red) y lo guarda en el servidor en segundo plano. Si el
   * guardado falla, deshace el cambio local y avisa por consola — mejor
   * que dejar la pantalla mostrando algo que en realidad no se guardó.
   */
  toggle(contKey, isoKey, cityName) {
    const k = this._key(contKey, isoKey, cityName);
    const nowOwned = !this._owned.has(k);
    if (nowOwned) this._owned.add(k); else this._owned.delete(k);

    fetch(this.apiBaseUrl + '/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contKey, isoKey, cityName }),
    }).catch(err => {
      console.error('No se pudo guardar el cambio, revirtiendo:', err);
      if (nowOwned) this._owned.delete(k); else this._owned.add(k);
    });

    return nowOwned;
  }
}
