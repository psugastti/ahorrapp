import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
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
  { id: 'finde', label: 'Fin de semana' },
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroDia, setFiltroDia] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  const cargar = useCallback(async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from('beneficios')
        .select('*, bancos(nombre,color,url_web), categorias(nombre,emoji)')
        .eq('activo', true)
        .order('featured', { ascending: false })
        .order('porcentaje', { ascending: false }),
      supabase.from('categorias').select('*').eq('is_active', true).order('nombre'),
    ]);
    setBeneficios(b || []);
    setCategorias(c || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => beneficios.filter(b => {
    const diasMatch = (() => {
      if (filtroDia === 'todos') return true;
      if (b.todos_los_dias) return true;
      if (filtroDia === 'hoy') return (b.dias || []).includes(HOY);
      if (filtroDia === 'finde') return (b.dias || []).some(d => ['sabado', 'domingo'].includes(d));
      return (b.dias || []).includes(filtroDia);
    })();
    const catMatch = filtroCategoria === 'todas' || b.categorias?.nombre === filtroCategoria;
    return diasMatch && catMatch;
  }), [beneficios, filtroDia, filtroCategoria]);

  const destacados = useMemo(() => beneficios.filter(b => b.porcentaje >= 30).slice(0, 8), [beneficios]);
  const hoy = new Date().toISOString().slice(0, 10);

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  );

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerGreeting}>{saludo()} 👋</Text>
          <Text style={s.headerTitle}>Ahorrapp</Text>
        </View>
        <View style={s.bell}><Ionicons name="notifications-outline" size={20} color={theme.colors.navy} /></View>
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

      {/* FILTRO DÍAS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        {FILTROS_DIA.map(f => (
          <TouchableOpacity key={f.id} style={[s.chip, filtroDia === f.id && s.chipActive]} onPress={() => setFiltroDia(f.id)}>
            <Text style={[s.chipText, filtroDia === f.id && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DESTACADOS */}
      {destacados.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Destacados</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explorar')}><Text style={s.verTodos}>Ver todos</Text></TouchableOpacity>
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
        <Text style={[s.sectionTitle, { paddingHorizontal: 16 }]}>
          {filtroDia === 'hoy' ? 'Disponibles hoy' : filtroDia === 'finde' ? 'Este fin de semana' : 'Todos los beneficios'}
          <Text style={s.sectionCount}>  {filtrados.length}</Text>
        </Text>
        {filtrados.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>No hay beneficios para este filtro</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 16, marginTop: 4 }}>
            {filtrados.slice(0, 40).map(b => {
              const vencido = b.vence && b.vence < hoy;
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
                      {vencido && <View style={s.tagRed}><Text style={s.tagRedTxt}>Vencido</Text></View>}
                    </View>
                  </View>
                  {b.porcentaje ? <View style={s.pct}><Text style={s.pctTxt}>{b.porcentaje}%</Text></View>
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14 },
  headerGreeting: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  headerTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  hero: { marginHorizontal: 16, backgroundColor: theme.colors.navy, borderRadius: theme.radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  heroBig: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  filtrosScroll: { flexGrow: 0, marginVertical: 6 },
  filtrosContent: { paddingHorizontal: 16, gap: 8 },
  chip: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

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
  tagRed: { backgroundColor: '#FDECEC', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagRedTxt: { color: theme.colors.danger, fontSize: 11, fontWeight: '700' },
  pct: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  pctTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
