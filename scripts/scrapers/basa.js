import * as cheerio from 'cheerio';
import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'BASA';
export const fuente = 'BASA web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.bancobasa.com.py/promociones-personas';

// BASA publica el catálogo como grilla de logos agrupada por campaña (H2).
// El % NO está en el HTML: vive en el PDF de bases, que es imagen escaneada.
// Por eso este scraper NO inventa porcentaje — sirve para detectar altas y bajas
// de comercios adheridos, que es donde más se desactualiza la base.
export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const out = [];
  const vistos = new Set();
  $('.promo-box').each((_, el) => {
    const box = $(el);
    const comercio = N.limpiar(box.find('.promo-name').first().text());
    if (!comercio) return;
    const k = N.claveComercio(comercio);
    if (vistos.has(k)) return;
    vistos.add(k);
    const campania = N.limpiar(
      box.closest('section').find('h2').first().text() ||
        box.closest('.promo-grid').prevAll('h2').first().text()
    );
    const href = box.find('a').attr('href') || box.closest('a').attr('href');
    out.push({
      comercio,
      porcentaje: null, // no publicado en HTML — se confirma contra el PDF de bases
      tipo_beneficio: null,
      dias: [],
      todos_los_dias: false,
      vence: null,
      tope_monto: null,
      tope_periodo: null,
      observacion: campania || null,
      link_oficial: href ? new URL(href, PAGINA).href : PAGINA,
      url_bases: null,
      externo_id: null,
      solo_presencia: true, // marca: sirve para altas/bajas, no para cambiar %
    });
  });
  return out;
}
