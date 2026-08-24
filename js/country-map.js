/**
 * country-map.js
 * Sustituye al globo cuando se entra en un país: dibuja su silueta (si la
 * tenemos a esta resolución) y todas sus ciudades repartidas en un lienzo
 * 2D, con más espacio por ciudad que unos pocos píxeles de esfera. Tiene
 * sus propios gestos (1 dedo mueve, 2 dedos o rueda hacen zoom) — mismo
 * reparto que el globo, para que no haya que aprender nada nuevo.
 */
class CountryMap {
  constructor(canvas, worldData, countryBorders, collection, panel) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = worldData;
    this.borders = countryBorders; // { isoKey: geometry }
    this.collection = collection;
    this.panel = panel;

    this.state = null; // { contKey, isoKey, bounds, scale, offX, offY }
    this.points = [];   // puntos ya proyectados, para el hit-test del toque

    this.onBack = null; // () => {}

    if (this.panel) {
      this.panel.onToggle = () => { this._draw(); this._updateCounter(); }; // repinta el punto y el contador
    }

    this._bindGestures();
    window.addEventListener('resize', () => { if (this.state) this._draw(); });
  }

  show(contKey, isoKey) {
    const country = this.data[contKey].countries[isoKey];
    this.state = {
      contKey, isoKey,
      countryName: country.name,
      contName: this.data[contKey].name,
      cities: country.cities,
      bounds: this._computeBounds(isoKey, country.cities),
      scale: 1, offX: 0, offY: 0,
    };
    this.canvas.style.display = 'block';
    this._updateBreadcrumb();
    this._updateCounter();
    this._draw();
  }

  hide() {
    this.canvas.style.display = 'none';
    this.state = null;
    if (this.panel) this.panel.close();
    const el = document.getElementById('counter');
    if (el) el.style.display = 'none';
  }

  zoomBy(factor) {
    if (!this.state) return;
    this.state.scale = Math.max(0.4, Math.min(15, this.state.scale * factor));
    this._draw();
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  _computeBounds(isoKey, cities) {
    let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
    const geom = this.borders[isoKey];
    const scan = (coords) => {
      if (typeof coords[0] === 'number') {
        const [lo, la] = coords;
        if (lo < lonMin) lonMin = lo; if (lo > lonMax) lonMax = lo;
        if (la < latMin) latMin = la; if (la > latMax) latMax = la;
      } else coords.forEach(scan);
    };
    if (geom) scan(geom.coordinates);
    cities.forEach(c => {
      const [, lat, lon] = c;
      if (lon < lonMin) lonMin = lon; if (lon > lonMax) lonMax = lon;
      if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat;
    });
    const padLon = Math.max((lonMax - lonMin) * 0.1, 0.4);
    const padLat = Math.max((latMax - latMin) * 0.1, 0.4);
    return { lonMin: lonMin - padLon, lonMax: lonMax + padLon, latMin: latMin - padLat, latMax: latMax + padLat };
  }

  _project(lat, lon) {
    const b = this.state.bounds;
    const latMid = (b.latMin + b.latMax) / 2, lonMid = (b.lonMin + b.lonMax) / 2;
    const cosMid = Math.max(0.15, Math.cos(latMid * Math.PI / 180));
    const wDeg = (b.lonMax - b.lonMin) * cosMid, hDeg = (b.latMax - b.latMin);
    const availW = window.innerWidth * 0.84, availH = window.innerHeight * 0.7;
    const fitScale = Math.min(availW / wDeg, availH / hDeg);
    const s = fitScale * this.state.scale;
    const cx = window.innerWidth / 2 + this.state.offX;
    const cy = window.innerHeight / 2 + 24 + this.state.offY;
    return [cx + (lon - lonMid) * cosMid * s, cy - (lat - latMid) * s];
  }

  _fitCanvas() {
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _draw() {
    if (!this.state) return;
    this._fitCanvas();
    const ctx = this.ctx, w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0D1420';
    ctx.fillRect(0, 0, w, h);

    const geom = this.borders[this.state.isoKey];
    if (geom) {
      const ringPath = (ring) => {
        ctx.moveTo(...this._project(ring[0][1], ring[0][0]));
        for (let i = 1; i < ring.length; i++) ctx.lineTo(...this._project(ring[i][1], ring[i][0]));
        ctx.closePath();
      };
      ctx.beginPath();
      if (geom.type === 'Polygon') geom.coordinates.forEach(ringPath);
      else geom.coordinates.forEach(poly => poly.forEach(ringPath));
      ctx.fillStyle = 'rgba(201,162,75,0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,75,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    this.points = [];
    // Los puntos siempre se dibujan todos. Las etiquetas se van colocando
    // por orden (las ciudades ya vienen ordenadas por población), y una
    // etiqueta solo se dibuja si no se solapa con ninguna ya colocada —
    // así nunca hay amontonamiento, y al hacer zoom aparecen más porque
    // hay más sitio libre entre los puntos.
    const placedLabelBoxes = [];
    ctx.font = "13px 'Fraunces', serif";
    this.state.cities.forEach(c => {
      const [name, lat, lon] = c;
      const [x, y] = this._project(lat, lon);
      const owned = this.collection ? this.collection.isOwned(this.state.contKey, this.state.isoKey, name) : false;
      ctx.beginPath();
      ctx.arc(x, y, owned ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = owned ? '#C9A24B' : '#4A5568';
      ctx.fill();
      if (owned) {
        ctx.strokeStyle = 'rgba(201,162,75,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
      }

      const textW = ctx.measureText(name).width;
      const box = { x: x + 9, y: y - 10, w: textW + 4, h: 16 };
      const overlaps = placedLabelBoxes.some(b =>
        box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y
      );
      if (!overlaps) {
        ctx.fillStyle = '#EDE6D6';
        ctx.fillText(name, x + 9, y + 4);
        placedLabelBoxes.push(box);
      }

      this.points.push({ x, y, name });
    });
  }

  _updateBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (!el || !this.state) return;
    el.style.display = 'flex';
    el.textContent = '‹ Mundo · ' + this.state.contName + ' · ' + this.state.countryName;
  }

  _updateCounter() {
    const el = document.getElementById('counter');
    if (!el || !this.state || !this.collection) return;
    let owned = 0;
    this.state.cities.forEach(c => {
      if (this.collection.isOwned(this.state.contKey, this.state.isoKey, c[0])) owned++;
    });
    el.textContent = owned + ' / ' + this.state.cities.length;
    el.style.display = 'block';
  }

  _hitTest(x, y) {
    let best = null, bestDist = 18; // radio de toque en píxeles de pantalla
    this.points.forEach(p => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) { bestDist = d; best = p; }
    });
    return best;
  }

  /**
   * Mismo reparto de gestos que el globo (1 dedo mueve, 2 dedos/rueda hacen
   * zoom) y la misma contención agresiva de eventos, por la misma razón:
   * evitar que un arrastre se filtre hacia el gesto de cerrar del visor.
   */
  _bindGestures() {
    const canvas = this.canvas;
    const pointers = new Map();
    let mode = null, lastSingle = null, pinchStartDist = null, downPos = null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
      canvas.addEventListener(evt, e => e.preventDefault());
    });

    canvas.addEventListener('pointerdown', e => {
      if (!this.state) return;
      e.preventDefault(); e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        mode = 'pan';
        lastSingle = { x: e.clientX, y: e.clientY };
        downPos = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        mode = 'pinch';
        const pts = [...pointers.values()];
        pinchStartDist = dist(pts[0], pts[1]);
        downPos = null;
      }
    }, { passive: false });

    canvas.addEventListener('pointermove', e => {
      if (!this.state || !pointers.has(e.pointerId)) return;
      e.preventDefault(); e.stopPropagation();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === 'pinch' && pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = dist(pts[0], pts[1]);
        this.state.scale = Math.max(0.4, Math.min(15, this.state.scale * (d / pinchStartDist)));
        pinchStartDist = d;
        this._draw();
        return;
      }
      if (mode === 'pan' && pointers.size === 1) {
        const dx = e.clientX - lastSingle.x, dy = e.clientY - lastSingle.y;
        lastSingle = { x: e.clientX, y: e.clientY };
        this.state.offX += dx; this.state.offY += dy;
        this._draw();
      }
    }, { passive: false });

    const endPointer = (e) => {
      if (!this.state) return;
      e.preventDefault(); e.stopPropagation();
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        if (mode === 'pan' && downPos) {
          const d = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
          if (d < 6) {
            const hit = this._hitTest(e.clientX, e.clientY);
            if (hit && this.panel) {
              this.panel.open(this.state.contKey, this.state.isoKey, this.state.contName, this.state.countryName, hit.name);
            }
          }
        }
        mode = null; downPos = null; pinchStartDist = null;
      } else if (pointers.size === 1) {
        mode = 'pan';
        const remaining = [...pointers.values()][0];
        lastSingle = { x: remaining.x, y: remaining.y };
        downPos = null;
      }
    };
    canvas.addEventListener('pointerup', endPointer, { passive: false });
    canvas.addEventListener('pointercancel', endPointer, { passive: false });
    canvas.addEventListener('pointerleave', e => { if (pointers.has(e.pointerId)) endPointer(e); }, { passive: false });

    canvas.addEventListener('wheel', e => {
      if (!this.state) return;
      e.preventDefault(); e.stopPropagation();
      this.state.scale = Math.max(0.4, Math.min(15, this.state.scale * (1 - e.deltaY * 0.001)));
      this._draw();
    }, { passive: false });
  }
}
