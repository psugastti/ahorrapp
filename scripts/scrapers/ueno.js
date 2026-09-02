import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Ueno';
export const fuente = 'Ueno catálogo mensual (PDF oficial)';
export const requiereNavegador = false;

const INDICE = 'https://www.ueno.com.py/alianzas-ueno/';

// Ueno publica un PDF mensual. Se probó parsearlo: el texto sale, pero los nombres
// de comercio están como LOGOS, no como texto — extraerlos daría nombres inventados.
// Contra la regla de oro del proyecto. Así que este scraper NO carga beneficios:
// detecta el catálogo del mes y avisa que hay que cargarlo a mano.
export async function run() {
  const html = await get(INDICE, { timeout: 45000 });
  const pdfs = [...html.matchAll(/href="([^"]*BENEFICIOS-ueno[^"]*\.pdf)"/gi)].map((m) => m[1]);
  if (!pdfs.length) return [];
  const url = new URL(pdfs[0], INDICE).href;

  const mes = url.match(/ueno-([a-z]+)(\d{4})\.pdf/i);
  const etiqueta = mes ? `${mes[1]} ${mes[2]}` : 'del mes';
  const vigencia = N.limpiar(
    html.match(/del\s+\d{1,2}\s+al\s+\d{1,2}\s+de\s+[a-záéíóú]+(\s+de\s+\d{4})?/i)?.[0] || ''
  );

  return [
    {
      comercio: `CATÁLOGO UENO ${etiqueta.toUpperCase()}`,
      porcentaje: null,
      tipo_beneficio: null,
      dias: [],
      todos_los_dias: false,
      vence: null,
      tope_monto: null,
      tope_periodo: null,
      observacion:
        `Catálogo ueno publicado${vigencia ? ` (${vigencia})` : ''}. ` +
        'Los comercios están como imagen en el PDF: hay que cargarlos a mano. ' +
        'Niveles ueno+ 1-5 → 10/15/25/30/40%.',
      link_oficial: INDICE,
      url_bases: url,
      externo_id: etiqueta,
      revisar_a_mano: true,
    },
  ];
}
