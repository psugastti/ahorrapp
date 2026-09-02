import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Solar';
export const fuente = 'Solar web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.solar.com.py/promociones';

export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const out = [];
  $('.w-full.md\\:w-2\\/3.relative').each((_, el) => {
    const card = $(el);
    const comercio = N.limpiar(card.find('.text-xl.font-semibold').first().text());
    if (!comercio) return;
    const destacado = N.limpiar(card.find('.text-primary.text-3xl').first().text());
    const texto = N.limpiar(card.text());
    const { dias, todosLosDias } = N.parseDias(texto);
    out.push({
      comercio,
      // El número grande a veces es "6" (cuotas) y no un %: solo se toma si trae %.
      porcentaje: N.parsePorcentaje(destacado) ?? N.parsePorcentajeMax(texto),
      porcentajes: N.parsePorcentajes(texto),
      tipo_beneficio: N.parseTipo(texto) || (/^\d+$/.test(destacado) ? 'cuotas' : null),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      observacion: null,
      link_oficial: card.find('a').attr('href')
        ? new URL(card.find('a').attr('href'), PAGINA).href
        : PAGINA,
      url_bases: null,
      externo_id: null,
    });
  });
  return out;
}
