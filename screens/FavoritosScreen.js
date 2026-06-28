import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { BancoLogo, TipoBadge } from '../components/ui';
import { getFavoritos, toggleFavorito } from '../lib/storage';

const DIAS_LABEL = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

export default function FavoritosScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const favs = await getFavoritos();
    setFavoritos(favs);
    if (!favs.length) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from('beneficios')
      .select('*, bancos(nombre,color,url_web,url_beneficios,logo_url), categorias(nombre,emoji)')
      .in('id', favs)
      .eq('activo', true)
      .or(`vence.is.null,vence.gte.${new Date().toISOString().slice(0, 10)}`);
    setItems(data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const quitar = async (id) => {
    const next = await toggleFavorito(id);
    setFavoritos(next);
    setItems(prev => prev.filter(x => x.id !== id));
  };

  if (loading) return (<View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.headerTitle}>Favoritos</Text><Text style={s.headerSub}>{items.length} guardado{items.length === 1 ? '' : 's'}</Text></View>
      {items.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="heart-outline" size={48} color={theme.colors.textMuted} />
          <Text style={s.emptyText}>Todavía no guardaste beneficios</Text>
          <Text style={s.emptySub}>Tocá el corazón ♥ en cualquier beneficio para tenerlo a mano acá.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Inicio')}><Text style={s.emptyBtnTxt}>Explorar beneficios</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {items.map(b => {
            const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta;
            return (
              <TouchableOpacity key={b.id} style={s.card} activeOpacity={0.8} onPress={() => navigation.navigate('Detalle', { beneficio: b })}>
                <BancoLogo banco={b.bancos} comercio={b.comercio} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardComercio} numberOfLines={1}>{b.comercio}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{b.bancos?.nombre} · {b.categorias?.emoji} {b.categorias?.nombre}</Text>
                  <View style={s.tags}>
                    <TipoBadge tipo={b.tipo_beneficio} />
                    {b.todos_los_dias ? <View style={s.tag}><Text style={s.tagTxt}>Todos los días</Text></View>
                      : b.dias?.length > 0 ? <View style={s.tag}><Text style={s.tagTxt}>{b.dias.map(d => DIAS_LABEL[d] || d).join(' · ')}</Text></View> : null}
                  </View>
                </View>
                <View style={s.cardRight}>
                  <TouchableOpacity hitSlop={8} onPress={() => quitar(b.id)}><Ionicons name="heart" size={20} color={theme.colors.danger} /></TouchableOpacity>
                  {b.porcentaje ? <View style={s.pct}><Text style={s.pctTxt}>{b.niveles ? 'Hasta ' : ''}{b.porcentaje}%</Text></View> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  headerTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },

  emptyBox: { alignItems: 'center', padding: 40, gap: 10, marginTop: 40 },
  emptyText: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 6 },
  emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  cardComercio: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' },
  tag: { backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  tagTxt: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  cardRight: { alignItems: 'center', gap: 8 },
  pct: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  pctTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
