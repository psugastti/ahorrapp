import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_LABEL = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };
const HOY = DIAS[new Date().getDay()];

const FILTROS_DIA = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'finde', label: 'Finde' },
  { id: 'lunes', label: 'Lun' },
  { id: 'martes', label: 'Mar' },
  { id: 'miercoles', label: 'Mié' },
  { id: 'jueves', label: 'Jue' },
  { id: 'viernes', label: 'Vie' },
  { id: 'sabado', label: 'Sáb' },
  { id: 'domingo', label: 'Dom' },
];

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

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

  const cargar = useCallback(async () => {
    const [{ data: b }, { data: c }, { data: bcos }] = await Promise.all([
      supabase.from('beneficios')
        .select('*, bancos(nombre,color,url_web,url_beneficios), categorias(nombre,emoji)')
        .eq('activo', true)
        .order('featured', { ascending: false })
        .order('porcentaje', { ascending: false }),
      supabase.from('categorias').select('*').eq('is_active', true).order('nombre'),
      supabase.from('bancos').select('*').eq('activo', true).order('nombre'),
    ]);
    setBeneficios(b || []);
    setCategorias(c || []);
    setBancos(bcos || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { cargar(); }, []);

  const limpiarFiltros = () => { setBusqueda(''); setFiltroDia('todos'); setFiltroCategoria('todas'); setFiltroBanco('todos'); };

  const filtrados = useMemo(() => beneficios.filter(b => {
    const q = busqueda.trim().toLowerCase();
    const matchQ = !q
      || b.comercio?.toLowerCase().includes(q)
      || b.bancos?.nombre?.toLowerCase().includes(q)
      || b.categorias?.nombre?.toLowerCase().includes(q);
    const diasMatch = (() => {
      if (filtroDia === 'todos') return true;
      if (b.todos_los_dias) return true;
      if (filtroDia === 'hoy') return (b.dias || []).includes(HOY);
      if (filtroDia === 'finde') return (b.dias || []).some(d => ['sabado', 'domingo'].includes(d));
      return (b.dias || []).includes(filtroDia);
    })();
    const catMatch = filtroCategoria === 'todas' || b.categorias?.nombre === filtroCategoria;
    const bancoMatch = filtroBanco === 'todos' || b.banco_id == filtroBanco;
    return matchQ && diasMatch && catMatch && bancoMatch;
  }), [beneficios, busqueda, filtroDia, filtroCategoria, filtroBanco]);

  const destacados = useMemo(() => beneficios.filter(b => b.porcentaje >= 30).slice(0, 8), [beneficios]);
  const hoy = new Date().toISOString().slice(0, 10);
  const hayFiltro = busqueda.trim() || filtroDia !== 'todos' || filtroCategoria !== 'todas' || filtroBanco !== 'todos';

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  );

  return (
    <ScrollView
      style={s.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerGreeting}>{saludo()} 👋</Text>
          <Text style={s.headerTitle}>Ahorrapp</Text>
        </View>
      </View>

      {/* BUSCADOR POR COMERCIO */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar comercio, banco o categoría"
          placeholderTextColor={theme.colors.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
        {busqueda ? <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={18} color={theme.colors.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* HERO */}
      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroKicker}>Más beneficios, más ahorro</Text>
          <Text style={s.heroBig}>{beneficios.length}</Text>
          <Text style={s.heroSub}>descuentos y reintegros disponibles</Text>
        </View>
        <View style={s.heroIcon}><Ionicons name="pricetags" size={30} color="#fff" /></View>
      </View>

      {/* SELECTOR DE DÍA */}
      <View style={s.filtroHead}>
        <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} />
        <Text style={s.filtroHeadTxt}>Elegí el día</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        {FILTROS_DIA.map(f => (
          <TouchableOpacity key={f.id} style={[s.chip, filtroDia === f.id && s.chipActive]} onPress={() => setFiltroDia(f.id)}>
            <Text style={[s.chipText, filtroDia === f.id && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SELECTOR DE BANCO */}
      <View style={s.filtroHead}>
        <Ionicons name="business-outline" size={15} color={theme.colors.textSecondary} />
        <Text style={s.filtroHeadTxt}>Banco</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        <TouchableOpacity style={[s.chip, filtroBanco === 'todos' && s.chipActive]} onPress={() => setFiltroBanco('todos')}>
          <Text style={[s.chipText, filtroBanco === 'todos' && s.chipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {bancos.map(bk => {
          const activo = filtroBanco == bk.id;
          return (
            <TouchableOpacity
              key={bk.id}
              style={[s.chip, activo && s.chipActive, activo && bk.color && { backgroundColor: bk.color, borderColor: bk.color }]}
              onPress={() => setFiltroBanco(activo ? 'todos' : bk.id)}
            >
              {!activo && <View style={[s.bancoDot, { backgroundColor: bk.color || theme.colors.navy }]} />}
              <Text style={[s.chipText, activo && s.chipTextActive]}>{bk.nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* DESTACADOS (se ocultan al filtrar/buscar) */}
      {!hayFiltro && destacados.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Destacados</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {destacados.map(b => (
              <TouchableOpacity key={b.id} style={s.cardDestacado} activeOpacity={0.85} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
                <View style={s.cardDestTop}>
                  <View style={[s.cardDestLogo, { backgroundColor: (b.bancos?.color || theme.colors.navy) + '18' }]}>
                    <Text style={[s.cardDestLogoTxt, { color: b.bancos?.color || theme.colors.navy }]}>{(b.comercio || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
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

      {/* CATEGORÍAS */}
      <View style={s.filtroHead}>
        <Ionicons name="grid-outline" size={15} color={theme.colors.textSecondary} />
        <Text style={s.filtroHeadTxt}>Categorías</Text>
      </View>
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

      {/* LISTA */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>
            {filtroDia === 'hoy' ? 'Disponibles hoy' : filtroDia === 'finde' ? 'Este fin de semana' : 'Beneficios'}
            <Text style={s.sectionCount}>  {filtrados.length}</Text>
          </Text>
          {hayFiltro ? <TouchableOpacity onPress={limpiarFiltros}><Text style={s.verTodos}>Limpiar</Text></TouchableOpacity> : null}
        </View>
        {filtrados.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>No hay beneficios para este filtro</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 16, marginTop: 4 }}>
            {filtrados.slice(0, 60).map(b => {
              const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta;
              return (
                <TouchableOpacity key={b.id} style={s.card} activeOpacity={0.8} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
                  <View style={[s.cardLogo, { backgroundColor: (b.bancos?.color || theme.colors.navy) + '14' }]}>
                    <Text style={[s.cardLogoTxt, { color: b.bancos?.color || theme.colors.navy }]}>{(b.comercio || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardComercio} numberOfLines={1}>{b.comercio}</Text>
                    <Text style={s.cardSub} numberOfLines={1}>{b.bancos?.nombre} · {b.categorias?.emoji} {b.categorias?.nombre}</Text>
                    <View style={s.tags}>
                      {tipo === 'premium' && <View style={s.tagPremium}><Text style={s.tagPremiumTxt}>★ Premium</Text></View>}
                      {b.todos_los_dias ? <View style={s.tag}><Text style={s.tagTxt}>Todos los días</Text></View>
                        : b.dias?.length > 0 ? <View style={s.tag}><Text style={s.tagTxt}>{b.dias.map(d => DIAS_LABEL[d] || d).join(' · ')}</Text></View> : null}
                      {b.niveles ? <View style={s.tagNivel}><Text style={s.tagNivelTxt}>Por nivel</Text></View> : null}
                    </View>
                  </View>
                  {b.porcentaje ? <View style={s.pct}><Text style={s.pctTxt}>{b.niveles ? 'Hasta ' : ''}{b.porcentaje}%</Text></View>
                    : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  headerGreeting: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  headerTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  searchBox: { marginHorizontal: 16, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 8 },

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
  cardDestLogo: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardDestLogoTxt: { fontSize: 18, fontWeight: '800' },
  pctBadge: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, paddingHorizontal: 9, paddingVertical: 4 },
  pctBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardDestComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardDestBanco: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardDestCat: { color: theme.colors.textMuted, fontSize: 12, marginTop: 6 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  cardLogo: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLogoTxt: { fontSize: 20, fontWeight: '800' },
  cardComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagTxt: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tagPremium: { backgroundColor: '#FFF4E0', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagPremiumTxt: { color: '#B7791F', fontSize: 11, fontWeight: '700' },
  tagNivel: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagNivelTxt: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '700' },
  pct: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  pctTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
