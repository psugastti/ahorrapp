import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

const DIAS_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

export default function DetalleScreen({ route, navigation }) {
  const { beneficio: b } = route.params;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = b.vence && b.vence < hoy;
  const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
  const color = b.bancos?.color || theme.colors.navy;
  const tipoLabel = { credito: 'Solo Crédito', debito: 'Solo Débito', premium: 'Premium', ambas: 'Crédito y Débito' };
  const link = b.link_oficial || b.bancos?.url_web;

  const InfoRow = ({ icon, label, value, tint }) => (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: (tint || theme.colors.primary) + '18' }]}>
        <Ionicons name={icon} size={17} color={tint || theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* TOPBAR */}
      <View style={s.topbar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.navy} />
        </TouchableOpacity>
        {link ? (
          <TouchableOpacity style={s.iconBtn} onPress={() => Linking.openURL(link)}>
            <Ionicons name="open-outline" size={20} color={theme.colors.navy} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* CABECERA MARCA */}
        <View style={s.brandCard}>
          <View style={s.brandTop}>
            <View style={[s.brandLogo, { backgroundColor: color + '18' }]}>
              <Text style={[s.brandLogoTxt, { color }]}>{(b.comercio || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            {b.porcentaje ? (
              <View style={s.pctBig}>
                <Text style={s.pctBigNum}>{b.porcentaje}%</Text>
                <Text style={s.pctBigSub}>{b.etiqueta && b.etiqueta !== 'dia_padre' ? b.etiqueta : 'de descuento'}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.brandBanco}>{b.bancos?.nombre}</Text>
          <Text style={s.brandComercio}>{b.comercio}</Text>
          <View style={s.pillsRow}>
            <View style={s.pill}><Ionicons name="storefront-outline" size={13} color={theme.colors.navy} /><Text style={s.pillTxt}>En tienda física y online</Text></View>
            <View style={[s.statePill, vencido ? s.statePillRed : s.statePillGreen]}>
              <Ionicons name={vencido ? 'close-circle' : 'checkmark-circle'} size={13} color={vencido ? theme.colors.danger : theme.colors.success} />
              <Text style={[s.statePillTxt, { color: vencido ? theme.colors.danger : theme.colors.success }]}>{vencido ? 'Vencido' : 'Activo'}</Text>
            </View>
          </View>
        </View>

        {/* DESCRIPCIÓN */}
        {b.descripcion ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>¿Cómo funciona?</Text>
            <Text style={s.cardText}>{b.descripcion}</Text>
          </View>
        ) : null}

        {/* DETALLES */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Detalles del beneficio</Text>

          <InfoRow icon="business-outline" label="Banco" value={b.bancos?.nombre || '—'} tint={color} />
          <View style={s.divider} />
          <InfoRow icon="card-outline" label="Tarjeta" value={`${tipoLabel[tipo] || 'Crédito y Débito'}`} />
          <View style={s.divider} />
          <InfoRow icon="calendar-outline" label="Días válidos"
            value={b.todos_los_dias ? 'Todos los días' : b.dias?.length > 0 ? b.dias.map(d => DIAS_LABEL[d] || d).join(', ') : 'No especificado'} />
          {b.tope_monto > 0 && (<><View style={s.divider} /><InfoRow icon="arrow-up-circle-outline" label="Tope de reintegro" value={`Gs. ${b.tope_monto.toLocaleString('es-PY')}`} tint={theme.colors.warning} /></>)}
          {b.compra_minima > 0 && (<><View style={s.divider} /><InfoRow icon="arrow-down-circle-outline" label="Compra mínima" value={`Gs. ${b.compra_minima.toLocaleString('es-PY')}`} /></>)}
          {b.vence && (<><View style={s.divider} /><InfoRow icon="time-outline" label="Vigencia" value={`Hasta ${b.vence}`} tint={vencido ? theme.colors.danger : theme.colors.primary} /></>)}
          {b.requiere_qr && (<><View style={s.divider} /><InfoRow icon="qr-code-outline" label="Método de pago" value="Requiere pago con QR" tint={theme.colors.warning} /></>)}
          <View style={s.divider} />
          <InfoRow icon="pricetag-outline" label="Categoría" value={`${b.categorias?.emoji || ''} ${b.categorias?.nombre || '—'}`} />
        </View>

        {b.url_bases ? (
          <TouchableOpacity style={s.btnSecundario} onPress={() => Linking.openURL(b.url_bases)}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.navy} />
            <Text style={s.btnSecundarioTxt}>Ver bases y condiciones</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* CTA FIJO */}
      {link ? (
        <View style={s.footer}>
          <TouchableOpacity style={s.btnPrincipal} activeOpacity={0.9} onPress={() => Linking.openURL(link)}>
            <Text style={s.btnPrincipalTxt}>Activar en {b.bancos?.nombre || 'el banco'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1, paddingHorizontal: 16 },

  brandCard: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 12 },
  brandTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  brandLogo: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brandLogoTxt: { fontSize: 26, fontWeight: '800' },
  pctBig: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  pctBigNum: { color: '#fff', fontSize: 26, fontWeight: '900' },
  pctBigSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  brandBanco: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  brandComercio: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 2, marginBottom: 12 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  pillTxt: { color: theme.colors.navy, fontSize: 12, fontWeight: '600' },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: theme.radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  statePillGreen: { backgroundColor: '#E7F8F0' },
  statePillRed: { backgroundColor: '#FDECEC' },
  statePillTxt: { fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  cardText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 2, fontWeight: '600' },
  infoValue: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },

  btnSecundario: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 8, marginBottom: 12 },
  btnSecundarioTxt: { color: theme.colors.navy, fontSize: 14, fontWeight: '700' },

  footer: { padding: 16, paddingBottom: 28, backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  btnPrincipal: { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 17, gap: 8 },
  btnPrincipalTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
