import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { BancoLogo, TipoBadge } from '../components/ui';
import { getFavoritos, toggleFavorito, getMisTarjetas, tarjetaQueAplica, porcentajePersonalizado } from '../lib/storage';

const DIAS_LABEL = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };
const TIPOS = [
  { id: 'todos', label: 'Todas' }, { id: 'credito', label: 'Crédito' },
  { id: 'debito', label: 'Débito' }, { id: 'premium', label: 'Premium' },
];

export default function ComercioScreen({ route, navigation }) {
  const { comercio } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoritos, setFavoritos] = useState([]);
  const [misTarjetas, setMisTarjetas] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroBanco, setFiltroBanco] = useState('todos');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('beneficios')
        .select('*, bancos(nombre,color,url_web,url_beneficios,logo_url), categorias(nombre,emoji)')
        .eq('comercio', comercio).eq('activo', true)
        .order('porcentaje', { ascending: false });
      setItems(data || []);
      setLoading(false);
    })();
  }, [comercio]);

  useFocusEffect(useCallback(() => {
    (async () => { setFavoritos(await getFavoritos()); setMisTarjetas(await getMisTarjetas()); })();
  }, []));

  const onFav = async (id) => setFavoritos(await toggleFavorito(id));

  const bancosPresentes = useMemo(() => {
    const m = new Map();
    items.forEach(b => { if (b.bancos && !m.has(b.banco_id)) m.set(b.banco_id, b.bancos); });
    return [...m.entries()].map(([id, bk]) => ({ id, ...bk }));
  }, [items]);

  const filtrados = useMemo(() => items.filter(b => {
    const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
    const tipoMatch = filtroTipo === 'todos'
      || (filtroTipo === 'credito' && ['credito', 'ambas', 'premium'].includes(tipo))
      || (filtroTipo === 'debito' && ['debito', 'ambas'].includes(tipo))
      || (filtroTipo === 'premium' && tipo === 'premium');
    const bancoMatch = filtroBanco === 'todos' || b.banco_id == filtroBanco;
    return tipoMatch && bancoMatch;
  }), [items, filtroTipo, filtroBanco]);

  if (loading) return (<View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);

  const tipoLabel = { credito: 'Solo Crédito', debito: 'Solo Débito', premium: 'Premium', ambas: 'Crédito y Débito' };

  return (
    <View style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={theme.colors.navy} /></TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{comercio}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={s.count}>{filtrados.length} beneficio{filtrados.length === 1 ? '' : 's'} disponible{filtrados.length === 1 ? '' : 's'}</Text>

      {/* FILTRO TIPO DE TARJETA */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {TIPOS.map(t => (
          <TouchableOpacity key={t.id} style={[s.chip, filtroTipo === t.id && s.chipActive]} onPress={() => setFiltroTipo(t.id)}>
            <Text style={[s.chipText, filtroTipo === t.id && s.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FILTRO BANCO (si hay más de uno) */}
      {bancosPresentes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
          <TouchableOpacity style={[s.chip, filtroBanco === 'todos' && s.chipActive]} onPress={() => setFiltroBanco('todos')}>
            <Text style={[s.chipText, filtroBanco === 'todos' && s.chipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {bancosPresentes.map(bk => {
            const activo = filtroBanco == bk.id;
            return (
              <TouchableOpacity key={bk.id} style={[s.chip, activo && s.chipActive, activo && bk.color && { backgroundColor: bk.color, borderColor: bk.color }]} onPress={() => setFiltroBanco(activo ? 'todos' : bk.id)}>
                {!activo && <View style={[s.bancoDot, { backgroundColor: bk.color || theme.colors.navy }]} />}
                <Text style={[s.chipText, activo && s.chipTextActive]}>{bk.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {filtrados.map(b => {
          const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
          const aplica = tarjetaQueAplica(b, misTarjetas);
          const pers = porcentajePersonalizado(b, misTarjetas);
          const esFav = favoritos.includes(b.id);
          const pctTxt = pers ? `${pers.porcentaje}%` : (b.porcentaje ? `${b.niveles ? 'Hasta ' : ''}${b.porcentaje}%` : null);
          return (
            <TouchableOpacity key={b.id} style={s.card} activeOpacity={0.8} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
              <BancoLogo banco={b.bancos} comercio={b.comercio} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardBanco} numberOfLines={1}>{b.bancos?.nombre}</Text>
                <Text style={s.cardTipo} numberOfLines={1}>{tipoLabel[tipo] || 'Crédito y Débito'}</Text>
                <View style={s.tags}>
                  <TipoBadge tipo={b.tipo_beneficio} />
                  {aplica ? <View style={s.tagAplica}><Ionicons name="checkmark-circle" size={11} color={theme.colors.success} /><Text style={s.tagAplicaTxt}>Tu tarjeta</Text></View> : null}
                  {b.todos_los_dias ? <View style={s.tag}><Text style={s.tagTxt}>Todos los días</Text></View>
                    : b.dias?.length > 0 ? <View style={s.tag}><Text style={s.tagTxt}>{b.dias.map(d => DIAS_LABEL[d] || d).join(' · ')}</Text></View> : null}
                </View>
              </View>
              <View style={s.cardRight}>
                <TouchableOpacity hitSlop={8} onPress={() => onFav(b.id)}><Ionicons name={esFav ? 'heart' : 'heart-outline'} size={20} color={esFav ? theme.colors.danger : theme.colors.textMuted} /></TouchableOpacity>
                {pctTxt ? <View style={[s.pct, pers && s.pctPers]}><Text style={s.pctTxt}>{pctTxt}</Text></View> : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
              </View>
            </TouchableOpacity>
          );
        })}
        {filtrados.length === 0 ? (<View style={s.emptyBox}><Text style={s.emptyText}>No hay beneficios con ese filtro</Text></View>) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 6, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  count: { color: theme.colors.textSecondary, fontSize: 13, paddingHorizontal: 20, marginBottom: 6 },

  filterRow: { flexGrow: 0, marginVertical: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  bancoDot: { width: 8, height: 8, borderRadius: 4 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  cardBanco: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardTipo: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' },
  tag: { backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagTxt: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tagAplica: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E7F8F0', borderRadius: theme.radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagAplicaTxt: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'center', gap: 8 },
  pct: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  pctPers: { backgroundColor: theme.colors.navy },
  pctTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
