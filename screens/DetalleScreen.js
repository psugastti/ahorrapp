import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { BancoLogo, TipoBadge } from '../components/ui';
import { getFavoritos, toggleFavorito, getMisTarjetas, tarjetaQueAplica, porcentajePersonalizado, marcaLabel, nivelLabel } from '../lib/storage';

const DIAS_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const REPORTE_EMAIL = 'ahorrapp.py@gmail.com';
const MOTIVOS = ['% incorrecto', 'Días incorrectos', 'Beneficio vencido', 'Comercio equivocado', 'Otro'];
const gs = (n) => 'Gs. ' + Number(n).toLocaleString('es-PY');
const fecha = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };

export default function DetalleScreen({ route, navigation }) {
  const { beneficio: b } = route.params;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = b.vence && b.vence < hoy;
  const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
  const color = b.bancos?.color || theme.colors.navy;
  const tipoLabel = { credito: 'Solo Crédito', debito: 'Solo Débito', premium: 'Premium', ambas: 'Crédito y Débito' };
  const link = b.url_bases || b.link_oficial || b.bancos?.url_beneficios || b.bancos?.url_web;
  const niveles = Array.isArray(b.niveles) ? b.niveles : null;
  const semanal = b.tope_periodo === 'semanal';

  const [misTarjetas, setMisTarjetas] = useState([]);
  const [fav, setFav] = useState(false);
  useEffect(() => {
    (async () => {
      setMisTarjetas(await getMisTarjetas());
      setFav((await getFavoritos()).includes(b.id));
    })();
  }, []);
  const onFav = async () => { const next = await toggleFavorito(b.id); setFav(next.includes(b.id)); };

  const aplica = tarjetaQueAplica(b, misTarjetas);
  const pers = porcentajePersonalizado(b, misTarjetas);

  // Reporte de error
  const [modal, setModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviarReporte = async () => {
    if (!mensaje.trim()) { Alert.alert('Falta el mensaje', 'Contanos qué está mal para poder corregirlo.'); return; }
    setEnviando(true);
    try {
      await supabase.from('reportes').insert({ beneficio_id: b.id, comercio: b.comercio, banco: b.bancos?.nombre, motivo: motivo || null, mensaje: mensaje.trim(), email_reporta: email.trim() || null });
    } catch (e) {}
    const asunto = encodeURIComponent(`Reporte beneficio: ${b.comercio} (${b.bancos?.nombre || ''})`);
    const cuerpo = encodeURIComponent(`Beneficio: ${b.comercio}\nBanco: ${b.bancos?.nombre || ''}\nMotivo: ${motivo || '-'}\n\n${mensaje.trim()}\n\n(ID: ${b.id})`);
    Linking.openURL(`mailto:${REPORTE_EMAIL}?subject=${asunto}&body=${cuerpo}`).catch(() => {});
    setEnviando(false); setModal(false); setMensaje(''); setMotivo(''); setEmail('');
    Alert.alert('¡Gracias!', 'Recibimos tu reporte. Lo vamos a revisar para corregir el beneficio.');
  };

  const InfoRow = ({ icon, label, value, tint }) => (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: (tint || theme.colors.primary) + '18' }]}><Ionicons name={icon} size={17} color={tint || theme.colors.primary} /></View>
      <View style={{ flex: 1 }}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* TOPBAR */}
      <View style={s.topbar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={theme.colors.navy} /></TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={onFav}><Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? theme.colors.danger : theme.colors.navy} /></TouchableOpacity>
          {link ? <TouchableOpacity style={s.iconBtn} onPress={() => Linking.openURL(link)}><Ionicons name="open-outline" size={20} color={theme.colors.navy} /></TouchableOpacity> : null}
        </View>
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* CABECERA MARCA */}
        <View style={s.brandCard}>
          <View style={s.brandTop}>
            <BancoLogo banco={b.bancos} comercio={b.comercio} size={60} />
            {b.porcentaje ? (
              <View style={[s.pctBig, pers && { backgroundColor: theme.colors.navy }]}>
                <Text style={s.pctBigNum}>{pers ? `${pers.porcentaje}%` : `${niveles ? 'Hasta ' : ''}${b.porcentaje}%`}</Text>
                <Text style={s.pctBigSub}>{pers ? `tu nivel ${pers.nivel}` : (niveles ? 'según tu nivel' : (b.etiqueta && b.etiqueta !== 'dia_padre' ? b.etiqueta : 'de descuento'))}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.brandBanco}>{b.bancos?.nombre}</Text>
          <Text style={s.brandComercio}>{b.comercio}</Text>
          <View style={s.pillsRow}>
            <TipoBadge tipo={b.tipo_beneficio} />
            <View style={[s.statePill, vencido ? s.statePillRed : s.statePillGreen]}>
              <Ionicons name={vencido ? 'close-circle' : 'checkmark-circle'} size={13} color={vencido ? theme.colors.danger : theme.colors.success} />
              <Text style={[s.statePillTxt, { color: vencido ? theme.colors.danger : theme.colors.success }]}>{vencido ? 'Vencido' : 'Activo'}</Text>
            </View>
          </View>
        </View>

        {/* ¿CON CUÁL PAGO? */}
        {aplica ? (
          <View style={s.aplicaCard}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={s.aplicaTxt}>Podés usar este beneficio con tu tarjeta {b.bancos?.nombre}{aplica.tipo ? ` (${aplica.tipo})` : ''}.</Text>
          </View>
        ) : null}

        {/* DESCRIPCIÓN */}
        {b.descripcion ? (<View style={s.card}><Text style={s.cardTitle}>¿Cómo funciona?</Text><Text style={s.cardText}>{b.descripcion}</Text></View>) : null}

        {/* OBSERVACIÓN */}
        {b.observacion ? (
          <View style={s.obsCard}>
            <Ionicons name="information-circle" size={18} color={theme.colors.warning} />
            <Text style={s.obsTxt}>{b.observacion}</Text>
          </View>
        ) : null}

        {/* NIVELES */}
        {niveles ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Reintegro por nivel (ueno+){semanal ? ' · semanal' : ''}</Text>
            <View style={s.nivHeaderRow}>
              <Text style={[s.nivH, { flex: 1 }]}>Nivel</Text>
              <Text style={[s.nivH, { width: 70, textAlign: 'right' }]}>Reintegro</Text>
              <Text style={[s.nivH, { width: 96, textAlign: 'right' }]}>{semanal ? 'Tope sem.' : 'Tope'}</Text>
            </View>
            {niveles.map((n) => {
              const miNivel = pers && pers.nivel === n.nivel;
              return (
                <View key={n.nivel} style={[s.nivRow, miNivel && s.nivRowMine]}>
                  <View style={[s.nivBadge, miNivel && { backgroundColor: theme.colors.navy }]}><Text style={[s.nivBadgeTxt, miNivel && { color: '#fff' }]}>Nivel {n.nivel}{miNivel ? ' (vos)' : ''}</Text></View>
                  <Text style={[s.nivPct, { width: 70, textAlign: 'right' }]}>{n.porcentaje}%</Text>
                  <Text style={[s.nivTope, { width: 96, textAlign: 'right' }]}>{n.tope_reintegro ? gs(n.tope_reintegro) : '—'}</Text>
                </View>
              );
            })}
            <Text style={s.nivNota}>Tu nivel se ve en la app del banco, sección "Beneficios". {pers ? '' : 'Cargá tu nivel en Perfil → Mis tarjetas para ver tu % exacto.'}</Text>
          </View>
        ) : null}

        {/* DETALLES */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Detalles del beneficio</Text>
          <InfoRow icon="business-outline" label="Banco" value={b.bancos?.nombre || '—'} tint={color} />
          <View style={s.divider} />
          <InfoRow icon="card-outline" label="Tarjeta" value={[tipoLabel[tipo] || 'Crédito y Débito', b.marca_tarjeta ? `Solo ${marcaLabel(b.marca_tarjeta)}` : null, b.nivel_min ? `${nivelLabel(b.nivel_min)} o superior` : null].filter(Boolean).join(' · ')} />
          <View style={s.divider} />
          <InfoRow icon="calendar-outline" label="Días válidos" value={b.todos_los_dias ? 'Todos los días' : b.dias?.length > 0 ? b.dias.map(d => DIAS_LABEL[d] || d).join(', ') : 'No especificado'} />
          {b.tope_monto > 0 && (<><View style={s.divider} /><InfoRow icon="arrow-up-circle-outline" label="Tope de reintegro" value={gs(b.tope_monto)} tint={theme.colors.warning} /></>)}
          {b.compra_minima > 0 && (<><View style={s.divider} /><InfoRow icon="arrow-down-circle-outline" label="Compra mínima" value={gs(b.compra_minima)} /></>)}
          {b.vence && (<><View style={s.divider} /><InfoRow icon="time-outline" label="Vigencia" value={`Hasta ${b.vence}`} tint={vencido ? theme.colors.danger : theme.colors.primary} /></>)}
          {b.requiere_qr && (<><View style={s.divider} /><InfoRow icon="qr-code-outline" label="Método de pago" value="Requiere pago con QR" tint={theme.colors.warning} /></>)}
          <View style={s.divider} />
          <InfoRow icon="pricetag-outline" label="Categoría" value={`${b.categorias?.emoji || ''} ${b.categorias?.nombre || '—'}`} />
        </View>

        {/* VERIFICACIÓN */}
        {b.verificado_en ? (
          <View style={s.verifRow}>
            <Ionicons name="shield-checkmark" size={15} color={theme.colors.success} />
            <Text style={s.verifTxt}>Datos verificados el {fecha(b.verificado_en)}</Text>
          </View>
        ) : (
          <View style={s.verifRow}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.warning} />
            <Text style={[s.verifTxt, { color: theme.colors.warning }]}>Dato no confirmado con la fuente — verificá en las bases</Text>
          </View>
        )}

        {/* REPORTAR ERROR */}
        <TouchableOpacity style={s.btnReporte} activeOpacity={0.85} onPress={() => setModal(true)}>
          <Ionicons name="flag-outline" size={17} color={theme.colors.danger} />
          <Text style={s.btnReporteTxt}>¿Este beneficio tiene un error? Reportar aquí</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CTA FIJO */}
      {link ? (
        <View style={s.footer}>
          <TouchableOpacity style={s.btnPrincipal} activeOpacity={0.9} onPress={() => Linking.openURL(link)}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={s.btnPrincipalTxt}>Ver bases y condiciones</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* MODAL REPORTE */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHead}><Text style={s.modalTitle}>Reportar un error</Text><TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={theme.colors.textMuted} /></TouchableOpacity></View>
            <Text style={s.modalSub}>{b.comercio} · {b.bancos?.nombre}</Text>
            <Text style={s.modalLabel}>¿Qué está mal?</Text>
            <View style={s.motivosRow}>
              {MOTIVOS.map(m => (<TouchableOpacity key={m} style={[s.motivoChip, motivo === m && s.motivoChipActive]} onPress={() => setMotivo(m)}><Text style={[s.motivoTxt, motivo === m && s.motivoTxtActive]}>{m}</Text></TouchableOpacity>))}
            </View>
            <Text style={s.modalLabel}>Explicanos lo que está mal</Text>
            <TextInput style={s.modalInput} placeholder="Ej: el descuento ya no es 30%, ahora es 20%..." placeholderTextColor={theme.colors.textMuted} value={mensaje} onChangeText={setMensaje} multiline />
            <Text style={s.modalLabel}>Tu correo (opcional)</Text>
            <TextInput style={s.modalInputSingle} placeholder="Para avisarte cuando lo corrijamos" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={s.btnEnviar} activeOpacity={0.9} onPress={enviarReporte} disabled={enviando}>
              {enviando ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="send" size={17} color="#fff" /><Text style={s.btnEnviarTxt}>Enviar reporte</Text></>)}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  pctBig: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  pctBigNum: { color: '#fff', fontSize: 24, fontWeight: '900' },
  pctBigSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  brandBanco: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  brandComercio: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 2, marginBottom: 12 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: theme.radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  statePillGreen: { backgroundColor: '#E7F8F0' },
  statePillRed: { backgroundColor: '#FDECEC' },
  statePillTxt: { fontSize: 12, fontWeight: '700' },

  aplicaCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E7F8F0', borderRadius: theme.radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#BFEBD8' },
  aplicaTxt: { flex: 1, color: theme.colors.success, fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  cardText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 2, fontWeight: '600' },
  infoValue: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },

  nivHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 6 },
  nivH: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  nivRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10 },
  nivRowMine: { backgroundColor: theme.colors.primaryLight },
  nivBadge: { flex: 1, alignSelf: 'flex-start', backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', maxWidth: 110 },
  nivBadgeTxt: { color: theme.colors.navy, fontSize: 12, fontWeight: '700' },
  nivPct: { color: theme.colors.primaryDark, fontSize: 15, fontWeight: '800' },
  nivTope: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  nivNota: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 10 },

  obsCard: { flexDirection: 'row', gap: 10, backgroundColor: '#FFF8EC', borderRadius: theme.radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F5E3C2' },
  obsTxt: { flex: 1, color: '#8A6D3B', fontSize: 13, lineHeight: 19, fontWeight: '600' },

  verifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  verifTxt: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },

  btnReporte: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FDECEC', borderRadius: theme.radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: '#F7C9C9', marginBottom: 8 },
  btnReporteTxt: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },

  footer: { padding: 16, paddingBottom: 28, backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  btnPrincipal: { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 17, gap: 8 },
  btnPrincipalTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,42,78,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.borderStrong, alignSelf: 'center', marginBottom: 14 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '800' },
  modalSub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 16 },
  modalLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  motivosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  motivoChip: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  motivoChipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  motivoTxt: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  motivoTxtActive: { color: '#fff', fontWeight: '700' },
  modalInput: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, minHeight: 90, color: theme.colors.text, fontSize: 14, textAlignVertical: 'top' },
  modalInputSingle: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text, fontSize: 14 },
  btnEnviar: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 18 },
  btnEnviarTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
