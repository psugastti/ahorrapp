// Notificaciones — MVP web (Notification API) + base para nativo.
// LÍMITE WEB: con la pestaña cerrada no se puede disparar un aviso sin un servidor de push.
// Por eso en web el aviso del día se evalúa cuando el usuario ABRE/VUELVE a la app.
// En la versión nativa (iOS/Android) se reemplazará por expo-notifications con avisos
// programados reales (con la app cerrada). La estructura ya queda lista para ese cambio.
import { supabase } from './supabase';
import { getPrefs, setPrefs, getMisBancos } from './storage';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const hoyStr = () => new Date().toISOString().slice(0, 10);

export function notifSoportadas() {
  return typeof window !== 'undefined' && 'Notification' in window;
}
export function permisoNotif() {
  return notifSoportadas() ? Notification.permission : 'unsupported';
}
export async function pedirPermisoNotif() {
  if (!notifSoportadas()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

// Cuenta beneficios válidos hoy (opcionalmente filtrando por los bancos del usuario)
async function contarBeneficiosHoy(misBancos) {
  const dia = DIAS[new Date().getDay()];
  let q = supabase.from('beneficios').select('*', { count: 'exact', head: true })
    .eq('activo', true).or(`todos_los_dias.eq.true,dias.cs.{${dia}}`);
  if (misBancos?.length) q = q.in('banco_id', misBancos);
  const { count } = await q;
  return count || 0;
}

// Evalúa si corresponde mostrar el aviso diario. Si corresponde, lo marca como mostrado,
// dispara la notificación del navegador (si hay permiso) y devuelve el contenido para el banner.
// force=true ignora la hora y el "ya mostrado" (para el botón "Probar aviso").
export async function chequearAvisoDiario(force = false) {
  const p = await getPrefs();
  if (!p.notifDiarias && !force) return { mostrar: false };
  const hora = typeof p.notifHora === 'number' ? p.notifHora : 10;
  if (!force) {
    if (new Date().getHours() < hora) return { mostrar: false };   // todavía no es la hora
    if (p.notifLastShown === hoyStr()) return { mostrar: false };   // ya avisamos hoy
  }
  const misBancos = await getMisBancos();
  const n = await contarBeneficiosHoy(misBancos);
  const cuerpo = n > 0
    ? `Hay ${n} descuento${n === 1 ? '' : 's'} para usar hoy 👀`
    : 'Mirá los descuentos disponibles hoy 👀';
  if (!force) await setPrefs({ ...p, notifLastShown: hoyStr() });
  if (notifSoportadas() && Notification.permission === 'granted') {
    try { new Notification('Ahorrapp', { body: cuerpo }); } catch {}
  }
  return { mostrar: true, titulo: 'Descuentos de hoy', cuerpo, n };
}
