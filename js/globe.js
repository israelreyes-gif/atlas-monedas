/**
 * globe.js
 * Encapsula todo lo relacionado con el globo 3D: escena, cámara, textura de
 * continentes, y los gestos de mover/hacer zoom. No sabe nada de ciudades,
 * países ni buscador — eso vendrá en un módulo aparte que use esta clase.
 *
 * Uso:
 *   const globe = new Globe(document.getElementById('globe-canvas'));
 *   await globe.loadBorders('data/borders.json');
 *   globe.mount();
 *   globe.zoomBy(-4); // desde un botón, por ejemplo
 */
class Globe {
  constructor(canvas) {
    this.canvas = canvas;
    this.borders = null;
    this.visible = true;

    // Orientación: dos ángulos independientes y sin límite (nunca se
    // acumulan por multiplicación repetida, se reconstruyen cada frame),
    // así se evita cualquier deriva y no hay zonas inalcanzables.
    this.yaw = -0.4;
    this.pitch = 0.15;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.flying = false;

    this.BASE_FOV = 45;
    this.FOV_MIN = 2.5;
    this.FOV_MAX = 55;
    this.camFov = this.BASE_FOV;
    this.targetFov = this.BASE_FOV;

    this._raf = null;
    this._pointers = new Map();
    this._mode = null;          // 'rotate' | 'pinch' | null
    this._lastSingle = null;
    this._pinchStartDist = null;
    this._downPos = null;

    this._onCityClick = null;   // reservado para cuando añadamos marcadores
  }

  /** Carga el GeoJSON simplificado de fronteras (solo para pintar la textura). */
  async loadBorders(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo cargar ' + url + ' (HTTP ' + res.status + ')');
    this.borders = await res.json();
  }

  /** Crea la escena Three.js y arranca el bucle de render + los gestos. */
  mount() {
    this._initScene();
    this._initTexture();
    this._bindGestures();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._animate();
  }

