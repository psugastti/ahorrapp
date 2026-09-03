import { nivelMinDe, etiquetaAfinidades } from './afinidades.js';
import * as N from './normalize.js';

const TARJETA = /cl[aá]sica|classic|\boro\b|gold|platinum|black|infinite|signature|premier|metalcard|privilege|dinelco|prepaga/i;

/**
 * Extrae tramos "N% con <tarjetas>" de un texto de promo. Devuelve [] si el texto no
 * distingue tarjetas (entonces el scraper emite una sola fila como siempre).
 *
 * Reconoce las dos formas que usan los bancos:
 *   Continental: "- 25% de reintegro con **Privilege Continental.** Límite ... Gs. 3.000.000
 *                 - 20% de reintegro con **Clásica, Dinelco, Oro, Black e Infinite.** ..."
 *   GNB:         "25% de reintegro para pagos con tarjetas de crédito Mastercard Black,
 *                 Black Premier y Metalcard Premier. 20% de reintegro para pagos con
 *                 tarjetas de crédito Mastercard Clásicas, Oro..."
 */
export function extraerTramos(texto) {
  const t = N.limpiar(String(texto ?? '').replace(/\*\*/g, ' '));
  // una "frase" por bullet o por punto seguido de mayúscula/dígito
  // Se corta por bullet ("- ") o por punto seguido de mayúscula o de un "N%". No se corta
  // en "Gs. 3.000.000" (punto seguido de número que no es porcentaje).
  const frases = t.split(/\s+-\s+|(?<=\.)\s+(?=[A-ZÁÉÍÓÚ]|\d{1,2}\s*%)/);
  const tramos = [];
  for (let i = 0; i < frases.length; i++) {
    const f = frases[i];
    const pct = f.match(/(?:^|\s)(?:hasta\s+)?(\d{1,2})\s*%/);
    if (!pct || !TARJETA.test(f)) continue;
    // el tope suele venir en la frase siguiente ("Límite de compra mensual de hasta Gs. 3.000.000")
    const sig = frases[i + 1] && !/\d\s*%/.test(frases[i + 1]) ? frases[i + 1] : '';
    // las afinidades vienen después de "con" / "tarjetas de crédito" / "Mastercard"
    const afin = f.match(/(?:tarjetas?\s+(?:de\s+cr[eé]dito\s+)?(?:y\s+prepagas?\s+)?(?:mastercard\s+)?(?:afinidades\s+)?|con\s+)([^.(]*?(?:cl[aá]sica|classic|oro|gold|platinum|black|infinite|signature|premier|metalcard|privilege|dinelco)[^.(]*)/i)?.[1] ?? f;
    const tope = (f + ' ' + sig).match(/(?:l[ií]mite|tope|m[aá]ximo)[^.]*?gs\.?\s*([\d.]{5,})/i)?.[1];
    tramos.push({
      porcentaje: parseInt(pct[1], 10),
      tipo_beneficio: N.parseTipo(f),
      afinidades: etiquetaAfinidades(afin.replace(/\s+del?\s+banco.*$/i, '').replace(/^tarjetas?\s+(de\s+cr[eé]dito\s+)?(y\s+prepagas?\s+)?(MC\s+|mastercard\s+)?(afinidades\s+)?/i, '')),
      nivel_min: nivelMinDe(afin),
      tope_monto: tope ? parseInt(tope.replace(/\./g, ''), 10) : null,
    });
  }
  // dedupe por (porcentaje, nivel): a veces el texto repite el tramo
  const vistos = new Set();
  return tramos.filter((x) => { const k = `${x.porcentaje}|${x.nivel_min}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

/** Aplica los tramos sobre una fila base: devuelve N filas (o [fila] si no hay tramos). */
export function expandirPorTramos(fila, texto) {
  const tramos = extraerTramos(texto);
  if (tramos.length < 2) return [fila]; // un solo tramo no es segmentación, es la tarifa única
  return tramos.map((tr) => ({
    ...fila,
    porcentaje: tr.porcentaje,
    porcentajes: [tr.porcentaje],
    tipo_beneficio: tr.tipo_beneficio ?? fila.tipo_beneficio,
    nivel_min: tr.nivel_min,
    tope_monto: tr.tope_monto ?? fila.tope_monto,
    observacion: [`${tr.porcentaje}% con ${tr.afinidades}`, fila.observacion].filter(Boolean).join(' · ').slice(0, 400),
  }));
}
