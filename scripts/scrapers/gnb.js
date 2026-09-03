import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';
import { expandirPorTramos } from '../lib/tramos.js';

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

const ACENTOS = {
  acute: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' },
  grave: { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
  circ: { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
  uml: { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' },
};
const sinHtml = (s) =>
  N.limpiar(
    String(s ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;?/gi, ' ')
      // entidades con acento: &aacute; &agrave; &acirc; &auml; &ntilde; … (GNB escribe
      // "Cl&agrave;sicas" y si se pierde la vocal el tramo Clásica no se reconoce)
      .replace(/&([aeiouAEIOU])(acute|grave|circ|uml);?/g, (_, v, tipo) => ACENTOS[tipo]?.[v] ?? v)
      .replace(/&([nN])tilde;?/g, (_, n) => (n === 'N' ? 'Ñ' : 'ñ'))
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
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
    .flatMap((b) => {
      const mini = sinHtml(b.miniDescription);
      const desc = sinHtml(b.description);
      const texto = `${mini} ${desc}`;
      const { dias, todosLosDias } = N.parseDias(texto);
      const fila = {
        comercio: nombreComercio(b.title),
        // circleText es el % destacado ("-25%"); si falta, se busca en el texto
        porcentaje: N.parsePorcentajeMax(b.circleText) ?? N.parsePorcentajeMax(texto),
        porcentajes: N.parsePorcentajes(texto),
        tipo_beneficio: N.parseTipo(texto),
        nivel_min: null,
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
      // GNB discrimina por tarjeta en la descripción larga ("25% con Black, Black Premier y
      // Metalcard Premier. 20% con Clásicas, Oro"): una fila por tramo, con nivel_min.
      return expandirPorTramos(fila, desc);
    });
}

// Los títulos de GNB a veces son campañas y no comercios: "Día GNB Casa Rica",
// "Cibermiércoles Casa Rica". Se recorta el prefijo para emparejar con el comercio real.
function nombreComercio(titulo) {
  return N.limpiar(String(titulo ?? ''))
    .replace(/^(d[ií]a\s+gnb|ciber\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|jueves\s+de|lunes\s+de|martes\s+de|mi[eé]rcoles\s+de|viernes\s+de)\s+/i, '')
    .trim() || N.limpiar(titulo);
}