  /** Libera recursos y para el bucle de render (útil si algún día se desmonta la vista). */
  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resizeHandler);
  }

  zoomBy(delta) {
    this.targetFov = Math.max(this.FOV_MIN, Math.min(this.FOV_MAX, this.targetFov + delta));
  }

  /** Gira el globo hasta encarar esta lat/lon. Lo usará el buscador más adelante. */
  flyTo(lat, lon) {
    const local = latLonToVec3(lat, lon, 1);
    const { yaw, pitch } = yawPitchToFace(local);
    this.targetYaw = shortestAngleTarget(this.yaw, yaw);
    this.targetPitch = shortestAngleTarget(this.pitch, pitch);
    this.flying = true;
    this.targetFov = 10;
  }

  /** Registra un callback que se llama cuando el usuario toca la esfera sin arrastrar
   *  (usado por markers.js para saber cuándo se ha tocado un marcador). */
  onTap(callback) {
    this._onCityClick = callback;
  }

  /** Oculta/muestra el lienzo del globo (lo usa main.js al entrar/salir del mapa de país). */
  setVisible(v) {
    this.visible = v;
    this.canvas.style.display = v ? 'block' : 'none';
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  _initScene() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.BASE_FOV, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6.2); // fija para siempre: el zoom nunca mueve la cámara (evita el efecto "vértigo" de dolly zoom)

    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.85);
    dl.position.set(5, 3, 5);
    this.scene.add(dl);

    this._rebuildOrientation();
  }

  _initTexture() {
    const CONT_COLOR = {
      europa: 'rgba(120,140,180,0.55)',
      asia: 'rgba(150,120,175,0.5)',
      africa: 'rgba(190,150,100,0.5)',
      america_norte: 'rgba(110,165,135,0.5)',
      america_sur: 'rgba(190,120,110,0.5)',
      oceania: 'rgba(100,165,175,0.5)',
    };

    const w = 2048, h = 1024;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#16233a'); grad.addColorStop(1, '#0c1626');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(201,162,75,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 24; i++) { const x = i * w / 24; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let j = 0; j <= 12; j++) { const y = j * h / 12; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const ll = (lon, lat) => [(lon + 180) / 360 * w, (90 - lat) / 180 * h];
    const ringPath = (ring) => {
      ctx.moveTo(...ll(ring[0][0], ring[0][1]));
      for (let i = 1; i < ring.length; i++) ctx.lineTo(...ll(ring[i][0], ring[i][1]));
      ctx.closePath();
    };

    (this.borders || []).forEach(feat => {
      ctx.beginPath();
      const g = feat.geometry;
      if (g.type === 'Polygon') g.coordinates.forEach(ringPath);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(poly => poly.forEach(ringPath));
      ctx.fillStyle = CONT_COLOR[feat.cont] || 'rgba(140,140,140,0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(9,14,24,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 64),
      new THREE.MeshPhongMaterial({ map: tex, shininess: 5 })
    );
    this.globeGroup.add(sphere);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(2.004, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xC9A24B, wireframe: true, transparent: true, opacity: 0.05 })
    );
    this.globeGroup.add(wire);
  }

  _rebuildOrientation() {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.globeGroup.quaternion.copy(qYaw).multiply(qPitch);
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    this._raf = requestAnimationFrame(() => this._animate());
    if (!this.visible) return; // ahorra GPU mientras se ve el mapa plano de país

    if (this.flying) {
      this.yaw += (this.targetYaw - this.yaw) * 0.08;
      this.pitch += (this.targetPitch - this.pitch) * 0.08;
      this._rebuildOrientation();
      if (Math.abs(this.targetYaw - this.yaw) < 0.002 && Math.abs(this.targetPitch - this.pitch) < 0.002) {
        this.flying = false;
      }
    }

    this.camFov += (this.targetFov - this.camFov) * 0.12;
    this.camera.fov = this.camFov;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Gestos: 1 dedo/ratón = girar (horizontal y vertical, independientes,
   * sin límite). 2 dedos o rueda = zoom, nunca rota.
   *
   * IMPORTANTE — contención de eventos: además de touch-action:none en CSS,
   * aquí llamamos preventDefault()/stopPropagation() de forma agresiva en
   * cada evento. El motivo es evitar que un arrastre largo (sobre todo
   * vertical) se filtre hacia arriba y lo interprete como gesto nativo el
   * contenedor que envuelve esta página (por ejemplo el "deslizar hacia
   * abajo para cerrar" de un visor). Desplegada como PWA independiente esto
   * no debería hacer falta, pero no está de más.
   */
  _bindGestures() {
    const canvas = this.canvas;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    // Safari dispara sus propios eventos de gesto para el pellizco; si no
    // los bloqueamos, compiten con nuestro cálculo del pinch por pointer events.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
      canvas.addEventListener(evt, e => e.preventDefault());
    });

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.flying = false;

      if (this._pointers.size === 1) {
        this._mode = 'rotate';
        this._lastSingle = { x: e.clientX, y: e.clientY };
        this._downPos = { x: e.clientX, y: e.clientY };
      } else if (this._pointers.size === 2) {
        this._mode = 'pinch';
        const pts = [...this._pointers.values()];
        this._pinchStartDist = dist(pts[0], pts[1]);
        this._downPos = null;
      }
    }, { passive: false });

    canvas.addEventListener('pointermove', e => {
      if (!this._pointers.has(e.pointerId)) return;
      e.preventDefault(); e.stopPropagation();
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._mode === 'pinch' && this._pointers.size === 2) {
        const pts = [...this._pointers.values()];
        const d = dist(pts[0], pts[1]);
        this.zoomBy((this._pinchStartDist - d) * 0.08);
        this._pinchStartDist = d;
        return;
      }

      if (this._mode === 'rotate' && this._pointers.size === 1) {
        const dx = e.clientX - this._lastSingle.x, dy = e.clientY - this._lastSingle.y;
        this._lastSingle = { x: e.clientX, y: e.clientY };
        this.yaw += dx * 0.0065;
        this.pitch += dy * 0.0065;
        this.targetYaw = this.yaw; this.targetPitch = this.pitch;
        this._rebuildOrientation();
      }
    }, { passive: false });

    const endPointer = (e) => {
      e.preventDefault(); e.stopPropagation();
      this._pointers.delete(e.pointerId);
      if (this._pointers.size === 0) {
        if (this._mode === 'rotate' && this._downPos) {
          const d = Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y);
          if (d < 6 && this._onCityClick) this._handleTap(e);
        }
        this._mode = null; this._downPos = null; this._pinchStartDist = null;
      } else if (this._pointers.size === 1) {
        this._mode = 'rotate';
        const remaining = [...this._pointers.values()][0];
        this._lastSingle = { x: remaining.x, y: remaining.y };
        this._downPos = null;
      }
    };
    canvas.addEventListener('pointerup', endPointer, { passive: false });
    canvas.addEventListener('pointercancel', endPointer, { passive: false });
    canvas.addEventListener('pointerleave', e => { if (this._pointers.has(e.pointerId)) endPointer(e); }, { passive: false });

    canvas.addEventListener('wheel', e => {
      e.preventDefault(); e.stopPropagation();
      this.zoomBy(e.deltaY * 0.03);
    }, { passive: false });
  }

  // Punto de extensión para el siguiente paso (marcadores de ciudad).
  _handleTap(e) {
    if (this._onCityClick) this._onCityClick(e);
  }
}
