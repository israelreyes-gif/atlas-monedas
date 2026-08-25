import { json, corsHeaders } from "./utils.js";
import { handleRegister, handleLogin, handleLogout, verificarSesion } from "./auth.js";
import { handleBuscarMedicamentos, handleInfoMedicamento } from "./cima.js";
import { getMedicamentos, handlePostMedicamentos, handleGetHistorico } from "./medicamentos.js";
import { handleGetFichaEmergencia, handlePostFichaEmergencia } from "./emergencia.js";
import { handleGetEstadoDia, handlePostEstadoAnimo, handleGetEstadoMes, handleGetEstadoRango } from "./mood.js";
import { handleGetPushPublicKey, handleSuscribirPush, handleDesuscribirPush } from "./push.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/register" && request.method === "POST") {
        return await handleRegister(request, env);
      }

      if (url.pathname === "/login" && request.method === "POST") {
        return await handleLogin(request, env);
      }

      if (url.pathname === "/logout" && request.method === "POST") {
        return await handleLogout(request, env);
      }

      if (url.pathname === "/medicamentos-buscar" && request.method === "GET") {
        return await handleBuscarMedicamentos(request);
      }

      if (url.pathname === "/medicamento-info" && request.method === "GET") {
        return await handleInfoMedicamento(request);
      }

      if (url.pathname === "/push-public-key" && request.method === "GET") {
        return await handleGetPushPublicKey(env);
      }

      const usuarioId = await verificarSesion(request, env);
      if (!usuarioId) {
        return json({ error: "Sesión no válida o caducada. Inicia sesión de nuevo." }, 401);
      }

      if (url.pathname === "/medicamentos" && request.method === "GET") {
        const medicamentos = await getMedicamentos(env, usuarioId);
        return json({ medicamentos });
      }

      if (url.pathname === "/medicamentos" && request.method === "POST") {
        return await handlePostMedicamentos(request, env, usuarioId);
      }

      if (url.pathname === "/historico" && request.method === "GET") {
        return await handleGetHistorico(env, usuarioId);
      }

      if (url.pathname === "/ficha-emergencia" && request.method === "GET") {
        return await handleGetFichaEmergencia(env, usuarioId);
      }

      if (url.pathname === "/ficha-emergencia" && request.method === "POST") {
        return await handlePostFichaEmergencia(request, env, usuarioId);
      }

      if (url.pathname === "/estado-animo" && request.method === "GET") {
        return await handleGetEstadoDia(request, env, usuarioId);
      }

      if (url.pathname === "/estado-animo" && request.method === "POST") {
        return await handlePostEstadoAnimo(request, env, usuarioId);
      }

      if (url.pathname === "/estado-animo-mes" && request.method === "GET") {
        return await handleGetEstadoMes(request, env, usuarioId);
      }

      if (url.pathname === "/estado-animo-rango" && request.method === "GET") {
        return await handleGetEstadoRango(request, env, usuarioId);
      }

      if (url.pathname === "/push-suscribir" && request.method === "POST") {
        return await handleSuscribirPush(request, env, usuarioId);
      }

      if (url.pathname === "/push-desuscribir" && request.method === "POST") {
        return await handleDesuscribirPush(request, env, usuarioId);
      }

      return json({ error: "Ruta no encontrada" }, 404);
    } catch (err) {
      return json({ error: "Error interno: " + err.message }, 500);
    }
  },
};
