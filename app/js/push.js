// Notificaciones push: pedir permiso, suscribir el dispositivo, registrar el Service Worker

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('sw.js');
}

async function getPushSubscriptionActual() {
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

async function activarNotificacionesPush() {
  if (!(await pushSoportado())) {
    alert('Este dispositivo o navegador no soporta notificaciones push. En iPhone, asegúrate de tener la app instalada en la pantalla de inicio (no abierta desde Safari) y iOS 16.4 o superior.');
    return false;
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    alert('No se han activado las notificaciones. Puedes activarlas más tarde desde los ajustes del sistema.');
    return false;
  }

  try {
    const keyRes = await fetch(`${API_URL}/push-public-key`);
    const keyData = await keyRes.json();
    if (!keyRes.ok) throw new Error(keyData.error || 'No se pudo obtener la clave de notificaciones.');

    const registro = await navigator.serviceWorker.ready;
    let suscripcion = await registro.pushManager.getSubscription();

    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const suscripcionJson = suscripcion.toJSON();
    const res = await apiFetch('/push-suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: suscripcionJson.endpoint,
        keys: suscripcionJson.keys,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar la suscripción.');

    return true;
  } catch (err) {
    alert('No se pudieron activar las notificaciones: ' + err.message);
    return false;
  }
}

async function actualizarEstadoBotonPush() {
  const btn = document.getElementById('pushToggleBtn');
  if (!btn) return;

  if (!(await pushSoportado())) {
    btn.textContent = 'Notificaciones no disponibles en este dispositivo';
    btn.disabled = true;
    return;
  }

  const suscripcion = await getPushSubscriptionActual();
  if (suscripcion && Notification.permission === 'granted') {
    btn.textContent = '🔔 Notificaciones activadas';
    btn.classList.add('active');
  } else {
    btn.textContent = 'Activar notificaciones de recordatorio';
    btn.classList.remove('active');
  }
}

async function onPushToggleClick() {
  const btn = document.getElementById('pushToggleBtn');
  btn.disabled = true;
  const ok = await activarNotificacionesPush();
  btn.disabled = false;
  if (ok) {
    await actualizarEstadoBotonPush();
    alert('Notificaciones activadas. Te avisaremos al empezar cada franja (mañana, tarde y noche) si no has registrado tu estado.');
  }
}
