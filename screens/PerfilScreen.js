import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

export default function PerfilScreen() {
  const [bancos, setBancos] = useState([]);
  const [stats, setStats] = useState({ bancos: 0, beneficios: 0, categorias: 0 });
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: bcos }, { count: nBen }, { count: nCat }] = await Promise.all([
        supabase.from('bancos').select('*').eq('activo', true).order('nombre'),
        supabase.from('beneficios').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      setBancos(bcos || []);
      setStats({ bancos: (bcos || []).length, beneficios: nBen || 0, categorias: nCat || 0 });
      setLoading(false);
    })();
  }, []);

  const toggle = (id) => setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const MenuItem = ({ icon, label, value, color, last }) => (
    <TouchableOpacity style={[s.menuItem, !last && s.menuDivider]} activeOpacity={0.7}>
      <View style={[s.menuIcon, { backgroundColor: (color || theme.colors.primary) + '18' }]}>
        <Ionicons name={icon} size={18} color={color || theme.colors.primary} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      {value ? <Text style={s.menuValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading) return (<View style={s.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={s.header}>
        <View style={s.avatar}><Ionicons name="person" size={32} color={theme.colors.primary} /></View>
        <Text style={s.nombre}>Mi Ahorrapp</Text>
        <Text style={s.sub}>Elegí tus bancos y mirá solo los beneficios que te sirven</Text>
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        {[
          { label: 'Beneficios', value: stats.beneficios, icon: 'pricetag' },
          { label: 'Bancos', value: stats.bancos, icon: 'business' },
          { label: 'Categorías', value: stats.categorias, icon: 'grid' },
        ].map(st => (
          <View key={st.label} style={s.statCard}>
            <Ionicons name={st.icon} size={20} color={theme.colors.primary} />
            <Text style={s.statNum}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* MIS BANCOS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Mis bancos</Text>
        <Text style={s.sectionSub}>Tocá los bancos donde tenés tarjeta</Text>
        <View style={s.bancosGrid}>
          {bancos.map(b => {
            const sel = seleccionados.includes(b.id);
            return (
              <TouchableOpacity key={b.id} style={[s.bancoChip, sel && { backgroundColor: (b.color || theme.colors.primary) + '14', borderColor: b.color || theme.colors.primary }]} onPress={() => toggle(b.id)}>
                <View style={[s.bancoDot, { backgroundColor: b.color || theme.colors.primary }]} />
                <Text style={[s.bancoNombre, sel && { color: theme.colors.text, fontWeight: '700' }]}>{b.nombre}</Text>
                {sel && <Ionicons name="checkmark-circle" size={15} color={b.color || theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {seleccionados.length > 0 && (
          <View style={s.selBox}>
            <Text style={s.selText}>✓ {seleccionados.length} banco{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* MENU */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Sobre Ahorrapp</Text>
        <View style={s.card}>
          <MenuItem icon="information-circle-outline" label="¿Cómo funciona?" />
          <MenuItem icon="shield-checkmark-outline" label="Privacidad" color={theme.colors.success} />
          <MenuItem icon="chatbubble-outline" label="Sugerencias" color={theme.colors.navy} />
          <MenuItem icon="star-outline" label="Versión" value="2.0.0" color={theme.colors.warning} last />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingTop: 70, paddingBottom: 22, paddingHorizontal: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.primaryLight, borderWidth: 2, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  nombre: { color: theme.colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
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
  selBox: { marginTop: 12, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.md, padding: 11, alignItems: 'center' },
  selText: { color: theme.colors.primaryDark, fontWeight: '700', fontSize: 13 },

  card: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  menuValue: { color: theme.colors.textSecondary, fontSize: 13 },
});
