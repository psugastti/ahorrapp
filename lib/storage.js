// Almacenamiento local (funciona en web y nativo). Login opcional a futuro.
import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  bancos: 'ahorrapp.misBancos',
  tarjetas: 'ahorrapp.misTarjetas',
  favoritos: 'ahorrapp.favoritos',
  prefs: 'ahorrapp.prefs',
};

async function getJSON(key, def) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}
async function setJSON(key, val) {
  try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// Mis bancos: array de banco_id
export const getMisBancos = () => getJSON(K.bancos, []);
export const setMisBancos = (ids) => setJSON(K.bancos, ids);

// Mis tarjetas: array de { banco_id, tipo, marca, nivel, ueno_nivel }
// tipo: 'credito' | 'debito' ; marca: 'visa'|'mastercard'|'amex'|null
// nivel: 1..5 (jerarquía de tarjeta) ; ueno_nivel: 1..5 (solo Ueno)
export const getMisTarjetas = () => getJSON(K.tarjetas, []);
export const setMisTarjetas = (arr) => setJSON(K.tarjetas, arr);

// Marcas y niveles de tarjeta (jerarquía unificada para matching y UI)
export const MARCAS = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'Amex' },
];
export const NIVELES_TARJETA = [
  { id: 1, label: 'Clásica' },
  { id: 2, label: 'Oro / Gold' },
  { id: 3, label: 'Platinum' },
  { id: 4, label: 'Signature / Black' },
  { id: 5, label: 'Infinite' },
];
export const marcaLabel = (m) => MARCAS.find(x => x.id === m)?.label || '';
export const nivelLabel = (n) => NIVELES_TARJETA.find(x => x.id === n)?.label || '';
// Nivel efectivo de una tarjeta (compat: tarjetas viejas 'premium' = nivel 4)
const nivelDeTarjeta = (t) => t.nivel || (t.tipo === 'premium' ? 4 : 1);
const tipoDeTarjeta = (t) => (t.tipo === 'premium' ? 'credito' : t.tipo);

// Favoritos: array de beneficio_id
export const getFavoritos = () => getJSON(K.favoritos, []);
export async function toggleFavorito(id) {
  const favs = await getFavoritos();
  const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  await setJSON(K.favoritos, next);
  return next;
}

// Preferencias: { soloMisBancos, notifDiarias, notifHora, notifLastShown, ... }
export const getPrefs = () => getJSON(K.prefs, { soloMisBancos: false, notifDiarias: false, notifHora: 10, notifLastShown: null });
export const setPrefs = (p) => setJSON(K.prefs, p);

// ¿El usuario tiene una tarjeta que aplica a este beneficio?
// Compara banco + tipo + marca + nivel mínimo. Devuelve la tarjeta que aplica o null.
export function tarjetaQueAplica(beneficio, misTarjetas) {
  if (!misTarjetas?.length) return null;
  const tipoBen = (beneficio.tipo_tarjeta_simple || beneficio.tipo_tarjeta || 'ambas').toLowerCase();
  const marcaBen = beneficio.marca_tarjeta || null;
  const nivelMin = beneficio.nivel_min || null;
  return misTarjetas.find(t => {
    if (t.banco_id !== beneficio.banco_id) return false;
    const tipoCard = tipoDeTarjeta(t);
    // tipo: 'ambas' acepta cualquiera; si no, debe coincidir débito/crédito
    if (tipoBen === 'credito' && tipoCard === 'debito') return false;
    if (tipoBen === 'debito' && tipoCard !== 'debito') return false;
    // marca: si el beneficio exige una, la tarjeta debe tenerla
    if (marcaBen && t.marca !== marcaBen) return false;
    // nivel mínimo
    if (nivelMin && nivelDeTarjeta(t) < nivelMin) return false;
    return true;
  }) || null;
}

// Calcula el ahorro real de un beneficio para un monto, respetando tope y compra mínima.
// pctOverride: usar el % personalizado (ej. nivel ueno) si corresponde.
export function calcularAhorro(beneficio, monto, pctOverride) {
  const pct = pctOverride != null ? pctOverride : (beneficio.porcentaje || 0);
  const m = Number(monto) || 0;
  if (!pct || !m) return { aplica: false, ahorro: 0, pct, motivo: null };
  if (beneficio.compra_minima > 0 && m < beneficio.compra_minima) {
    return { aplica: false, ahorro: 0, pct, motivo: 'compra_minima', faltante: beneficio.compra_minima - m };
  }
  let ahorro = Math.round((m * pct) / 100);
  let topeAplicado = false;
  if (beneficio.tope_monto > 0 && ahorro > beneficio.tope_monto) {
    ahorro = beneficio.tope_monto; topeAplicado = true;
  }
  return { aplica: true, ahorro, pct, topeAplicado, motivo: null };
}

// % exacto de Ueno (banco_id 4) según el nivel del usuario, si el beneficio tiene niveles.
export function porcentajePersonalizado(beneficio, misTarjetas) {
  const niveles = Array.isArray(beneficio.niveles) ? beneficio.niveles : null;
  if (!niveles || beneficio.banco_id !== 4) return null;
  const tj = (misTarjetas || []).find(t => t.banco_id === 4 && t.ueno_nivel);
  if (!tj) return null;
  const n = niveles.find(x => x.nivel === tj.ueno_nivel);
  return n ? { nivel: tj.ueno_nivel, porcentaje: n.porcentaje, tope_reintegro: n.tope_reintegro } : null;
}
