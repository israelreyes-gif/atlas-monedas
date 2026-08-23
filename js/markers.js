/**
 * markers.js
 * Dibuja los puntos de continente/país sobre el globo, con su nombre
 * flotando encima, y gestiona la navegación al tocarlos. No sabe nada de
 * Three.js "en crudo" más allá de lo que Globe ya expone (camera,
 * globeGroup) — así que si el día de mañana cambiamos el motor de render,
 * solo hay que tocar globe.js.
 *
 * Uso:
 *   const worldData = await loadWorldData('data/world.json');
 *   const markers = new MarkerLayer(globe, worldData);
 *   markers.mount();
 */
class MarkerLayer {
  constructor(globe, worldData) {
    this.globe = globe;
    this.data = worldData; // { contKey: { name, lat, lon, countries: { isoKey: {...} } } }
    this.path = [];        // [] = mundo · [contKey] = dentro de un continente
    this.markers = [];      // { mesh, label, kind, key, name }
    this.labelsLayer = null;
    this.raycaster = new THREE.Raycaster();

    // Punto de extensión: el siguiente paso (ciudades/D1) puede engancharse
    // aquí para reaccionar cuando se toca un país, sin tocar este archivo.
    this.onCountrySelected = null;
  }

  mount() {
    this._buildLabelsLayer();
    this._bindBreadcrumb();
    this.globe.onTap(e => this._handleTap(e));
    this._renderLevel();
    this._loop();
  }

  /** Vuelve al nivel "mundo" (lista de continentes). */
  goToWorld() {
    this.path = [];
    this._renderLevel();
    this._updateBreadcrumb();
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  _buildLabelsLayer() {
    const layer = document.createElement('div');
    layer.className = 'marker-labels';
    document.getElementById('app').appendChild(layer);
    this.labelsLayer = layer;
  }

  _bindBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (el) el.addEventListener('click', () => this.goToWorld());
  }

  _clearMarkers() {
    this.markers.forEach(m => {
      this.globe.globeGroup.remove(m.mesh);
      m.label.remove();
    });
    this.markers = [];
  }

  _addMarker(lat, lon, name, kind, key) {
    const r = 2.02;
    const pos = latLonToVec3(lat, lon, r);
    const size = kind === 'continent' ? 0.05 : 0.04;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xE4C476 })
    );
    mesh.position.copy(pos);
    mesh.userData = { kind, key, name };
    this.globe.globeGroup.add(mesh);

    const label = document.createElement('div');
    label.className = 'marker-label';
    label.textContent = name;
    this.labelsLayer.appendChild(label);

    this.markers.push({ mesh, label, kind, key, name });
  }

  _renderLevel() {
    this._clearMarkers();
    if (this.path.length === 0) {
      Object.entries(this.data).forEach(([key, c]) => this._addMarker(c.lat, c.lon, c.name, 'continent', key));
    } else if (this.path.length === 1) {
      const cont = this.data[this.path[0]];
      Object.entries(cont.countries).forEach(([key, c]) => this._addMarker(c.lat, c.lon, c.name, 'country', key));
    }
  }

  _handleTap(e) {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.globe.camera);
    const hits = this.raycaster.intersectObjects(this.markers.map(m => m.mesh));
    if (!hits.length) return;

    const { kind, key } = hits[0].object.userData;
    if (kind === 'continent') {
      this.path = [key];
      this._renderLevel();
      this._updateBreadcrumb();
    } else if (kind === 'country') {
      if (this.onCountrySelected) this.onCountrySelected(this.path[0], key);
    }
  }

  _updateBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    if (this.path.length === 0) {
      el.style.display = 'none';
    } else {
      el.style.display = 'flex';
      el.textContent = '‹ Mundo · ' + this.data[this.path[0]].name;
    }
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const worldPos = new THREE.Vector3();
    const camDir = this.globe.camera.position.clone().normalize();

    this.markers.forEach(m => {
      m.mesh.getWorldPosition(worldPos);
      const p = worldPos.clone().project(this.globe.camera);
      const x = (p.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
      const facing = worldPos.clone().normalize().dot(camDir);
      m.label.style.left = x + 'px';
      m.label.style.top = y + 'px';
      m.label.classList.toggle('show', facing > 0.15);
    });
  }
}
