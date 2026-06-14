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

// Mis tarjetas: array de { banco_id, tipo, ueno_nivel }
// tipo: 'credito' | 'debito' | 'premium' ; ueno_nivel: 1..5 (solo Ueno)
export const getMisTarjetas = () => getJSON(K.tarjetas, []);
export const setMisTarjetas = (arr) => setJSON(K.tarjetas, arr);

// Favoritos: array de beneficio_id
export const getFavoritos = () => getJSON(K.favoritos, []);
export async function toggleFavorito(id) {
  const favs = await getFavoritos();
  const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  await setJSON(K.favoritos, next);
  return next;
}

// Preferencias: { soloMisBancos, notifDiarias, ... }
export const getPrefs = () => getJSON(K.prefs, { soloMisBancos: false, notifDiarias: false });
export const setPrefs = (p) => setJSON(K.prefs, p);

// ¿El usuario tiene una tarjeta que aplica a este beneficio?
// Compara banco + tipo de tarjeta. Devuelve la tarjeta que aplica o null.
export function tarjetaQueAplica(beneficio, misTarjetas) {
  if (!misTarjetas?.length) return null;
  const tipoBen = beneficio.tipo_tarjeta_simple || beneficio.tipo_tarjeta || 'ambas';
  return misTarjetas.find(t => {
    if (t.banco_id !== beneficio.banco_id) return false;
    if (tipoBen === 'ambas') return true;
    if (tipoBen === 'premium') return t.tipo === 'premium';
    if (tipoBen === 'credito') return t.tipo === 'credito' || t.tipo === 'premium';
    if (tipoBen === 'debito') return t.tipo === 'debito';
    return true;
  }) || null;
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
