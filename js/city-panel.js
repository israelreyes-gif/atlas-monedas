/**
 * city-panel.js
 * El panel que se desliza desde la derecha al tocar una ciudad. Muestra
 * el botón de comprada/pendiente y, debajo, una foto + resumen traídos de
 * Wikipedia (ver city-info.js). Solo sabe pintar y leer/escribir en
 * Collection — no sabe nada de Three.js ni del globo.
 */
class CityPanel {
  constructor(panelEl, collection) {
    this.panelEl = panelEl;
    this.bodyEl = panelEl.querySelector('#panel-body');
    this.collection = collection;
    this.current = null; // { contKey, isoKey, contName, countryName, cityName }
    this.onToggle = null; // callback opcional, para que markers.js/country-map.js repinten el punto

    this._infoCache = new Map(); // evita volver a pedir la misma ciudad dos veces
    this._requestId = 0;         // para ignorar respuestas de una ciudad que ya no es la abierta

    panelEl.querySelector('.close').addEventListener('click', () => this.close());
  }

  open(contKey, isoKey, contName, countryName, cityName) {
    this.current = { contKey, isoKey, contName, countryName, cityName };
    this._render();
    this.panelEl.classList.add('open');
    this._loadCityInfo();
  }

  close() {
    this.panelEl.classList.remove('open');
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  _cacheKey() {
    const { contKey, isoKey, cityName } = this.current;
    return contKey + '|' + isoKey + '|' + cityName;
  }

  _render() {
    const { contKey, isoKey, contName, countryName, cityName } = this.current;
    const owned = this.collection.isOwned(contKey, isoKey, cityName);
    const cached = this._infoCache.get(this._cacheKey()); // undefined = aún no pedido

    this.bodyEl.innerHTML = `
      <div class="eyebrow">${contName} · ${countryName}</div>
      <div class="coin-face ${owned ? 'owned' : ''}">${cityName[0]}</div>
      <h2>${cityName}</h2>
      <div class="status-row"><span class="dot ${owned ? 'owned' : ''}"></span>${owned ? 'En tu colección' : 'Aún no comprada'}</div>
      <button id="toggle-btn" class="${owned ? 'owned' : ''}">
        ${owned ? '✓ Comprada — marcar como pendiente' : 'Marcar como comprada'}
      </button>
      <div id="city-info">${this._infoHtml(cached)}</div>
    `;
    this.bodyEl.querySelector('#toggle-btn').addEventListener('click', () => this._toggle());
  }

  _infoHtml(info) {
    if (info === undefined) return '<div class="info-loading">Buscando información…</div>';
    if (info === null) return '<div class="info-empty">No se ha encontrado información para esta ciudad.</div>';
    const title = escapeHtml(info.title || '');
    const extract = escapeHtml(info.extract || '');
    return `
      ${info.imageUrl ? `<img class="city-photo" src="${info.imageUrl}" alt="${title}">` : ''}
      <p class="city-extract">${extract}</p>
      ${info.pageUrl ? `<a class="city-wiki-link" href="${info.pageUrl}" target="_blank" rel="noopener">Ver en Wikipedia ↗</a>` : ''}
    `;
  }

  async _loadCityInfo() {
    const key = this._cacheKey();
    if (this._infoCache.has(key)) return; // ya lo teníamos, _render() ya lo pintó

    const requestId = ++this._requestId;
    const { cityName, countryName } = this.current;
    const info = await fetchCityInfo(cityName, countryName); // objeto, o null si no se encontró nada

    if (requestId !== this._requestId) return; // se abrió otra ciudad mientras tanto, descartar
    this._infoCache.set(key, info);

    const infoEl = this.bodyEl.querySelector('#city-info');
    if (infoEl) infoEl.innerHTML = this._infoHtml(info);
  }

  _toggle() {
    const { contKey, isoKey, cityName } = this.current;
    this.collection.toggle(contKey, isoKey, cityName);
    this._render();
    if (this.onToggle) this.onToggle(contKey, isoKey, cityName);
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
