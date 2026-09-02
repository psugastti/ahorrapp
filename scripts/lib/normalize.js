// Normalizadores compartidos. REGLA: si el dato no está textualmente en la fuente,
// se devuelve null. Nunca se estima ni se infiere un porcentaje, día o vigencia.

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

const DIAS = {
  lunes: 'lunes', martes: 'martes', miercoles: 'miercoles', miércoles: 'miercoles',
  jueves: 'jueves', viernes: 'viernes', sabado: 'sabado', sábado: 'sabado',
  domingo: 'domingo',
};

export const limpiar = (s) =>
  (s == null ? '' : String(s)).replace(/\s+/g, ' ').replace(/ /g, ' ').trim();

/** Clave de comparación: minúsculas, sin tildes, sin puntuación, sin S.A./SRL. */
export function claveComercio(nombre) {
  return limpiar(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(s\.?a\.?e\.?c\.?a\.?|s\.?a\.?|s\.?r\.?l\.?|e\.?a\.?s\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Variante de la clave sin el sufijo de local/sucursal.
 * Familiar publica "ACADEMY-SHOPPING MARISCAL" y la base guarda "Academy":
 * sin esto el comercio parece desaparecido del catálogo cuando solo cambió el rótulo.
 */
export function claveBase(nombre) {
  const k = claveComercio(String(nombre).split(/\s[-–]\s|[-–](?=[A-ZÁÉÍÓÚÑ ]{4,}$)/)[0]);
  return k.length >= 3 ? k : claveComercio(nombre);
}

/** Extrae el % SOLO si aparece explícito. Devuelve null si no hay. */
export function parsePorcentaje(txt) {
  const t = limpiar(txt);
  if (!t) return null;
  const m = t.match(/(\d{1,2})(?:[.,]\d+)?\s*%/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 && n <= 100 ? n : null;
}

/**
 * TODOS los porcentajes que aparecen en el texto, ordenados.
 * Importa porque varios bancos publican tramos: Interfisa dice "20% o 25% de
 * reintegro" según la tarjeta. Quedarse solo con uno hace que el otro parezca
 * un cambio de porcentaje cuando no lo es.
 */
export function parsePorcentajes(txt) {
  const t = limpiar(txt);
  const todos = [...t.matchAll(/(\d{1,2})(?:[.,]\d+)?\s*%/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n > 0 && n <= 100);
  return [...new Set(todos)].sort((a, b) => a - b);
}

/** El máximo de los porcentajes del texto ("hasta 25%"). */
export function parsePorcentajeMax(txt) {
  const todos = parsePorcentajes(txt);
  return todos.length ? todos[todos.length - 1] : null;
}

/** "Vigente hasta el 11 de noviembre de 2026" | "31/12/2026" -> "2026-11-11" */
export function parseVence(txt) {
  const t = limpiar(txt).toLowerCase();
  if (!t) return null;
  let m = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de[l]?\s+)?(\d{4})/);
  if (m && MESES[m[2]]) {
    return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  m = t.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const mes = parseInt(m[2], 10);
    const dia = parseInt(m[1], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return `${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
  }
  return null;
}

/** Días mencionados textualmente. "todos los días" -> [] con todosLosDias=true */
export function parseDias(txt) {
  const t = limpiar(txt).toLowerCase();
  if (/todos\s+los\s+d[ií]as/.test(t)) return { dias: [], todosLosDias: true };
  const found = new Set();
  for (const [k, v] of Object.entries(DIAS)) {
    if (new RegExp(`\\b${k}\\b`, 'i').test(t)) found.add(v);
  }
  // "de lunes a viernes" -> rango
  const rango = t.match(/de\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+a\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/);
  if (rango) {
    const orden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const a = orden.indexOf(DIAS[rango[1]]);
    const b = orden.indexOf(DIAS[rango[2]]);
    if (a >= 0 && b >= 0) {
      for (let i = a; ; i = (i + 1) % 7) {
        found.add(orden[i]);
        if (i === b) break;
      }
    }
  }
  return { dias: [...found], todosLosDias: false };
}

/**
 * descuento | reintegro | cuotas — solo si la fuente lo dice.
 * Ojo con el orden: muchas promos son "20% de descuento + 6 cuotas sin intereses".
 * Ahí el beneficio es el descuento; las cuotas son el extra. Por eso 'cuotas' solo
 * gana cuando NO hay un porcentaje en juego.
 */
export function parseTipo(txt) {
  const t = limpiar(txt).toLowerCase();
  const hayPorcentaje = parsePorcentajes(t).length > 0;
  if (/reintegro|cashback|devoluci[oó]n/.test(t)) return 'reintegro';
  if (/descuento|%\s*(de\s+)?desc/.test(t)) return 'descuento';
  if (/cuotas?\s+sin\s+inter[eé]s|sin\s+intereses/.test(t)) {
    return hayPorcentaje ? 'descuento' : 'cuotas';
  }
  return null;
}

/** "tope de Gs. 300.000" -> 300000 */
export function parseTope(txt) {
  const t = limpiar(txt).toLowerCase();
  const m = t.match(/(?:tope|l[ií]mite|hasta)\s+(?:de\s+)?(?:gs\.?|₲|guaran[ií]es)?\s*([\d.,]{4,})/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  return Number.isFinite(n) && n >= 1000 ? n : null;
}

export function parsePeriodoTope(txt) {
  const t = limpiar(txt).toLowerCase();
  if (/mensual|por mes|al mes/.test(t)) return 'mensual';
  if (/semanal|por semana/.test(t)) return 'semanal';
  if (/diario|por d[ií]a/.test(t)) return 'diario';
  if (/por compra|por transacci[oó]n/.test(t)) return 'compra';
  return null;
}
