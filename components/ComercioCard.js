import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

// Tarjeta de comercio del Inicio (diseño "Cabina").
// La franja izquierda lleva el color del banco: identifica la marca sin logo ni chip.
function ComercioCard({ grupo, onPress }) {
  const { comercio, colorBanco, bancoNombre, otrosBancos, categoria, maxPct, aplica, diasVence, diasTexto } = grupo;

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      <View style={[s.stripe, { backgroundColor: colorBanco || theme.colors.navy }]} />

      <View style={s.body}>
        <Text style={s.nombre} numberOfLines={1}>{comercio}</Text>
        <Text style={s.sub} numberOfLines={1}>
          {bancoNombre}
          {otrosBancos > 0 ? ` +${otrosBancos}` : ''}
          {categoria ? ` · ${categoria}` : ''}
        </Text>

        <View style={s.tags}>
          {aplica && (
            <View style={[s.tag, s.tagOk]}>
              <Ionicons name="checkmark-circle" size={11} color={theme.colors.success} />
              <Text style={[s.tagTxt, s.tagTxtOk]}>Tenés la tarjeta</Text>
            </View>
          )}
          {diasVence !== null && diasVence <= 10 && (
            <View style={[s.tag, s.tagHot]}>
              <Ionicons name="time-outline" size={11} color={theme.colors.danger} />
              <Text style={[s.tagTxt, s.tagTxtHot]}>{etiquetaVence(diasVence)}</Text>
            </View>
          )}
          {!aplica && diasVence === null && diasTexto ? (
            <View style={s.tag}><Text style={s.tagTxt}>{diasTexto}</Text></View>
          ) : null}
        </View>
      </View>

      {maxPct ? (
        <View style={s.pct}>
          <Text style={s.pctNum}>{maxPct}%</Text>
          <Text style={s.pctLbl}>OFF</Text>
        </View>
      ) : (
        <View style={s.chevron}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function etiquetaVence(d) {
  if (d === null) return null;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Último día mañana';
  return `Vence en ${d} días`;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  stripe: { width: 5 },
  body: { flex: 1, paddingVertical: 13, paddingLeft: 13, paddingRight: 4, minWidth: 0 },
  nombre: { color: theme.colors.text, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  sub: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 3 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.colors.bgCardAlt, borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagOk: { backgroundColor: '#E3F8F1' },
  tagHot: { backgroundColor: '#FDECEC' },
  tagTxt: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tagTxtOk: { color: theme.colors.success },
  tagTxtHot: { color: theme.colors.danger },

  pct: {
    width: 76, margin: 9, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  pctNum: { color: theme.colors.mint, fontSize: 20, fontWeight: '800', letterSpacing: -0.8 },
  pctLbl: { color: theme.colors.onNavySoft, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.9, marginTop: 1 },
  chevron: { width: 40, alignItems: 'center', justifyContent: 'center' },
});

export default memo(ComercioCard);
