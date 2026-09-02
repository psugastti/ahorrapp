import * as cheerio from 'cheerio';
import { get, pool } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Universitaria';
export const fuente = 'Universitaria web oficial';
export const requiereNavegador = false;

const PAGINA = 'https://www.universitaria.coop/promociones';

// El índice lista categorías; cada comercio vive en /promociones/post/<categoria>.
export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const cats = new Set();
  $('a[href*="/promociones/post/"]').each((_, a) => {
    const h = $(a).attr('href');
    if (h) cats.add(new URL(h, PAGINA).href);
  });

  const paginas = await pool([...cats], 4, (url) => get(url, { timeout: 45000 }));

  const out = [];
  const vistos = new Set();
  paginas.forEach((res, i) => {
    if (!res.ok) return;
    const url = [...cats][i];
    const $$ = cheerio.load(res.value);
    const rubro = N.limpiar($$('h1, .title-card-promociones').first().text());
    $$('.card.promo-item').each((_, el) => {
      const card = $$(el);
      const texto = N.limpiar(card.find('.card-body').text());
      const comercio = N.limpiar(card.find('[rel="category"]').first().text());
      const detalle = N.limpiar(card.find('h6').first().text());
      const cuando = N.limpiar(card.find('p').first().text());
      if (!comercio || comercio.length < 2) return;
      const k = `${N.claveComercio(comercio)}|${rubro}`;
      if (vistos.has(k)) return;
      vistos.add(k);
      const { dias, todosLosDias } = N.parseDias(cuando || texto);
      out.push({
        comercio,
        porcentaje: N.parsePorcentajeMax(`${detalle} ${cuando}`),
        tipo_beneficio: N.parseTipo(`${detalle} ${cuando}`),
        dias,
        todos_los_dias: todosLosDias,
        vence: N.parseVence(texto),
        tope_monto: N.parseTope(texto),
        tope_periodo: N.parsePeriodoTope(texto),
        rubro,
        observacion: detalle || null,
        link_oficial: url,
        url_bases: card.find('a[href$=".pdf"]').attr('href') || null,
        externo_id: null,
      });
    });
  });
  return out;
}
