import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PREMIOS = [
  { id: 1, nombre: '$500 de descuento', puntos: 500, tipo: 'descuento' },
  { id: 2, nombre: '$1.000 de descuento', puntos: 1000, tipo: 'descuento' },
  { id: 3, nombre: 'Envío gratis', puntos: 800, tipo: 'envio' },
  { id: 4, nombre: 'Sorteo Gift Card $10.000', puntos: 2000, tipo: 'sorteo' },
];

export default function PremiosScreen() {
  const puntos = 0;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={s.header}>
        <Text style={s.title}>Puntos y premios</Text>
      </View>

      {/* BALANCE PUNTOS */}
      <View style={s.balanceCard}>
        <Ionicons name="star" size={28} color="#00C9B1" />
        <Text style={s.puntosAmount}>{puntos.toLocaleString()}</Text>
        <Text style={s.puntosLabel}>Tus puntos</Text>
        <Text style={s.puntosEquiv}>Equivalen a ${puntos.toLocaleString()}</Text>
      </View>

      {/* TABS */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, s.tabActive]}>
          <Text style={[s.tabText, s.tabTextActive]}>Catálogo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab}>
          <Text style={s.tabText}>Mis premios</Text>
        </TouchableOpacity>
      </View>

      {/* CATÁLOGO */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Canjeá tus puntos</Text>
        <TouchableOpacity style={s.verTodosBtn}>
          <Text style={s.verTodosText}>Ver todos</Text>
        </TouchableOpacity>
        <View style={s.premiosGrid}>
          {PREMIOS.map(p => (
            <TouchableOpacity key={p.id} style={s.premioCard}>
              <View style={s.premioIcon}>
                <Ionicons
                  name={p.tipo === 'descuento' ? 'pricetag' : p.tipo === 'envio' ? 'cube' : 'gift'}
                  size={24}
                  color="#00C9B1"
                />
              </View>
              <Text style={s.premioNombre}>{p.nombre}</Text>
              <View style={s.premioBtn}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={s.premioPuntos}>{p.puntos} pts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CÓMO SUMAR */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>¿Cómo sumar puntos?</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoDot} />
            <Text style={s.infoText}>Subí tu ticket de compra y ganás puntos automáticamente</Text>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoDot} />
            <Text style={s.infoText}>Activá beneficios y usalos en las tiendas adheridas</Text>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoDot} />
            <Text style={s.infoText}>Invitá amigos y ganás puntos por cada registro</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07111F' },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },

  balanceCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#0D1F35', borderRadius: 16,
    padding: 24, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  puntosAmount: { color: '#fff', fontSize: 40, fontWeight: '800' },
  puntosLabel: { color: '#4A6FA5', fontSize: 14 },
  puntosEquiv: { color: '#00C9B1', fontSize: 13, fontWeight: '600' },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#0D1F35', borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#07111F' },
  tabText: { color: '#4A6FA5', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  verTodosBtn: { position: 'absolute', top: 0, right: 20 },
  verTodosText: { color: '#00C9B1', fontSize: 13, fontWeight: '600' },

  premiosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  premioCard: {
    width: '47%', backgroundColor: '#0D1F35', borderRadius: 14,
    padding: 16, alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  premioIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,201,177,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  premioNombre: { color: '#fff', fontSize: 14, fontWeight: '600' },
  premioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00C9B1', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  premioPuntos: { color: '#fff', fontSize: 12, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#0D1F35', borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C9B1', marginTop: 5 },
  infoText: { color: '#4A6FA5', fontSize: 13, flex: 1, lineHeight: 18 },
});
