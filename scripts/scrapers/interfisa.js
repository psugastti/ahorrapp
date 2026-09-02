import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Interfisa';
export const fuente = 'Interfisa web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.interfisa.com.py/beneficios';

export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const out = [];
  $('.cards-con-modal-item').each((_, el) => {
    const card = $(el);
    const texto = N.limpiar(card.text());
    const comercio = N.limpiar(card.find('.fw-bold').first().text());
    if (!comercio) return;
    const { dias, todosLosDias } = N.parseDias(texto);
    out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(texto),
      tipo_beneficio: N.parseTipo(texto),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      observacion: texto.slice(0, 500) || null,
      link_oficial: card.find('a').attr('href')
        ? new URL(card.find('a').attr('href'), PAGINA).href
        : PAGINA,
      url_bases: null,
      externo_id: null,
    });
  });
  return out;
}
