import * as cheerio from 'cheerio';
import { get, pool } from '../lib/http.js';
import { textoDePdf } from '../lib/pdf.js';
import { nivelMinDe, etiquetaAfinidades } from '../lib/afinidades.js';
import * as N from '../lib/normalize.js';

export const banco = 'Interfisa';
export const fuente = 'Interfisa bases y condiciones (PDF oficial)';
export const requiereNavegador = false;

const PAGINA = 'https://www.interfisa.com.py/beneficios';

// La tarjeta del catálogo solo dice "20% o 25% de reintegro". El detalle de QUÉ
// tarjeta lleva cada tramo, el tope, los días y la vigencia real están en el PDF
// de bases de cada comercio, que es texto y tiene siempre la misma estructura:
//   1. Vigencia  "válida todos los viernes a domingo desde el 01/10/2025 al 01/10/2026"
//   3. Beneficios "• 20% de reintegro con las afinidades Classic, Gold. Máximo Gs 500.000
//                  • 25% de reintegro con las afinidades Visa Platinum, Infinite y MC Black…"
// Se emite UNA FILA POR TRAMO, con nivel_min según las afinidades (modelo de la base).

/** El extractor de PDF separa dígitos con espacios: "2 0 %", "0 1 / 11 /2025", "1 . 5 00.000". */
function compactarNumeros(t) {
  let s = t;
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/(\d)\s+(?=[\d%])/g, '$1')
      .replace(/(\d)\s+([./])\s*(?=\d)/g, '$1$2')
      .replace(/(\d)\s*([./])\s+(?=\d)/g, '$1$2');
  }
  return s;
}

/** Parte el texto en secciones "1. Vigencia", "2. Condiciones", "3. Beneficios"… ANTES
 *  de compactar números, porque compactar pegaría "…al 01/10/2026 2. Condiciones". */
function secciones(texto) {
  const partes = texto.split(/\s(?=\d\.\s+[A-ZÁÉÍÓÚ][a-záéíóú])/);
  const out = {};
  for (const p of partes) {
    const m = p.match(/^(\d)\.\s+(.*)$/s);
    if (m) out[m[1]] = compactarNumeros(m[2]);
  }
  return out;
}

function parsearBases(texto) {
  const sec = secciones(texto);

  // --- vigencia y días ---
  const vig = sec['1'] ?? '';
  const fechas = [...vig.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].map((m) => m[1]);
  const vence = fechas.length ? N.parseVence(fechas[fechas.length - 1]) : null;
  const fraseDias = vig.match(/v[aá]lida\s+(.*?)\s+desde/i)?.[1] ?? vig;
  const { dias, todosLosDias } = N.parseDias(fraseDias);

  // --- beneficios por tramo ---
  const bloque = (sec['3'] ?? '').replace(/^Beneficios?\s*:?\s*/i, '');
  const topeCompra = bloque.match(/tope de compra\s+(?:mensual\s+)?(?:de\s+)?gs\.?\s*([\d.]+)/i)?.[1];
  const tramos = [];
  const cuotas = [];

  for (const item of bloque.split('•').map((x) => N.limpiar(x)).filter(Boolean)) {
    const pct = item.match(/^(?:hasta\s+)?(\d{1,2})\s*%/i);
    const afin = item.match(/afinidades?\s+([^.]+?)(?:\s*\.|\s+m[aá]ximo|\s+durante|$)/i)?.[1] ?? '';
    const maxReintegro = item.match(/m[aá]ximo de reintegro\s+gs\.?\s*([\d.]+)/i)?.[1];
    if (pct) {
      tramos.push({
        porcentaje: parseInt(pct[1], 10),
        tipo_beneficio: N.parseTipo(item) ?? 'reintegro',
        afinidades: etiquetaAfinidades(afin),
        nivel_min: nivelMinDe(afin),
        tope_monto: maxReintegro ? parseInt(maxReintegro.replace(/\./g, ''), 10) : null,
      });
    } else if (/cuotas?\s+sin\s+inter/i.test(item)) {
      cuotas.push(N.limpiar(item));
    }
  }

  return { vence, dias, todosLosDias, tramos, cuotas, topeCompra: topeCompra ? parseInt(topeCompra.replace(/\./g, ''), 10) : null };
}

export async function run() {
  const $ = cheerio.load(await get(PAGINA, { timeout: 45000 }));
  const cards = [];
  $('.cards-con-modal-item').each((_, el) => {
    const card = $(el);
    const comercio = N.limpiar(card.find('.fw-bold').first().text());
    const resumen = N.limpiar(card.find('.fw-bold').eq(1).text());
    const pdf = card.find('a[href$=".pdf"]').attr('href');
    if (comercio) cards.push({ comercio, resumen, pdf: pdf ? new URL(pdf, PAGINA).href : null });
  });

  const lecturas = await pool(cards, 6, async (c) => (c.pdf ? parsearBases(await textoDePdf(c.pdf)) : null));

  const out = [];
  cards.forEach((c, i) => {
    const b = lecturas[i]?.ok ? lecturas[i].value : null;
    const base = {
      comercio: c.comercio,
      link_oficial: PAGINA,
      url_bases: c.pdf,
      externo_id: null,
    };

    if (b && b.tramos.length) {
      for (const tr of b.tramos) {
        out.push({
          ...base,
          porcentaje: tr.porcentaje,
          porcentajes: [tr.porcentaje],
          tipo_beneficio: tr.tipo_beneficio,
          nivel_min: tr.nivel_min,
          dias: b.dias,
          todos_los_dias: b.todosLosDias,
          vence: b.vence,
          tope_monto: tr.tope_monto,
          tope_periodo: tr.tope_monto ? 'mensual' : null,
          observacion: [
            `${tr.porcentaje}% con ${tr.afinidades}`,
            b.topeCompra ? `Tope de compra mensual Gs ${b.topeCompra.toLocaleString('es-PY')}` : null,
            b.cuotas[0] || null,
          ].filter(Boolean).join(' · '),
        });
      }
      return;
    }

    // Sin PDF legible o promo solo de cuotas: se cae al resumen de la tarjeta, sin inventar tramos.
    const texto = `${c.resumen} ${b?.cuotas.join(' ') ?? ''}`;
    const { dias, todosLosDias } = b ? { dias: b.dias, todosLosDias: b.todosLosDias } : N.parseDias(texto);
    out.push({
      ...base,
      porcentaje: N.parsePorcentajeMax(texto),
      porcentajes: N.parsePorcentajes(texto),
      tipo_beneficio: N.parseTipo(texto),
      nivel_min: null,
      dias,
      todos_los_dias: todosLosDias,
      vence: b?.vence ?? null,
      tope_monto: null,
      tope_periodo: null,
      observacion: c.resumen || null,
    });
  });
  return out;
}
