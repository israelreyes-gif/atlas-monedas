/**
 * markers.js
 * Dibuja los puntos de continente/país sobre el globo, con su nombre
 * flotando encima, y gestiona la navegación al tocarlos. Al tocar un país
 * ya no dibuja ciudades aquí — avisa hacia fuera (onCountrySelected) y es
 * main.js quien decide mostrar el mapa plano de ese país (country-map.js).
 *
 * Cada marcador tiene DOS esferas: una pequeña visible (el punto que se
 * ve) y otra más grande e invisible (contra la que se comprueba el toque),
 * para que sea fácil acertar con el dedo.
 */
class MarkerLayer {
  constructor(globe, worldData) {
    this.globe = globe;
    this.data = worldData; // { contKey: { name, lat, lon, countries: { isoKey: {...} } } }
    this.path = [];        // [] mundo · [contKey] dentro de un continente
    this.markers = [];      // { visMesh, hitMesh, label, kind, key, name }
    this.labelsLayer = null;
    this.raycaster = new THREE.Raycaster();

    this.onCountrySelected = null; // (contKey, isoKey) => {}
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

  /** Vuelve al nivel "país" de un continente concreto (usado al salir del mapa plano). */
  goToContinent(contKey) {
    this.path = [contKey];
    this._renderLevel();
    this._updateBreadcrumb();
  }

  /** Oculta/muestra la capa de etiquetas HTML (los nombres flotantes). El
   *  globo 3D se puede tapar con display:none en su <canvas>, pero estas
   *  etiquetas viven en un <div> aparte y hay que ocultarlas explícitamente. */
  hideLabels() {
    if (this.labelsLayer) this.labelsLayer.style.display = 'none';
  }
  showLabels() {
    if (this.labelsLayer) this.labelsLayer.style.display = 'block';
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
      this.globe.globeGroup.remove(m.visMesh);
      this.globe.globeGroup.remove(m.hitMesh);
      m.label.remove();
    });
    this.markers = [];
  }

  _addMarker(lat, lon, name, kind, key) {
    const r = 2.02;
    const pos = latLonToVec3(lat, lon, r);
    const visSize = kind === 'continent' ? 0.05 : 0.04;
    const hitSize = visSize * 2.6;

    const visMesh = new THREE.Mesh(
      new THREE.SphereGeometry(visSize, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xE4C476 })
    );
    visMesh.position.copy(pos);
    this.globe.globeGroup.add(visMesh);

    const hitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(hitSize, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.copy(pos);
    hitMesh.userData = { kind, key, name };
    this.globe.globeGroup.add(hitMesh);

    const label = document.createElement('div');
    label.className = 'marker-label';
    label.textContent = name;
    this.labelsLayer.appendChild(label);

    this.markers.push({ visMesh, hitMesh, label, kind, key, name });
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
    const hits = this.raycaster.intersectObjects(this.markers.map(m => m.hitMesh));
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
      m.visMesh.getWorldPosition(worldPos);
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
