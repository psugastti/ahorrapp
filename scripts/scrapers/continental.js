import { get } from '../lib/http.js';
import * as N from '../lib/normalize.js';

export const banco = 'Continental';
export const fuente = 'Continental API oficial';
export const requiereNavegador = false;

// API tipo Strapi: ?_limit=-1 devuelve el catálogo completo en una sola llamada.
const API = 'https://www.bancontinental.com.py/api/comercios?_limit=-1';

export async function run() {
  const filas = await get(API, { as: 'json', timeout: 60000 });
  return filas.map((c) => {
    const desc = N.limpiar(c.descripcion);
    const { dias, todosLosDias } = N.parseDias(desc);
    return {
      comercio: N.limpiar(c.nombre),
      porcentaje: c.porcentaje_ahorro?.porcentaje_ahorro ?? N.parsePorcentajeMax(desc),
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
  });
}
