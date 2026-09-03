// Mapea las "afinidades" (niveles de tarjeta) que nombran los bancos al modelo de la
// base: nivel_min 1 Clásica · 2 Oro · 3 Platinum · 4 Signature/Black · 5 Infinite.
// nivel_min = el MENOR nivel de la lista (el mínimo que necesitás para acceder).
// Si el menor es 1 → null, que en la app significa "cualquier tarjeta".
const NIVELES = [
  // "cl.{0,2}sica": el texto llega a veces con la vocal rota ("Cl sica", "Clàsica", "Cl?sica").
  [/cl.{0,2}sica|classic|est.{0,2}ndar|standard|dinelco|prepaga/i, 1],
  [/\boro\b|gold/i, 2],
  [/platinum|platino/i, 3],
  [/black|signature|metalcard|premier/i, 4],
  [/infinite|privilege/i, 5],
];

export function nivelMinDe(textoAfinidades) {
  const t = String(textoAfinidades ?? '');
  const pegado = t.replace(/\s+/g, ''); // el PDF a veces parte palabras: "Clási ca"
  const niveles = NIVELES.filter(([re]) => re.test(t) || re.test(pegado)).map(([, n]) => n);
  if (!niveles.length) return null;
  const min = Math.min(...niveles);
  return min <= 1 ? null : min;
}

/** Etiqueta legible para la observación / la cola: "Visa Platinum, Infinite y MC Black" */
export function etiquetaAfinidades(textoAfinidades) {
  return String(textoAfinidades ?? '')
    .replace(/\s+/g, ' ')
    .replace(/MasterCard/gi, 'MC')
    .replace(/[.:]+$/, '')
    .trim();
}
