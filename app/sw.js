// Service Worker — corre en segundo plano, independiente de si la app está abierta.
// Su única misión aquí es recibir la notificación push del servidor y mostrarla.

self.addEventListener('push', (event) => {
  let data = { titulo: 'Diario médico', cuerpo: '¿Cómo te sientes ahora?' };
  try {
    if (event.data) data = event.data.json();
  } catch (err) {
    // si el payload no es JSON válido, usamos el texto por defecto de arriba
  }

  const opciones = {
    body: data.cuerpo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: data.url || './' },
  };

  event.waitUntil(self.registration.showNotification(data.titulo, opciones));
});

// Al tocar la notificación, abre (o enfoca) la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
