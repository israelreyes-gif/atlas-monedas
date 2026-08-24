export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/owned") {
      const { results } = await env.DB.prepare(
        "SELECT cont_key, iso_key, city_name FROM owned_cities"
      ).all();
      return Response.json(results, { headers: cors });
    }

    if (request.method === "POST" && url.pathname === "/toggle") {
      const { contKey, isoKey, cityName } = await request.json();
      if (!contKey || !isoKey || !cityName) {
        return Response.json({ error: "Faltan datos" }, { status: 400, headers: cors });
      }

      const existing = await env.DB.prepare(
        "SELECT 1 FROM owned_cities WHERE cont_key=? AND iso_key=? AND city_name=?"
      ).bind(contKey, isoKey, cityName).first();

      if (existing) {
        await env.DB.prepare(
          "DELETE FROM owned_cities WHERE cont_key=? AND iso_key=? AND city_name=?"
        ).bind(contKey, isoKey, cityName).run();
        return Response.json({ owned: false }, { headers: cors });
      } else {
        await env.DB.prepare(
          "INSERT INTO owned_cities (cont_key, iso_key, city_name) VALUES (?, ?, ?)"
        ).bind(contKey, isoKey, cityName).run();
        return Response.json({ owned: true }, { headers: cors });
      }
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
