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
 * Dado un vector unitario local, calcula (yaw, pitch) tales que, aplicando
 * primero el giro horizontal y DESPUÉS el vertical (Rx(pitch) · Ry(yaw)),
 * ese punto queda mirando a cámara (0,0,1). Este orden concreto es
 * importante: aplicar el vertical antes que el horizontal inclina el
 * "norte" del globo cuanto más lejos del ecuador esté el punto — con este
 * orden, el polo norte se queda siempre recto en pantalla, para cualquier
 * combinación de ángulos.
 */
function yawPitchToFace(localUnitVec) {
  const { x, y, z } = localUnitVec;
  const yaw = Math.atan2(-x, z);
  const ux = x * Math.cos(yaw) + z * Math.sin(yaw); // ~0 por construcción
  const uz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const pitch = Math.atan2(y, uz);
  return { yaw, pitch };
}

/** Menor diferencia angular (en radianes) para animar por el camino corto. */
function shortestAngleTarget(current, target) {
  const twoPi = Math.PI * 2;
  const delta = ((target - current + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return current + delta;
}
