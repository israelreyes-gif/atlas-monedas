/**
 * search.js
 * Buscador de ciudades, 100% local (filtra sobre el mismo dato que ya
 * tiene cargado la app — nada de peticiones de red, así que no hay
 * límite de uso ni depende de estar conectado).
 */
class SearchBox {
  constructor(inputEl, resultsEl, worldData) {
    this.input = inputEl;
    this.results = resultsEl;
    this.onSelect = null; // (contKey, isoKey, cityName) => {}

    this.index = [];
    Object.entries(worldData).forEach(([contKey, cont]) => {
      Object.entries(cont.countries).forEach(([isoKey, country]) => {
        country.cities.forEach(c => {
          this.index.push({ contKey, isoKey, cityName: c[0], countryName: country.name, contName: cont.name });
        });
      });
    });

    this._matches = [];
    this._bind();
  }

  _normalize(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  _bind() {
    this.input.addEventListener('input', () => this._search());
    document.addEventListener('pointerdown', e => {
      if (e.target !== this.input && !this.results.contains(e.target)) {
        this.results.classList.remove('show');
      }
    });
  }

  _search() {
    const q = this._normalize(this.input.value.trim());
    if (!q) { this.results.classList.remove('show'); return; }

    this._matches = this.index.filter(c => this._normalize(c.cityName).includes(q)).slice(0, 8);

    if (!this._matches.length) {
      this.results.innerHTML = '<div class="sr-empty">Sin resultados</div>';
    } else {
      this.results.innerHTML = this._matches.map((c, i) =>
        `<div class="sr-item" data-i="${i}">${c.cityName} <span class="sr-country">· ${c.countryName}</span></div>`
      ).join('');
      this.results.querySelectorAll('.sr-item').forEach(el => {
        el.addEventListener('click', () => this._select(Number(el.dataset.i)));
      });
    }
    this.results.classList.add('show');
  }

  _select(i) {
    const m = this._matches[i];
    this.results.classList.remove('show');
    this.input.value = '';
    this.input.blur();
    if (this.onSelect) this.onSelect(m.contKey, m.isoKey, m.cityName);
  }
}
