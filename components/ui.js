import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

// Logo del banco (favicon real) con fallback a la inicial del comercio.
export function BancoLogo({ banco, comercio, size = 46 }) {
  const [err, setErr] = useState(false);
  const color = banco?.color || theme.colors.navy;
  const radius = Math.round(size * 0.26);
  if (banco?.logo_url && !err) {
    return (
      <View style={[s.logoWrap, { width: size, height: size, borderRadius: radius, backgroundColor: '#fff' }]}>
        <Image
          source={{ uri: banco.logo_url }}
          style={{ width: size * 0.62, height: size * 0.62, borderRadius: 6 }}
          resizeMode="contain"
          onError={() => setErr(true)}
        />
      </View>
    );
  }
  return (
    <View style={[s.logoWrap, { width: size, height: size, borderRadius: radius, backgroundColor: color + '14' }]}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.42 }}>{(comercio || '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const TIPO = {
  descuento: { label: 'Descuento', bg: theme.colors.primaryLight, fg: theme.colors.primaryDark },
  reintegro: { label: 'Reintegro', bg: '#E7ECFF', fg: '#3B4F9E' },
  cuotas: { label: 'Cuotas s/interés', bg: '#FFF4E0', fg: '#B7791F' },
};
export function TipoBadge({ tipo }) {
  const t = TIPO[tipo] || TIPO.descuento;
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={[s.badgeTxt, { color: t.fg }]}>{t.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  logoWrap: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  badge: { borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
