import * as cheerio from 'cheerio';
import * as N from '../lib/normalize.js';
import { conNavegador } from '../lib/navegador.js';

export const banco = 'GNB';
export const fuente = 'GNB catálogo oficial';
export const requiereNavegador = true; // 403 con fetch: tiene anti-bot

// Con el dominio pelado el certificado no valida (ERR_SSL_UNRECOGNIZED_NAME_ALERT):
// hay que entrar por www. Y el catálogo vive en /beneficios/, no en la raíz.
const PAGINA = 'https://www.beneficiosbancognb.com.py/beneficios/';

export async function run() {
  const html = await conNavegador(PAGINA, { esperar: '.card, .beneficio, article' });
  const $ = cheerio.load(html);
  const out = [];
  $('.card, .beneficio, article').each((_, el) => {
    const card = $(el);
    const texto = N.limpiar(card.text());
    const comercio = N.limpiar(card.find('h2, h3, h4, .title, .nombre').first().text());
    if (!comercio || texto.length < 5) return;
    const { dias, todosLosDias } = N.parseDias(texto);
    const href = card.find('a').attr('href');
    out.push({
      comercio,
      porcentaje: N.parsePorcentajeMax(texto),
      tipo_beneficio: N.parseTipo(texto),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(texto),
      tope_monto: N.parseTope(texto),
      tope_periodo: N.parsePeriodoTope(texto),
      observacion: null,
      link_oficial: href ? new URL(href, PAGINA).href : PAGINA,
      url_bases: null,
      externo_id: null,
    });
  });
  return out;
}
