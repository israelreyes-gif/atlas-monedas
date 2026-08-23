/**
 * geo-utils.js
 * Funciones matemáticas puras para proyectar coordenadas lat/lon.
 * No depende de Three.js ni del DOM — reutilizable también en el futuro
 * mapa plano de país, en tests, etc.
 */

/**
 * Convierte lat/lon a un punto 3D sobre una esfera de radio r,
 * con el eje +Y como polo norte y el meridiano de Greenwich mirando hacia +Z
 * cuando lon=0. Usado tanto para dibujar la textura del globo como para
 * situar el marcador de una ciudad.
 */
function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Dado un vector unitario local (salida de latLonToVec3 con r=1), calcula
 * los ángulos (yaw, pitch) que, aplicados como Ry(yaw) * Rx(pitch), traen
 * ese punto justo de cara a la cámara (0,0,1). Es la inversa de la rotación
 * que usa Globe para orientar la esfera — se usa para el futuro "volar hasta
 * esta ciudad" del buscador.
 */
function yawPitchToFace(localUnitVec) {
  const { x, y, z } = localUnitVec;
  const pitch = Math.atan2(y, z);
  const r = Math.hypot(y, z);
  const yaw = Math.atan2(-x, r);
  return { yaw, pitch };
}

/** Menor diferencia angular (en radianes) para animar por el camino corto. */
function shortestAngleTarget(current, target) {
  const twoPi = Math.PI * 2;
  const delta = ((target - current + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return current + delta;
}
