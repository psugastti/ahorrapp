import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Familiar';
export const fuente = 'Familiar web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.familiar.com.py/promociones-tarjetas';

// Familiar es un sitio Webflow: la colección real de promos son los .w-dyn-item que
// enlazan a /pdfs/ (las bases). Los otros .w-dyn-item son filtros de categoría/ciudad.
export async function run() {
  const out = [];
  const vistos = new Set();

  // Webflow pagina la colección (?<hash>_page=N). Se sigue "Siguiente" hasta el final.
  let url = PAGINA;
  for (let pagina = 1; pagina <= 40 && url; pagina++) {
    const $ = cheerio.load(await get(url, { timeout: 45000 }));
    recolectar($, out, vistos);
    const sig = $('a.w-pagination-next').attr('href');
    url = sig ? new URL(sig, PAGINA).href : null;
  }
  return out;
}

function recolectar($, out, vistos) {
  $('.w-dyn-item').each((_, el) => {
    const card = $(el);
    const bases = card.find('a[href*="/pdfs/"]').attr('href');
    if (!bases) return;
    const texto = N.limpiar(card.text());
    // el título del comercio es el primer encabezado del item
    const comercio =
      N.limpiar(card.find('h1, h2, h3, h4, .text-l, .all-caps').first().text()) ||
      N.limpiar(texto.split(/\s{2,}/)[0]);
    if (!comercio || comercio.length < 2) return;
    const k = `${N.claveComercio(comercio)}|${bases}`;
    if (vistos.has(k)) return;
    vistos.add(k);
    const { dias, todosLosDias } = N.parseDias(texto);
    return out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(texto),
      porcentajes: N.parsePorcentajes(texto),
      tipo_beneficio: N.parseTipo(texto),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      observacion: texto.slice(0, 300) || null,
      link_oficial: PAGINA,
      url_bases: new URL(bases, PAGINA).href,
      externo_id: null,
    });
  });
}
