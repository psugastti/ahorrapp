import * as cheerio from 'cheerio';
import { get, pool } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Sudameris';
export const fuente = 'Sudameris web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.sudameris.com.py/beneficios';

// Sudameris tiene una página de detalle por beneficio, con VIGENCIA y BENEFICIOS
// en texto plano. Es mucho más confiable que los ~25 PDFs de bases por ciudad.
export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const urls = new Set();
  $('a[href*="/detalle"]').each((_, a) => {
    const h = $(a).attr('href');
    if (h) urls.add(new URL(h, PAGINA).href);
  });

  const paginas = await pool([...urls], 5, (u) => get(u, { timeout: 45000 }));
  const lista = [...urls];
  const out = [];

  paginas.forEach((res, i) => {
    if (!res.ok) return;
    const $$ = cheerio.load(res.value);
    $$('style, script, nav, header, footer').remove();
    const cuerpo = N.limpiar($$('#main, main, body').first().text());
    const comercio = N.limpiar($$('h3').first().text());
    if (!comercio) return;

    // el bloque de vigencia trae la fecha textual
    const vigencia = cuerpo.match(/vigencia[\s\S]{0,160}/i)?.[0] || cuerpo;
    const { dias, todosLosDias } = N.parseDias(cuerpo);
    out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(cuerpo),
      porcentajes: N.parsePorcentajes(cuerpo),
      tipo_beneficio: N.parseTipo(cuerpo),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(vigencia),
      tope_monto: N.parseTope(cuerpo),
      tope_periodo: N.parsePeriodoTope(cuerpo),
      observacion: cuerpo.slice(0, 400) || null,
      link_oficial: lista[i],
      url_bases: null,
      externo_id: lista[i].match(/destacado\/(\d+)/)?.[1] || null,
    });
  });
  return out;
}
