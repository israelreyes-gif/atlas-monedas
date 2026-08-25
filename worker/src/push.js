import { json } from "./utils.js";

export async function handleGetPushPublicKey(env) {
  if (!env.VAPID_PUBLIC_KEY) {
    return json({ error: "Las notificaciones no están configuradas todavía." }, 500);
  }
  return json({ publicKey: env.VAPID_PUBLIC_KEY });
}

export async function handleSuscribirPush(request, env, usuarioId) {
  const body = await request.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return json({ error: "Suscripción no válida." }, 400);
  }

  const ahora = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO suscripciones_push (usuario_id, endpoint, p256dh, auth, creado_en)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       usuario_id = excluded.usuario_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth`
  )
    .bind(usuarioId, endpoint, keys.p256dh, keys.auth, ahora)
    .run();

  return json({ ok: true });
}

export async function handleDesuscribirPush(request, env, usuarioId) {
  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return json({ error: "Falta el endpoint a eliminar." }, 400);
  }

  await env.DB.prepare(
    "DELETE FROM suscripciones_push WHERE endpoint = ? AND usuario_id = ?"
  )
    .bind(endpoint, usuarioId)
    .run();

  return json({ ok: true });
}
