/**
 * city-panel.js
 * El panel que se desliza desde la derecha al tocar una ciudad. Solo sabe
 * pintar y leer/escribir en Collection — no sabe nada de Three.js ni del
 * globo.
 */
class CityPanel {
  constructor(panelEl, collection) {
    this.panelEl = panelEl;
    this.bodyEl = panelEl.querySelector('#panel-body');
    this.collection = collection;
    this.current = null; // { contKey, isoKey, contName, countryName, cityName }
    this.onToggle = null; // callback opcional, para que markers.js repinte el punto

    panelEl.querySelector('.close').addEventListener('click', () => this.close());
  }

  open(contKey, isoKey, contName, countryName, cityName) {
    this.current = { contKey, isoKey, contName, countryName, cityName };
    this._render();
    this.panelEl.classList.add('open');
  }

  close() {
    this.panelEl.classList.remove('open');
  }

  _render() {
    const { contKey, isoKey, contName, countryName, cityName } = this.current;
    const owned = this.collection.isOwned(contKey, isoKey, cityName);
    this.bodyEl.innerHTML = `
      <div class="eyebrow">${contName} · ${countryName}</div>
      <div class="coin-face ${owned ? 'owned' : ''}">${cityName[0]}</div>
      <h2>${cityName}</h2>
      <div class="status-row"><span class="dot ${owned ? 'owned' : ''}"></span>${owned ? 'En tu colección' : 'Aún no comprada'}</div>
      <button id="toggle-btn" class="${owned ? 'owned' : ''}">
        ${owned ? '✓ Comprada — marcar como pendiente' : 'Marcar como comprada'}
      </button>
    `;
    this.bodyEl.querySelector('#toggle-btn').addEventListener('click', () => this._toggle());
  }

  _toggle() {
    const { contKey, isoKey, cityName } = this.current;
    this.collection.toggle(contKey, isoKey, cityName);
    this._render();
    if (this.onToggle) this.onToggle(contKey, isoKey, cityName);
  }
}
