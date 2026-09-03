import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';
import { expandirPorTramos } from '../lib/tramos.js';

export const banco = 'Continental';
export const fuente = 'Continental API oficial';
export const requiereNavegador = false;

// API tipo Strapi: ?_limit=-1 devuelve el catálogo completo en una sola llamada.
const API = 'https://www.bancontinental.com.py/api/comercios?_limit=-1';

export async function run() {
  const filas = await get(API, { as: 'json', timeout: 60000 });
  // La API ya separa "X - Privilege" como comercio aparte: para esos, la descripción trae
  // solo el tramo Privilege y no se expande. Para "X" a secas, se emite una fila por tramo
  // y se omite el tramo Privilege si existe la entrada "X - Privilege" (para no duplicar).
  const conPrivilege = new Set(filas.map((c) => N.claveComercio(c.nombre)).filter((k) => / privilege$/.test(k)).map((k) => k.replace(/ privilege$/, '')));

  return filas.flatMap((c) => {
    const desc = N.limpiar(c.descripcion);
    const { dias, todosLosDias } = N.parseDias(desc);
    const fila = {
      comercio: N.limpiar(c.nombre),
      porcentaje: c.porcentaje_ahorro?.porcentaje_ahorro ?? N.parsePorcentajeMax(desc),
      porcentajes: N.parsePorcentajes(desc),
      tipo_beneficio: N.parseTipo(desc),
      dias,
      todos_los_dias: todosLosDias,
      vence: N.parseVence(desc.match(/vigente hasta[^.]*/i)?.[0] || ''),
      tope_monto: N.parseTope(desc),
      tope_periodo: N.parsePeriodoTope(desc),
      rubro: N.limpiar(c.rubro?.nombre),
      ciudad: N.limpiar(c.ciudad?.nombre),
      direccion: N.limpiar(c.direccion),
      observacion: N.limpiar(c.descripcionCorta) || null,
      link_oficial: `https://www.bancontinental.com.py/beneficios/${c.id}`,
      url_bases: null,
      externo_id: String(c.id),
    };
    const esPrivilege = / privilege$/.test(N.claveComercio(c.nombre));
    if (esPrivilege) return [{ ...fila, nivel_min: 5 }];
    const tramos = expandirPorTramos(fila, desc);
    const tieneEntradaPrivilege = conPrivilege.has(N.claveComercio(c.nombre));
    return tramos.filter((t) => !(tieneEntradaPrivilege && t.nivel_min === 5));
  });
}
