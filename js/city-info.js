/**
 * city-info.js
 * Trae una foto real y un resumen desde Wikipedia para una ciudad. Prueba
 * primero en español; si no hay artículo, prueba en inglés. Wikipedia
 * permite estas llamadas directamente desde el navegador (CORS abierto),
 * así que no hace falta pasar por ningún servidor propio ni clave de API.
 *
 * Devuelve null si no se encuentra nada en ninguno de los dos idiomas.
 */
async function fetchCityInfo(cityName, countryName) {
  const es = await tryWiki('es', cityName, countryName);
  if (es) return es;
  return tryWiki('en', cityName, countryName);
}

async function tryWiki(lang, cityName, countryName) {
  try {
    const title = await searchTitle(lang, cityName + ' ' + countryName);
    if (!title) return null;
    const summary = await fetchSummary(lang, title);
    if (!summary || summary.type === 'disambiguation') return null;
    return {
      title: summary.title,
      extract: summary.extract,
      imageUrl: (summary.originalimage && summary.originalimage.source) ||
                (summary.thumbnail && summary.thumbnail.source) || null,
      pageUrl: summary.content_urls && summary.content_urls.desktop && summary.content_urls.desktop.page,
    };
  } catch (err) {
    console.error('city-info: fallo consultando Wikipedia (' + lang + ')', err);
    return null;
  }
}

async function searchTitle(lang, query) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.query && data.query.search && data.query.search[0];
  return hit ? hit.title : null;
}

async function fetchSummary(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
