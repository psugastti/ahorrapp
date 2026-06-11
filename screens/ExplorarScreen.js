import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme, CATEGORIAS_ICONOS } from '../lib/theme';

const DIAS_LABEL = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

const TIPOS = [
  { id: 'todos', label: 'Todas' },
  { id: 'credito', label: 'Crédito' },
  { id: 'debito', label: 'Débito' },
  { id: 'premium', label: 'Premium' },
];

export default function ExplorarScreen({ navigation }) {
  const [beneficios, setBeneficios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroBanco, setFiltroBanco] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [categoria, setCategoria] = useState(null); // null = mostrar lista de categorías

  const cargar = useCallback(async () => {
    const [{ data: b }, { data: bcos }] = await Promise.all([
      supabase.from('beneficios').select('*, bancos(nombre,color,url_web), categorias(nombre,emoji)').eq('activo', true),
      supabase.from('bancos').select('*').eq('activo', true).order('nombre'),
    ]);
    setBeneficios(b || []);
    setBancos(bcos || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, []);

  // Resumen por categoría (para la lista "Todas las categorías")
  const categorias = useMemo(() => {
    const map = {};
    beneficios.forEach(b => {
      const n = b.categorias?.nombre;
      if (!n) return;
      if (!map[n]) map[n] = { nombre: n, emoji: b.categorias?.emoji, count: 0, max: 0 };
      map[n].count++;
      if ((b.porcentaje || 0) > map[n].max) map[n].max = b.porcentaje || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [beneficios]);

  const hoy = new Date().toISOString().slice(0, 10);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return beneficios.filter(b => {
      const matchQ = !q || b.comercio.toLowerCase().includes(q) || b.bancos?.nombre?.toLowerCase().includes(q) || b.categorias?.nombre?.toLowerCase().includes(q);
      const matchBanco = filtroBanco === 'todos' || b.banco_id == filtroBanco;
      const matchCat = !categoria || b.categorias?.nombre === categoria;
      const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
      const matchTipo = filtroTipo === 'todos'
        || (filtroTipo === 'credito' && ['credito', 'ambas', 'premium'].includes(tipo))
        || (filtroTipo === 'debito' && ['debito', 'ambas'].includes(tipo))
        || (filtroTipo === 'premium' && tipo === 'premium');
      return matchQ && matchBanco && matchCat && matchTipo;
    }).sort((a, b) => (b.porcentaje || 0) - (a.porcentaje || 0));
  }, [beneficios, busqueda, filtroBanco, filtroTipo, categoria]);

  // ¿Mostramos resultados o la lista de categorías?
  const mostrandoResultados = !!categoria || !!busqueda.trim() || filtroBanco !== 'todos' || filtroTipo !== 'todos';

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  );

  const Chip = ({ active, onPress, children, color }) => (
    <TouchableOpacity style={[s.chip, active && s.chipActive, active && color && { backgroundColor: color, borderColor: color }]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{children}</Text>
    </TouchableOpacity>
  );

  const renderBeneficio = (b) => {
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
        {b.porcentaje ? (
          <View style={s.pct}><Text style={s.pctTxt}>{b.porcentaje}%</Text></View>
        ) : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  const renderCategoria = (c) => (
    <TouchableOpacity key={c.nombre} style={s.catRow} activeOpacity={0.7} onPress={() => setCategoria(c.nombre)}>
      <View style={s.catIcon}><Ionicons name={CATEGORIAS_ICONOS[c.nombre] || 'pricetag'} size={20} color={theme.colors.navy} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.catName}>{c.nombre}</Text>
        <Text style={s.catSub}>Hasta {c.max}% · {c.count} beneficios</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Explorar beneficios</Text>
      </View>

      {/* BUSCADOR */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar marcas o categorías"
          placeholderTextColor={theme.colors.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda ? <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={18} color={theme.colors.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* TIPO DE TARJETA */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {TIPOS.map(t => <Chip key={t.id} active={filtroTipo === t.id} onPress={() => setFiltroTipo(t.id)}>{t.label}</Chip>)}
      </ScrollView>

      {/* BANCOS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        <Chip active={filtroBanco === 'todos'} onPress={() => setFiltroBanco('todos')}>Todos los bancos</Chip>
        {bancos.map(b => (
          <Chip key={b.id} active={filtroBanco == b.id} color={b.color} onPress={() => setFiltroBanco(filtroBanco == b.id ? 'todos' : b.id)}>{b.nombre}</Chip>
        ))}
      </ScrollView>

      {/* CATEGORÍA SELECCIONADA (chip removible) */}
      {categoria && (
        <View style={s.activeCatRow}>
          <View style={s.activeCat}>
            <Text style={s.activeCatTxt}>{categoria}</Text>
            <TouchableOpacity onPress={() => setCategoria(null)}><Ionicons name="close" size={16} color={theme.colors.navy} /></TouchableOpacity>
          </View>
          <Text style={s.activeCatCount}>{filtrados.length} resultados</Text>
        </View>
      )}

      {/* CONTENIDO */}
      {mostrandoResultados ? (
        <FlatList
          data={filtrados}
          keyExtractor={(b) => String(b.id)}
          renderItem={({ item }) => renderBeneficio(item)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.emptyBox}><Ionicons name="search-outline" size={40} color={theme.colors.textMuted} /><Text style={s.emptyText}>No hay resultados</Text></View>}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionTitle}>Todas las categorías</Text>
          <View style={s.catList}>
            {categorias.map(renderCategoria)}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  searchBox: { marginHorizontal: 16, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 8 },

  filterRow: { flexGrow: 0, marginBottom: 2 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 5, gap: 8 },
  chip: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  activeCatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  activeCat: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  activeCatTxt: { color: theme.colors.navy, fontSize: 13, fontWeight: '700' },
  activeCatCount: { color: theme.colors.textMuted, fontSize: 12 },

  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  catList: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  catIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  catName: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  catSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Card beneficio
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

  emptyBox: { alignItems: 'center', padding: 50, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
