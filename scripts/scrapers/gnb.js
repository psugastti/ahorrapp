import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'GNB';
export const fuente = 'GNB API oficial';
export const requiereNavegador = false;

// El sitio viejo (beneficiosbancognb.com.py a secas) tiene Akamai y además el
// certificado no valida sin www. Pero el sitio nuevo /v2/ es un Angular que se
// alimenta de esta API pública, y la API responde a un fetch normal: no hace
// falta navegador. `pageSize` es el único parámetro de paginación que funciona.
const API =
  'https://www.beneficiosbancognb.com.py/v2/apis/rewards/rewards/v1/benefits/benefits?pageSize=1000';
const SITIO = 'https://www.beneficiosbancognb.com.py/v2/beneficios';

const sinHtml = (s) =>
  N.limpiar(
    String(s ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;?/gi, ' ')
      .replace(/&aacute;?/gi, 'á').replace(/&eacute;?/gi, 'é').replace(/&iacute;?/gi, 'í')
      .replace(/&oacute;?/gi, 'ó').replace(/&uacute;?/gi, 'ú').replace(/&ntilde;?/gi, 'ñ')
      .replace(/&[a-z]+;/gi, ' ')
  );

export async function run() {
  // Akamai filtra por headers, no solo por IP: con el UA pelado devuelve 403 desde
  // los runners de GitHub, y con el juego completo de headers de Chrome devuelve 200.
  const j = await get(API, {
    as: 'json',
    timeout: 60000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'es-PY,es;q=0.9,en;q=0.8',
      Referer: SITIO,
      Origin: 'https://www.beneficiosbancognb.com.py',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  const filas = j.data ?? (Array.isArray(j) ? j : []);

  return filas
    .filter((b) => b.status !== false)
    .map((b) => {
      const mini = sinHtml(b.miniDescription);
      const desc = sinHtml(b.description);
      const texto = `${mini} ${desc}`;
      const { dias, todosLosDias } = N.parseDias(texto);
      return {
        comercio: N.limpiar(b.title),
        // circleText es el % destacado ("-25%"); si falta, se busca en el texto
        porcentaje: N.parsePorcentajeMax(b.circleText) ?? N.parsePorcentajeMax(texto),
        porcentajes: N.parsePorcentajes(texto),
        tipo_beneficio: N.parseTipo(texto),
        dias,
        todos_los_dias: todosLosDias,
        vence: b.endDate ? String(b.endDate).slice(0, 10) : null,
        tope_monto: N.parseTope(texto),
        tope_periodo: N.parsePeriodoTope(texto),
        rubro: N.limpiar(b.category?.name ?? b.category?.title) || null,
        observacion: mini || desc.slice(0, 300) || null,
        link_oficial: SITIO,
        url_bases: null,
        externo_id: b.id != null ? String(b.id) : null,
      };
    });
}
