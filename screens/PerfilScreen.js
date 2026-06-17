import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import {
  getMisBancos, setMisBancos, getMisTarjetas, setMisTarjetas,
  getFavoritos, getPrefs, setPrefs,
  MARCAS, NIVELES_TARJETA, marcaLabel, nivelLabel,
} from '../lib/storage';
import { pedirPermisoNotif, permisoNotif, chequearAvisoDiario } from '../lib/notifications';

const SUGERENCIAS_EMAIL = 'psugastti@gmail.com';
const TIPOS = [{ id: 'credito', label: 'Crédito' }, { id: 'debito', label: 'Débito' }];
const UENO_ID = 4;
const HORAS = [8, 9, 10, 12, 18, 20];

export default function PerfilScreen() {
  const [bancos, setBancos] = useState([]);
  const [stats, setStats] = useState({ bancos: 0, beneficios: 0, categorias: 0 });
  const [misBancos, setMisB] = useState([]);
  const [misTarjetas, setMisT] = useState([]);
  const [favCount, setFavCount] = useState(0);
  const [prefs, setP] = useState({ soloMisBancos: false, notifDiarias: false });
  const [loading, setLoading] = useState(true);

  // alta de tarjeta
  const [addOpen, setAddOpen] = useState(false);
  const [selBanco, setSelBanco] = useState(null);
  const [selTipo, setSelTipo] = useState('credito');
  const [selMarca, setSelMarca] = useState(null);
  const [selNivelT, setSelNivelT] = useState(1);
  const [selNivel, setSelNivel] = useState(3);

  const cargar = useCallback(async () => {
    const [{ data: bcos }, { count: nBen }, { count: nCat }] = await Promise.all([
      supabase.from('bancos').select('*').eq('activo', true).order('nombre'),
      supabase.from('beneficios').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    setBancos(bcos || []);
    setStats({ bancos: (bcos || []).length, beneficios: nBen || 0, categorias: nCat || 0 });
    setMisB(await getMisBancos());
    setMisT(await getMisTarjetas());
    setFavCount((await getFavoritos()).length);
    setP(await getPrefs());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const toggleBanco = async (id) => {
    const next = misBancos.includes(id) ? misBancos.filter(x => x !== id) : [...misBancos, id];
    setMisB(next); await setMisBancos(next);
  };
  const guardarPref = async (key, val) => { const next = { ...prefs, [key]: val }; setP(next); await setPrefs(next); };

  const agregarTarjeta = async () => {
    if (!selBanco) { Alert.alert('Elegí un banco', 'Seleccioná el banco de tu tarjeta.'); return; }
    const card = { banco_id: selBanco, tipo: selTipo, marca: selMarca, nivel: selTipo === 'debito' ? 1 : selNivelT };
    if (selBanco === UENO_ID) card.ueno_nivel = selNivel;
    const next = [...misTarjetas, card];
    setMisT(next); await setMisTarjetas(next);
    setAddOpen(false); setSelBanco(null); setSelTipo('credito'); setSelMarca(null); setSelNivelT(1); setSelNivel(3);
  };
  const quitarTarjeta = async (i) => { const next = misTarjetas.filter((_, idx) => idx !== i); setMisT(next); await setMisTarjetas(next); };

  const bancoNombre = (id) => bancos.find(b => b.id === id)?.nombre || 'Banco';
  const bancoColor = (id) => bancos.find(b => b.id === id)?.color || theme.colors.primary;

  const MenuItem = ({ icon, label, value, color, last, onPress }) => (
    <TouchableOpacity style={[s.menuItem, !last && s.menuDivider]} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <View style={[s.menuIcon, { backgroundColor: (color || theme.colors.primary) + '18' }]}><Ionicons name={icon} size={18} color={color || theme.colors.primary} /></View>
      <Text style={s.menuLabel}>{label}</Text>
      {value ? <Text style={s.menuValue}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} /> : null}
    </TouchableOpacity>
  );

  const comoFunciona = () => Alert.alert('¿Cómo funciona Ahorrapp?', 'Reunimos los descuentos y reintegros de los bancos de Paraguay. Cargá tus bancos y tarjetas para ver con cuál te conviene pagar, buscá por comercio, elegí el día y guardá favoritos. Si algo está desactualizado, usá "Reportar" dentro del beneficio.');
  const privacidad = () => Alert.alert('Privacidad', 'Tus bancos, tarjetas y favoritos se guardan solo en tu dispositivo. No pedimos datos personales ni de tus tarjetas reales (solo banco y tipo). Los reportes se usan para corregir información.');
  const sugerencias = () => Linking.openURL(`mailto:${SUGERENCIAS_EMAIL}?subject=${encodeURIComponent('Sugerencia para Ahorrapp')}`).catch(() => Alert.alert('Escribinos', `Mandá tu sugerencia a ${SUGERENCIAS_EMAIL}`));
  const toggleNotif = async (v) => {
    if (!v) { await guardarPref('notifDiarias', false); return; }
    const perm = await pedirPermisoNotif();
    await guardarPref('notifDiarias', true);
    if (perm === 'granted') Alert.alert('¡Activado!', 'Cuando abras la app a la hora elegida te vamos a recordar los descuentos del día. En la versión iOS/Android el aviso llegará aunque tengas la app cerrada.');
    else if (perm === 'denied') Alert.alert('Permiso bloqueado', 'El navegador tiene bloqueadas las notificaciones de Ahorrapp. Igual vas a ver el recordatorio dentro de la app. Podés desbloquearlo desde el candado en la barra de direcciones.');
    else Alert.alert('Aviso activado', 'Te mostraremos los descuentos del día al abrir la app a la hora elegida.');
  };
  const probarAviso = async () => {
    const r = await chequearAvisoDiario(true);
    Alert.alert('Así se ve tu aviso', r.cuerpo + (permisoNotif() === 'granted' ? '\n\n(También te llegó como notificación del navegador)' : ''));
  };

  if (loading) return (<View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={s.header}>
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.sub}>Personalizá tu experiencia: elegí tus bancos y tarjetas y mirá solo lo que te sirve.</Text>
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        {[{ label: 'Beneficios', value: stats.beneficios, icon: 'pricetag' }, { label: 'Bancos', value: stats.bancos, icon: 'business' }, { label: 'Favoritos', value: favCount, icon: 'heart' }].map(st => (
          <View key={st.label} style={s.statCard}><Ionicons name={st.icon} size={20} color={theme.colors.primary} /><Text style={s.statNum}>{st.value}</Text><Text style={s.statLabel}>{st.label}</Text></View>
        ))}
      </View>

      {/* MIS BANCOS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Mis bancos</Text>
        <Text style={s.sectionSub}>Tocá los bancos donde tenés cuenta o tarjeta.</Text>
        <View style={s.bancosGrid}>
          {bancos.map(b => {
            const sel = misBancos.includes(b.id);
            return (
              <TouchableOpacity key={b.id} style={[s.bancoChip, sel && { backgroundColor: (b.color || theme.colors.primary) + '14', borderColor: b.color || theme.colors.primary }]} onPress={() => toggleBanco(b.id)}>
                <View style={[s.bancoDot, { backgroundColor: b.color || theme.colors.primary }]} />
                <Text style={[s.bancoNombre, sel && { color: theme.colors.text, fontWeight: '700' }]}>{b.nombre}</Text>
                {sel && <Ionicons name="checkmark-circle" size={15} color={b.color || theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {misBancos.length > 0 && (
          <View style={s.prefRow}>
            <Text style={s.prefTxt}>Mostrar en Inicio solo mis bancos por defecto</Text>
            <Switch value={!!prefs.soloMisBancos} onValueChange={(v) => guardarPref('soloMisBancos', v)} trackColor={{ true: theme.colors.primary }} />
          </View>
        )}
      </View>

      {/* MIS TARJETAS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Mis tarjetas</Text>
        <Text style={s.sectionSub}>Cargá tus tarjetas para ver con cuál te conviene pagar en cada comercio.</Text>

        {misTarjetas.map((t, i) => (
          <View key={i} style={s.tarjetaItem}>
            <View style={[s.tarjetaDot, { backgroundColor: bancoColor(t.banco_id) }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.tarjetaBanco}>{bancoNombre(t.banco_id)}{t.marca ? ` · ${marcaLabel(t.marca)}` : ''}</Text>
              <Text style={s.tarjetaTipo}>
                {TIPOS.find(x => x.id === t.tipo)?.label || (t.tipo === 'premium' ? 'Crédito' : t.tipo)}
                {t.tipo !== 'debito' && (t.nivel > 1 || t.tipo === 'premium') ? ` · ${nivelLabel(t.nivel || 4)}` : ''}
                {t.ueno_nivel ? ` · ueno+ N${t.ueno_nivel}` : ''}
              </Text>
            </View>
            <TouchableOpacity hitSlop={8} onPress={() => quitarTarjeta(i)}><Ionicons name="trash-outline" size={18} color={theme.colors.danger} /></TouchableOpacity>
          </View>
        ))}

        {!addOpen ? (
          <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(true)}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.navy} />
            <Text style={s.addBtnTxt}>Agregar tarjeta</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.addBox}>
            <Text style={s.addLabel}>Banco</Text>
            <View style={s.wrapRow}>
              {bancos.map(b => (
                <TouchableOpacity key={b.id} style={[s.miniChip, selBanco === b.id && s.miniChipOn]} onPress={() => setSelBanco(b.id)}>
                  <Text style={[s.miniChipTxt, selBanco === b.id && s.miniChipTxtOn]}>{b.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.addLabel}>Tipo</Text>
            <View style={s.wrapRow}>
              {TIPOS.map(t => (
                <TouchableOpacity key={t.id} style={[s.miniChip, selTipo === t.id && s.miniChipOn]} onPress={() => setSelTipo(t.id)}>
                  <Text style={[s.miniChipTxt, selTipo === t.id && s.miniChipTxtOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.addLabel}>Marca (opcional)</Text>
            <View style={s.wrapRow}>
              <TouchableOpacity style={[s.miniChip, selMarca === null && s.miniChipOn]} onPress={() => setSelMarca(null)}>
                <Text style={[s.miniChipTxt, selMarca === null && s.miniChipTxtOn]}>Cualquiera</Text>
              </TouchableOpacity>
              {MARCAS.map(m => (
                <TouchableOpacity key={m.id} style={[s.miniChip, selMarca === m.id && s.miniChipOn]} onPress={() => setSelMarca(m.id)}>
                  <Text style={[s.miniChipTxt, selMarca === m.id && s.miniChipTxtOn]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selTipo !== 'debito' && (
              <>
                <Text style={s.addLabel}>Nivel de tarjeta</Text>
                <View style={s.wrapRow}>
                  {NIVELES_TARJETA.map(n => (
                    <TouchableOpacity key={n.id} style={[s.miniChip, selNivelT === n.id && s.miniChipOn]} onPress={() => setSelNivelT(n.id)}>
                      <Text style={[s.miniChipTxt, selNivelT === n.id && s.miniChipTxtOn]}>{n.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {selBanco === UENO_ID && (
              <>
                <Text style={s.addLabel}>Tu nivel ueno+</Text>
                <View style={s.wrapRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} style={[s.miniChip, selNivel === n && s.miniChipOn]} onPress={() => setSelNivel(n)}>
                      <Text style={[s.miniChipTxt, selNivel === n && s.miniChipTxtOn]}>Nivel {n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={s.addActions}>
              <TouchableOpacity style={s.addCancel} onPress={() => { setAddOpen(false); setSelBanco(null); }}><Text style={s.addCancelTxt}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.addSave} onPress={agregarTarjeta}><Text style={s.addSaveTxt}>Agregar</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* PREFERENCIAS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Preferencias</Text>
        <View style={s.card}>
          <View style={[s.menuItem, s.menuDivider]}>
            <View style={[s.menuIcon, { backgroundColor: theme.colors.primary + '18' }]}><Ionicons name="notifications-outline" size={18} color={theme.colors.primary} /></View>
            <Text style={s.menuLabel}>Aviso de beneficios del día</Text>
            <Switch value={!!prefs.notifDiarias} onValueChange={toggleNotif} trackColor={{ true: theme.colors.primary }} />
          </View>
          {prefs.notifDiarias && (
            <View style={[s.menuItem, s.menuDivider, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <Text style={s.notifHoraLabel}>¿A qué hora querés el recordatorio?</Text>
              <View style={s.wrapRow}>
                {HORAS.map(h => (
                  <TouchableOpacity key={h} style={[s.miniChip, (prefs.notifHora ?? 10) === h && s.miniChipOn]} onPress={() => guardarPref('notifHora', h)}>
                    <Text style={[s.miniChipTxt, (prefs.notifHora ?? 10) === h && s.miniChipTxtOn]}>{h}:00</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.probarBtn} onPress={probarAviso}>
                <Ionicons name="paper-plane-outline" size={15} color={theme.colors.navy} />
                <Text style={s.probarBtnTxt}>Probar aviso ahora</Text>
              </TouchableOpacity>
              <Text style={s.notifNota}>En web el aviso aparece al abrir la app a esa hora. Con la app cerrada llegará en la versión iOS/Android.</Text>
            </View>
          )}
          <MenuItem icon="information-circle-outline" label="¿Cómo funciona?" onPress={comoFunciona} />
          <MenuItem icon="shield-checkmark-outline" label="Privacidad" color={theme.colors.success} onPress={privacidad} />
          <MenuItem icon="chatbubble-outline" label="Sugerencias" color={theme.colors.navy} onPress={sugerencias} />
          <MenuItem icon="star-outline" label="Versión" value="3.1.0" color={theme.colors.warning} last />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingTop: 66, paddingBottom: 18, paddingHorizontal: 24 },
  logo: { width: 200, height: 50, marginBottom: 8 },
  sub: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  statLabel: { color: theme.colors.textSecondary, fontSize: 12 },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  sectionSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 14 },

  bancosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bancoChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border },
  bancoDot: { width: 9, height: 9, borderRadius: 5 },
  bancoNombre: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },

  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  prefTxt: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: '600' },

  tarjetaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 13, marginBottom: 8 },
  tarjetaDot: { width: 10, height: 10, borderRadius: 5 },
  tarjetaBanco: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  tarjetaTipo: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', paddingVertical: 13, marginTop: 4 },
  addBtnTxt: { color: theme.colors.navy, fontSize: 14, fontWeight: '700' },

  addBox: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginTop: 4 },
  addLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  miniChip: { backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: theme.colors.border },
  miniChipOn: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  miniChipTxt: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  miniChipTxtOn: { color: '#fff', fontWeight: '700' },
  addActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  addCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  addCancelTxt: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
  addSave: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  addSaveTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  menuValue: { color: theme.colors.textSecondary, fontSize: 13 },
  notifHoraLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  notifNota: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
  probarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, alignSelf: 'flex-start', paddingHorizontal: 14 },
  probarBtnTxt: { color: theme.colors.navy, fontSize: 13, fontWeight: '700' },
});
