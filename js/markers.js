/**
 * markers.js
 * Dibuja los puntos de continente/país/ciudad sobre el globo, con su
 * nombre flotando encima, y gestiona la navegación al tocarlos.
 *
 * Uso:
 *   const collection = new Collection();
 *   const panel = new CityPanel(document.getElementById('panel'), collection);
 *   const markers = new MarkerLayer(globe, worldData, collection, panel);
 *   markers.mount();
 */
class MarkerLayer {
  constructor(globe, worldData, collection, panel) {
    this.globe = globe;
    this.data = worldData; // { contKey: { name, lat, lon, countries: { isoKey: {...} } } }
    this.collection = collection;
    this.panel = panel;
    this.path = [];        // [] mundo · [contKey] país · [contKey, isoKey] ciudad
    this.markers = [];      // { mesh, label, kind, key, name }
    this.labelsLayer = null;
    this.raycaster = new THREE.Raycaster();

    if (this.panel) {
      this.panel.onToggle = () => this._renderLevel(); // repinta el color del punto tocado
    }
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
    if (this.panel) this.panel.close();
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

  _addMarker(lat, lon, name, kind, key, owned) {
    const r = 2.02;
    const pos = latLonToVec3(lat, lon, r);
    const size = kind === 'continent' ? 0.05 : (kind === 'country' ? 0.04 : 0.035);
    const color = kind === 'city' ? (owned ? 0xC9A24B : 0x4A5568) : 0xE4C476;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color })
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
    } else if (this.path.length === 2) {
      const [contKey, isoKey] = this.path;
      const country = this.data[contKey].countries[isoKey];
      country.cities.forEach(c => {
        const [name, lat, lon] = c;
        const owned = this.collection ? this.collection.isOwned(contKey, isoKey, name) : false;
        this._addMarker(lat, lon, name, 'city', name, owned);
      });
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
      if (this.panel) this.panel.close();
    } else if (kind === 'country') {
      this.path = [this.path[0], key];
      this._renderLevel();
      this._updateBreadcrumb();
      if (this.panel) this.panel.close();
    } else if (kind === 'city') {
      const [contKey, isoKey] = this.path;
      if (this.panel) {
        this.panel.open(contKey, isoKey, this.data[contKey].name, this.data[contKey].countries[isoKey].name, key);
      }
    }
  }

  _updateBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    if (this.path.length === 0) {
      el.style.display = 'none';
    } else {
      el.style.display = 'flex';
      const cont = this.data[this.path[0]];
      let text = '‹ Mundo · ' + cont.name;
      if (this.path[1]) text += ' · ' + cont.countries[this.path[1]].name;
      el.textContent = text;
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
