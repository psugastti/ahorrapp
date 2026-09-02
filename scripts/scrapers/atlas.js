import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Atlas';
export const fuente = 'Atlas web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.bancoatlas.com.py/web/beneficios';

// Atlas publica cada promo con atributos data-* limpios: es la fuente más estructurada
// después de las APIs. data-expired="true" marca las vencidas.
export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const out = [];
  $('[data-pct]').each((_, el) => {
    const card = $(el);
    const comercio =
      N.limpiar(card.attr('data-nombre')) ||
      N.limpiar(card.find('h2, h3, h4, .font-semibold').first().text());
    if (!comercio) return;
    const desc = N.limpiar(card.attr('data-desc'));
    const texto = `${N.limpiar(card.text())} ${desc}`;
    const { dias, todosLosDias } = N.parseDias(texto);
    let cats = [];
    try { cats = JSON.parse(card.attr('data-categoria') || '[]'); } catch {}
    return out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(card.attr('data-pct') || texto),
      tipo_beneficio: N.parseTipo(texto),
      dias,
      todos_los_dias: todosLosDias,
      vence: card.attr('data-expired') === 'true' ? '1970-01-01' : N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      rubro: cats[0] || null,
      observacion: desc || null,
      link_oficial: card.find('a').attr('href')
        ? new URL(card.find('a').attr('href'), PAGINA).href
        : PAGINA,
      url_bases: null,
      externo_id: null,
    });
  });
  return out;
}
