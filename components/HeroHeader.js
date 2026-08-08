import { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

// En web el input trae un contorno de foco que rompe el diseño; en nativo no existe.
const sinContorno = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

const DIAS_RAPIDOS = [
  { id: 'hoy', label: 'Hoy' }, { id: 'finde', label: 'Finde' },
  { id: 'lunes', label: 'Lun' }, { id: 'martes', label: 'Mar' }, { id: 'miercoles', label: 'Mié' },
  { id: 'jueves', label: 'Jue' }, { id: 'viernes', label: 'Vie' },
  { id: 'sabado', label: 'Sáb' }, { id: 'domingo', label: 'Dom' },
];

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Cabecera navy del Inicio. Se lleva adentro los controles para que la zona clara
// de abajo quede solo con comercios.
export default function HeroHeader({
  totalBeneficios, vencenPronto,
  busqueda, setBusqueda,
  diasSel, toggleDia, limpiarDias,
  onPerfil,
}) {
  return (
    <View style={s.hero}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.saludo}>{saludo()} 👋</Text>
          {/* Variante clara del logo: el original es navy y sobre esta cabecera no se ve. */}
          <Image source={require('../assets/logo-navy.png')} style={s.logo} resizeMode="contain" />
        </View>
        <TouchableOpacity style={s.avatar} onPress={onPerfil} accessibilityLabel="Ir a Perfil">
          <Ionicons name="person" size={19} color={theme.colors.mint} />
        </TouchableOpacity>
      </View>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statNum}>{totalBeneficios.toLocaleString('es-PY')}</Text>
          <Text style={s.statLbl}>beneficios activos</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statNum, vencenPronto > 0 && { color: theme.colors.alerta }]}>{vencenPronto}</Text>
          <Text style={s.statLbl}>vencen esta semana</Text>
        </View>
      </View>

      <View style={s.search}>
        <Ionicons name="search-outline" size={18} color={theme.colors.onNavySoft} />
        <TextInput
          style={[s.searchInput, sinContorno]}
          placeholder="Buscar comercio o banco"
          placeholderTextColor={theme.colors.onNavySoft}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
        {busqueda ? (
          <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.colors.onNavySoft} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.diasScroll}
        contentContainerStyle={s.diasContent}
      >
        <TouchableOpacity
          style={[s.dia, diasSel.length === 0 && s.diaOn]}
          onPress={limpiarDias}
        >
          <Text style={[s.diaTxt, diasSel.length === 0 && s.diaTxtOn]}>Todos</Text>
        </TouchableOpacity>
        {DIAS_RAPIDOS.map(d => {
          const activo = diasSel.includes(d.id);
          return (
            <TouchableOpacity key={d.id} style={[s.dia, activo && s.diaOn]} onPress={() => toggleDia(d.id)}>
              <Text style={[s.diaTxt, activo && s.diaTxtOn]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Barra condensada que aparece al scrollear.
// La animación vive acá adentro, con su propio Animated.Value: si se maneja desde
// la lista con Animated.event, el wrapper animado se queda con los eventos de
// scroll y la FlatList deja de virtualizar (nunca renderiza más allá del primer lote).
export function BarraCondensada({ activa, busqueda, setBusqueda, onFiltros, filtrosActivos }) {
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, {
      toValue: activa ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [activa, opacidad]);

  return (
    <Animated.View style={[s.barra, { opacity: opacidad }]} pointerEvents={activa ? 'auto' : 'none'}>
      <View style={s.barraRow}>
        <View style={s.barraSearch}>
          <Ionicons name="search-outline" size={17} color={theme.colors.onNavySoft} />
          <TextInput
            style={[s.barraInput, sinContorno]}
            placeholder="Buscar comercio o banco"
            placeholderTextColor={theme.colors.onNavySoft}
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={s.barraPill} onPress={onFiltros} accessibilityLabel="Abrir filtros">
          <Ionicons name="options-outline" size={17} color={theme.colors.mintInk} />
          {filtrosActivos > 0 && <Text style={s.barraPillNum}>{filtrosActivos}</Text>}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.heroBottom,
    borderBottomLeftRadius: theme.radius.hero,
    borderBottomRightRadius: theme.radius.hero,
    paddingTop: 58,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22 },
  saludo: { color: theme.colors.onNavySoft, fontSize: 12.5, fontWeight: '600' },
  logo: { width: 158, height: 38, marginLeft: -4, marginTop: 1 },
  avatar: {
    width: 42, height: 42, borderRadius: 15,
    backgroundColor: theme.colors.onNavyFill,
    borderWidth: 1, borderColor: theme.colors.onNavyBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 16 },
  stat: {
    flex: 1, backgroundColor: theme.colors.onNavyFill,
    borderWidth: 1, borderColor: theme.colors.onNavyBorder,
    borderRadius: theme.radius.md, paddingHorizontal: 13, paddingVertical: 11,
  },
  statNum: { color: theme.colors.onNavy, fontSize: 22, fontWeight: '800', letterSpacing: -0.7 },
  statLbl: { color: theme.colors.onNavySoft, fontSize: 11, fontWeight: '600', marginTop: 3 },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 22, marginTop: 16, height: 48,
    borderRadius: theme.radius.md, paddingHorizontal: 15,
    backgroundColor: theme.colors.onNavyFill,
    borderWidth: 1, borderColor: theme.colors.onNavyBorder,
  },
  searchInput: { flex: 1, color: theme.colors.onNavy, fontSize: 14.5 },

  diasScroll: { flexGrow: 0, marginTop: 14 },
  diasContent: { paddingHorizontal: 22, gap: 7 },
  dia: {
    height: 34, paddingHorizontal: 14, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.onNavyFill,
    borderWidth: 1, borderColor: theme.colors.onNavyBorder,
  },
  diaOn: { backgroundColor: theme.colors.mint, borderColor: theme.colors.mint },
  diaTxt: { color: '#C3D5EC', fontSize: 12.5, fontWeight: '600' },
  diaTxtOn: { color: theme.colors.mintInk, fontWeight: '800' },

  barra: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    backgroundColor: theme.colors.heroBottom,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    paddingTop: 52, paddingBottom: 12,
  },
  barraRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  barraSearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9,
    height: 40, borderRadius: 13, paddingHorizontal: 13,
    backgroundColor: theme.colors.onNavyFill,
  },
  barraInput: { flex: 1, color: theme.colors.onNavy, fontSize: 13.5 },
  barraPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: 13,
    backgroundColor: theme.colors.mint,
  },
  barraPillNum: { color: theme.colors.mintInk, fontSize: 13, fontWeight: '800' },
});
