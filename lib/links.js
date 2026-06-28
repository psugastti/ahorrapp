// Apertura de enlaces robusta para web y nativo.
// En web, Linking.openURL se ejecuta dentro de una promesa (microtask) y el navegador lo
// bloquea como popup. Usamos window.open SINCRÓNICO dentro del gesto del usuario.
import { Platform, Linking } from 'react-native';

export function abrirURL(url) {
  if (!url) return;
  if (Platform.OS === 'web') {
    try { window.open(url, '_blank', 'noopener,noreferrer'); }
    catch { try { window.location.href = url; } catch {} }
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

export function abrirMail(mailto) {
  if (!mailto) return;
  if (Platform.OS === 'web') {
    try { window.location.href = mailto; } catch {}
  } else {
    Linking.openURL(mailto).catch(() => {});
  }
}
