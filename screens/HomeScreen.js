import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { BancoLogo } from '../components/ui';
import { getMisBancos, getMisTarjetas, getPrefs, tarjetaQueAplica } from '../lib/storage';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const HOY = DIAS[new Date().getDay()];

const FILTROS_DIA = [
  { id: 'todos', label: 'Todos' }, { id: 'hoy', label: 'Hoy' }, { id: 'finde', label: 'Finde' },
  { id: 'lunes', label: 'Lun' }, { id: 'martes', label: 'Mar' }, { id: 'miercoles', label: 'Mié' },
  { id: 'jueves', label: 'Jue' }, { id: 'viernes', label: 'Vie' }, { id: 'sabado', label: 'Sáb' }, { id: 'domingo', label: 'Dom' },
];

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const COLS = 'id,comercio,porcentaje,banco_id,categoria_id,dias,todos_los_dias,tipo_tarjeta,tipo_tarjeta_simple,niveles,tipo_beneficio, bancos(nombre,color,logo_url), categorias(nombre,emoji)';

export default function HomeScreen({ navigation }) {
  const [beneficios, setBeneficios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroDia, setFiltroDia] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroBanco, setFiltroBanco] = useState('todos');

  const [misBancos, setMisBancos] = useState([]);
  const [misTarjetas, setMisTarjetas] = useState([]);
  const [soloMisBancos, setSoloMisBancos] = useState(false);
  const [soloPuedoUsar, setSoloPuedoUsar] = useState(false);

  const cargar = useCallback(async () => {
    let all = [], from = 0; const size = 1000;
    while (true) {
      const { data } = await supabase.from('beneficios').select(COLS)
        .eq('activo', true).order('porcentaje', { ascending: false }).range(from, from + size - 1);
      all = all.concat(data || []);
      if (!data || data.length < size) break;
      from += size;
    }
    const { data: c } = await supabase.from('categorias').select('*').eq('is_active', true).order('nombre');
    const { data: bcos } = await supabase.from('bancos').select('*').eq('activo', true).order('nombre');
    setBeneficios(all); setCategorias(c || []); setBancos(bcos || []);
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { cargar(); }, []);
  useFocusEffect(useCallback(() => {
    (async () => {
      setMisBancos(await getMisBancos());
      setMisTarjetas(await getMisTarjetas());
      const p = await getPrefs(); setSoloMisBancos(!!p.soloMisBancos);
    })();
  }, []));

  const limpiarFiltros = () => { setBusqueda(''); setFiltroDia('todos'); setFiltroCategoria('todas'); setFiltroBanco('todos'); setSoloPuedoUsar(false); };

  const filtrados = useMemo(() => beneficios.filter(b => {
    const q = busqueda.trim().toLowerCase();
    const matchQ = !q || b.comercio?.toLowerCase().includes(q) || b.bancos?.nombre?.toLowerCase().includes(q) || b.categorias?.nombre?.toLowerCase().includes(q);
    const diasMatch = (() => {
      if (filtroDia === 'todos') return true;
      if (b.todos_los_dias) return true;
      if (filtroDia === 'hoy') return (b.dias || []).includes(HOY);
      if (filtroDia === 'finde') return (b.dias || []).some(d => ['sabado', 'domingo'].includes(d));
      return (b.dias || []).includes(filtroDia);
    })();
    const catMatch = filtroCategoria === 'todas' || b.categorias?.nombre === filtroCategoria;
    const bancoMatch = filtroBanco === 'todos' || b.banco_id == filtroBanco;
    const misBancosMatch = !soloMisBancos || misBancos.length === 0 || misBancos.includes(b.banco_id);
    const puedoUsarMatch = !soloPuedoUsar || !!tarjetaQueAplica(b, misTarjetas);
    return matchQ && diasMatch && catMatch && bancoMatch && misBancosMatch && puedoUsarMatch;
  }), [beneficios, busqueda, filtroDia, filtroCategoria, filtroBanco, soloMisBancos, soloPuedoUsar, misBancos, misTarjetas]);

  // Agrupar por comercio
  const comerciosList = useMemo(() => {
    const map = new Map();
    for (const b of filtrados) {
      const key = b.comercio;
      if (!map.has(key)) map.set(key, { comercio: key, items: [], bancos: new Set(), maxPct: 0, cat: b.categorias, aplica: false });
      const g = map.get(key);
      g.items.push(b);
      if (b.banco_id) g.bancos.add(b.banco_id);
      if ((b.porcentaje || 0) > g.maxPct) g.maxPct = b.porcentaje || 0;
      if (!g.aplica && tarjetaQueAplica(b, misTarjetas)) g.aplica = true;
    }
    return [...map.values()].sort((a, b) => b.maxPct - a.maxPct);
  }, [filtrados, misTarjetas]);

  const destacados = useMemo(() => beneficios.filter(b => b.porcentaje >= 30).slice(0, 8), [beneficios]);
  const hayFiltro = busqueda.trim() || filtroDia !== 'todos' || filtroCategoria !== 'todas' || filtroBanco !== 'todos' || soloPuedoUsar;

  if (loading) return (<View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={s.loadTxt}>Cargando beneficios…</Text></View>);

  const irAComercio = (comercio) => navigation.navigate('Comercio', { comercio });

  const renderMerchant = (g) => (
    <TouchableOpacity key={g.comercio} style={s.card} activeOpacity={0.8} onPress={() => irAComercio(g.comercio)}>
      <View style={[s.mLogo, { backgroundColor: theme.colors.navy + '12' }]}>
        <Text style={s.mLogoTxt}>{(g.comercio || '?').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardComercio} numberOfLines={1}>{g.comercio}</Text>
        <Text style={s.cardSub} numberOfLines={1}>{g.cat?.emoji} {g.cat?.nombre} · {g.bancos.size} banco{g.bancos.size > 1 ? 's' : ''}</Text>
        {g.aplica ? <View style={s.tagAplica}><Ionicons name="checkmark-circle" size={11} color={theme.colors.success} /><Text style={s.tagAplicaTxt}>Tenés tarjeta</Text></View> : null}
      </View>
      <View style={s.cardRight}>
        {g.maxPct ? <View style={s.pct}><Text style={s.pctTxt}>Hasta {g.maxPct}%</Text></View> : null}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerGreeting}>{saludo()} 👋</Text>
          <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        </View>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput style={s.searchInput} placeholder="Buscar comercio, banco o categoría" placeholderTextColor={theme.colors.textMuted} value={busqueda} onChangeText={setBusqueda} returnKeyType="search" />
        {busqueda ? <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={18} color={theme.colors.textMuted} /></TouchableOpacity> : null}
      </View>

      <View style={s.togglesRow}>
        {misBancos.length > 0 && (
          <TouchableOpacity style={[s.toggle, soloMisBancos && s.toggleOn]} onPress={() => setSoloMisBancos(v => !v)}>
            <Ionicons name="business" size={13} color={soloMisBancos ? '#fff' : theme.colors.navy} /><Text style={[s.toggleTxt, soloMisBancos && s.toggleTxtOn]}>Mis bancos</Text>
          </TouchableOpacity>
        )}
        {misTarjetas.length > 0 && (
          <TouchableOpacity style={[s.toggle, soloPuedoUsar && s.toggleOn]} onPress={() => setSoloPuedoUsar(v => !v)}>
            <Ionicons name="card" size={13} color={soloPuedoUsar ? '#fff' : theme.colors.navy} /><Text style={[s.toggleTxt, soloPuedoUsar && s.toggleTxtOn]}>Puedo usar</Text>
          </TouchableOpacity>
        )}
        {misBancos.length === 0 && misTarjetas.length === 0 && (
          <TouchableOpacity style={s.toggleHint} onPress={() => navigation.navigate('Perfil')}>
            <Ionicons name="sparkles" size={13} color={theme.colors.primaryDark} /><Text style={s.toggleHintTxt}>Configurá tus bancos y tarjetas en Perfil →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroKicker}>Más beneficios, más ahorro</Text>
          <Text style={s.heroBig}>{beneficios.length}</Text>
          <Text style={s.heroSub}>descuentos y reintegros disponibles</Text>
        </View>
        <View style={s.heroIcon}><Ionicons name="pricetags" size={30} color="#fff" /></View>
      </View>

      <View style={s.filtroHead}><Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} /><Text style={s.filtroHeadTxt}>Elegí el día</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        {FILTROS_DIA.map(f => (
          <TouchableOpacity key={f.id} style={[s.chip, filtroDia === f.id && s.chipActive]} onPress={() => setFiltroDia(f.id)}>
            <Text style={[s.chipText, filtroDia === f.id && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.filtroHead}><Ionicons name="business-outline" size={15} color={theme.colors.textSecondary} /><Text style={s.filtroHeadTxt}>Banco</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        <TouchableOpacity style={[s.chip, filtroBanco === 'todos' && s.chipActive]} onPress={() => setFiltroBanco('todos')}>
          <Text style={[s.chipText, filtroBanco === 'todos' && s.chipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {bancos.map(bk => {
          const activo = filtroBanco == bk.id;
          return (
            <TouchableOpacity key={bk.id} style={[s.chip, activo && s.chipActive, activo && bk.color && { backgroundColor: bk.color, borderColor: bk.color }]} onPress={() => setFiltroBanco(activo ? 'todos' : bk.id)}>
              {!activo && <View style={[s.bancoDot, { backgroundColor: bk.color || theme.colors.navy }]} />}
              <Text style={[s.chipText, activo && s.chipTextActive]}>{bk.nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!hayFiltro && destacados.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHead}><Text style={s.sectionTitle}>Destacados</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {destacados.map(b => (
              <TouchableOpacity key={b.id} style={s.cardDestacado} activeOpacity={0.85} onPress={() => irAComercio(b.comercio)}>
                <View style={s.cardDestTop}>
                  <BancoLogo banco={b.bancos} comercio={b.comercio} size={40} />
                  <View style={s.pctBadge}><Text style={s.pctBadgeTxt}>{b.porcentaje}%</Text></View>
                </View>
                <Text style={s.cardDestComercio} numberOfLines={1}>{b.comercio}</Text>
                <Text style={s.cardDestBanco} numberOfLines={1}>{b.bancos?.nombre}</Text>
                <Text style={s.cardDestCat} numberOfLines={1}>{b.categorias?.emoji} {b.categorias?.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.filtroHead}><Ionicons name="grid-outline" size={15} color={theme.colors.textSecondary} /><Text style={s.filtroHeadTxt}>Categorías</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        <TouchableOpacity style={[s.chip, filtroCategoria === 'todas' && s.chipActive]} onPress={() => setFiltroCategoria('todas')}>
          <Text style={[s.chipText, filtroCategoria === 'todas' && s.chipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {categorias.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, filtroCategoria === c.nombre && s.chipActive]} onPress={() => setFiltroCategoria(c.nombre)}>
            <Text style={[s.chipText, filtroCategoria === c.nombre && s.chipTextActive]}>{c.emoji} {c.nombre}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Comercios<Text style={s.sectionCount}>  {comerciosList.length}</Text></Text>
          {hayFiltro ? <TouchableOpacity onPress={limpiarFiltros}><Text style={s.verTodos}>Limpiar</Text></TouchableOpacity> : null}
        </View>
        {comerciosList.length === 0 ? (
          <View style={s.emptyBox}><Ionicons name="search-outline" size={40} color={theme.colors.textMuted} /><Text style={s.emptyText}>No hay comercios para este filtro</Text></View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 16, marginTop: 4 }}>
            {comerciosList.slice(0, 120).map(renderMerchant)}
          </View>
        )}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt: { color: theme.colors.textMuted, fontSize: 13 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 8 },
  headerGreeting: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  logo: { width: 168, height: 42, marginLeft: -4 },

  searchBox: { marginHorizontal: 16, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 8 },

  togglesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: theme.colors.border },
  toggleOn: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  toggleTxt: { color: theme.colors.navy, fontSize: 12, fontWeight: '700' },
  toggleTxtOn: { color: '#fff' },
  toggleHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  toggleHintTxt: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },

  hero: { marginHorizontal: 16, backgroundColor: theme.colors.navy, borderRadius: theme.radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  heroBig: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  filtroHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, marginTop: 14, marginBottom: 2 },
  filtroHeadTxt: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  filtrosScroll: { flexGrow: 0, marginVertical: 6 },
  filtrosContent: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  bancoDot: { width: 8, height: 8, borderRadius: 4 },

  section: { marginTop: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  sectionCount: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
  verTodos: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },

  cardDestacado: { width: 168, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  cardDestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pctBadge: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, paddingHorizontal: 9, paddingVertical: 4 },
  pctBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardDestComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardDestBanco: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardDestCat: { color: theme.colors.textMuted, fontSize: 12, marginTop: 6 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  mLogo: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mLogoTxt: { fontSize: 20, fontWeight: '800', color: theme.colors.navy },
  cardComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  tagAplica: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E7F8F0', borderRadius: theme.radius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  tagAplicaTxt: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  pct: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  pctTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
