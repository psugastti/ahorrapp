import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'FPJ';
export const fuente = 'FPJ web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.fpj.com.py/personas/tarjetas/beneficios';

// FPJ publica cada promo como imagen; todo el dato vive en el alt/title:
// "Petrosur 20% Reintegro Miércoles Todo el País Central 6 cuotas"
export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const vistos = new Set();
  const out = [];
  $('img[alt], img[title]').each((_, el) => {
    const texto = N.limpiar($(el).attr('alt') || $(el).attr('title'));
    if (!texto || !/%|cuotas/i.test(texto)) return;
    // el comercio es lo que va antes del primer número
    const comercio = N.limpiar(texto.split(/\s+\d/)[0]);
    if (!comercio || comercio.length < 2) return;
    const k = N.claveComercio(comercio);
    if (vistos.has(k)) return;
    vistos.add(k);
    const { dias, todosLosDias } = N.parseDias(texto);
    out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(texto),
      porcentajes: N.parsePorcentajes(texto),
      tipo_beneficio: N.parseTipo(texto),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      observacion: texto,
      link_oficial: PAGINA,
      url_bases: null,
      externo_id: null,
    });
  });
  return out;
}
