import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

const { width } = Dimensions.get('window');
const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const DIAS_LABEL = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' };
const HOY = DIAS[new Date().getDay()];
const MANANA = DIAS[(new Date().getDay() + 1) % 7];

const FILTROS_DIA = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoy', label: '📅 Hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'finde', label: 'Fin de semana' },
];

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
        .select('*, bancos(nombre,color,slug), categorias(nombre,emoji)')
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

  const filtrados = beneficios.filter(b => {
    const diasMatch = (() => {
      if (filtroDia === 'todos') return true;
      if (b.todos_los_dias) return true;
      if (filtroDia === 'hoy') return (b.dias||[]).includes(HOY);
      if (filtroDia === 'manana') return (b.dias||[]).includes(MANANA);
      if (filtroDia === 'finde') return (b.dias||[]).some(d => ['sabado','domingo'].includes(d));
      return (b.dias||[]).includes(filtroDia);
    })();
    const catMatch = filtroCategoria === 'todas' || b.categorias?.nombre === filtroCategoria;
    return diasMatch && catMatch;
  });

  const destacados = filtrados.filter(b => b.featured);
  const resto = filtrados.filter(b => !b.featured);
  const hoy = new Date().toISOString().slice(0, 10);

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
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
          <Text style={s.headerGreeting}>Buenos días 👋</Text>
          <Text style={s.headerTitle}>Ahorrapp</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{filtrados.length}</Text>
          <Text style={s.headerBadgeSub}>beneficios</Text>
        </View>
      </View>

      {/* FILTRO DÍAS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        {FILTROS_DIA.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.chip, filtroDia === f.id && s.chipActive]}
            onPress={() => setFiltroDia(f.id)}
          >
            <Text style={[s.chipText, filtroDia === f.id && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {Object.entries(DIAS_LABEL).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[s.chip, filtroDia === id && s.chipActive]}
            onPress={() => setFiltroDia(id)}
          >
            <Text style={[s.chipText, filtroDia === id && s.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CATEGORÍAS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosContent}>
        <TouchableOpacity
          style={[s.chip, filtroCategoria === 'todas' && s.chipActive]}
          onPress={() => setFiltroCategoria('todas')}
        >
          <Text style={[s.chipText, filtroCategoria === 'todas' && s.chipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {categorias.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.chip, filtroCategoria === c.nombre && s.chipActive]}
            onPress={() => setFiltroCategoria(c.nombre)}
          >
            <Text style={[s.chipText, filtroCategoria === c.nombre && s.chipTextActive]}>
              {c.emoji} {c.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DESTACADOS */}
      {destacados.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>⭐ Destacados</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
            {destacados.map(b => (
              <TouchableOpacity key={b.id} style={s.cardDestacado} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
                <View style={[s.cardBancoBar, { backgroundColor: b.bancos?.color || theme.colors.primary }]} />
                <View style={s.cardDestacadoBody}>
                  <Text style={s.cardBanco}>{b.bancos?.nombre}</Text>
                  <Text style={s.cardComercio} numberOfLines={1}>{b.comercio}</Text>
                  {b.porcentaje ? (
                    <View style={s.pctBadge}>
                      <Text style={s.pctText}>{b.porcentaje}%</Text>
                    </View>
                  ) : null}
                  <Text style={s.cardCat}>{b.categorias?.emoji} {b.categorias?.nombre}</Text>
                  {b.todos_los_dias ? (
                    <Text style={s.cardDias}>Todos los días</Text>
                  ) : b.dias?.length > 0 ? (
                    <Text style={s.cardDias}>{b.dias.map(d => DIAS_LABEL[d]).join(' · ')}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* TODOS LOS BENEFICIOS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {filtroDia === 'hoy' ? 'Hoy disponible' : filtroDia === 'finde' ? 'Este fin de semana' : 'Todos los beneficios'}
          <Text style={s.sectionCount}> ({resto.length})</Text>
        </Text>
        {resto.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>No hay beneficios{filtroDia !== 'todos' ? ' para este filtro' : ''}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {resto.map(b => {
              const vencido = b.vence && b.vence < hoy;
              const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta;
              return (
                <TouchableOpacity key={b.id} style={s.card} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
                  <View style={[s.cardStripe, { backgroundColor: b.bancos?.color || theme.colors.primary }]} />
                  <View style={s.cardBody}>
                    <View style={s.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardComercioSm} numberOfLines={1}>{b.comercio}</Text>
                        <Text style={s.cardBancoSm}>{b.bancos?.nombre} · {b.categorias?.emoji} {b.categorias?.nombre}</Text>
                      </View>
                      {b.porcentaje ? (
                        <View style={s.pctBadgeSm}>
                          <Text style={s.pctTextSm}>{b.porcentaje}%</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={s.cardTags}>
                      {b.todos_los_dias ? (
                        <View style={s.tag}><Text style={s.tagText}>Todos los días</Text></View>
                      ) : b.dias?.length > 0 ? (
                        <View style={s.tagDia}><Text style={s.tagText}>{b.dias.map(d => DIAS_LABEL[d]).join(' · ')}</Text></View>
                      ) : null}
                      {tipo === 'premium' && <View style={s.tagPremium}><Text style={s.tagTextPremium}>⭐ Premium</Text></View>}
                      {tipo === 'debito' && <View style={s.tagDebito}><Text style={s.tagTextDebito}>Débito</Text></View>}
                      {b.requiere_qr && <View style={s.tagQR}><Text style={s.tagText}>QR</Text></View>}
                      {b.vence && (
                        <View style={[s.tag, vencido && s.tagVencido]}>
                          <Text style={[s.tagText, vencido && { color: theme.colors.danger }]}>
                            {vencido ? '⚠ ' : ''}Vence {b.vence}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={{ alignSelf: 'center', marginRight: 12 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerGreeting: { color: theme.colors.textSecondary, fontSize: 13 },
  headerTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerBadge: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  headerBadgeText: { color: theme.colors.primary, fontSize: 22, fontWeight: '800' },
  headerBadgeSub: { color: theme.colors.textMuted, fontSize: 11 },

  filtrosScroll: { marginBottom: 4 },
  filtrosContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sectionCount: { color: theme.colors.textMuted, fontWeight: '400', fontSize: 14 },

  // Card destacado (horizontal)
  cardDestacado: {
    width: 180, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden',
  },
  cardBancoBar: { height: 4, width: '100%' },
  cardDestacadoBody: { padding: 14 },
  cardBanco: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  cardComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  cardCat: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 },
  cardDias: { color: theme.colors.primary, fontSize: 11, marginTop: 4, fontWeight: '600' },
  pctBadge: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pctText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Card lista (vertical)
  card: {
    backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', overflow: 'hidden',
  },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 13 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardComercioSm: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardBancoSm: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  pctBadgeSm: { backgroundColor: theme.colors.primary + '22', borderRadius: theme.radius.sm, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  pctTextSm: { color: theme.colors.primary, fontWeight: '800', fontSize: 16 },

  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagDia: { backgroundColor: '#0D2E4A', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagPremium: { backgroundColor: '#2D1A00', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagTextPremium: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
  tagDebito: { backgroundColor: '#0A2A1A', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagTextDebito: { color: theme.colors.success, fontSize: 11, fontWeight: '600' },
  tagQR: { backgroundColor: '#1A0A2A', borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagVencido: { backgroundColor: '#2A0A0A' },
  tagText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },

  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
});
