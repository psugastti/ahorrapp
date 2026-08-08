import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import HeroHeader, { BarraCondensada } from '../components/HeroHeader';
import ComercioCard from '../components/ComercioCard';
import FiltrosSheet from '../components/FiltrosSheet';
import { getMisBancos, getMisTarjetas, getPrefs, tarjetaQueAplica } from '../lib/storage';
import { chequearAvisoDiario } from '../lib/notifications';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_CORTO = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };
const HOY = DIAS[new Date().getDay()];
const HOY_STR = new Date().toISOString().slice(0, 10);

// Cuántos comercios se pintan de entrada y de a cuánto crece al llegar al final.
// Antes había un tope duro de 120 y el resto del catálogo era inalcanzable.
const PAGINA = 40;

// Columnas mínimas. Los datos de banco y categoría NO se piden anidados: se traen
// las dos tablas enteras una sola vez (14 y 28 filas) y se cruzan en memoria.
// Con 2.600+ beneficios, repetir el objeto del banco en cada fila multiplicaba el payload.
const COLS = 'id,comercio,porcentaje,banco_id,categoria_id,dias,todos_los_dias,'
  + 'tipo_tarjeta,tipo_tarjeta_simple,marca_tarjeta,nivel_min,niveles,tipo_beneficio,vence,campania';

const CAMPANIAS = {
  dia_padre: { label: 'Día del Padre', emoji: '🎁' },
  dia_madre: { label: 'Día de la Madre', emoji: '💐' },
  navidad: { label: 'Navidad', emoji: '🎄' },
  black_friday: { label: 'Black Friday', emoji: '🛍️' },
  dia_nino: { label: 'Día del Niño', emoji: '🧸' },
  san_valentin: { label: 'San Valentín', emoji: '💝' },
  dia_amistad: { label: 'Día de la Amistad', emoji: '🤝' },
};

const SEGMENTOS = [
  { id: 'vos', label: 'Para vos' },
  { id: 'todos', label: 'Todos' },
  { id: 'vence', label: 'Vence pronto' },
];

function diasParaVencer(vence) {
  if (!vence) return null;
  const d = Math.ceil((new Date(vence + 'T00:00:00') - new Date(HOY_STR + 'T00:00:00')) / 86400000);
  return d < 0 ? null : d;
}

// A partir de qué scroll aparece la barra condensada.
const UMBRAL_BARRA = 150;

export default function HomeScreen({ navigation }) {
  const [beneficios, setBeneficios] = useState([]);
  const [bancosMap, setBancosMap] = useState(new Map());
  const [catsMap, setCatsMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [diasSel, setDiasSel] = useState([]);
  const [catsSel, setCatsSel] = useState([]);
  const [bancosSel, setBancosSel] = useState([]);
  const [tipoSel, setTipoSel] = useState(null);
  const [campaniaSel, setCampaniaSel] = useState(null);
  const [segmento, setSegmento] = useState('todos');

  const [misBancos, setMisBancos] = useState([]);
  const [misTarjetas, setMisTarjetas] = useState([]);
  const [soloMisBancos, setSoloMisBancos] = useState(false);
  const [soloPuedoUsar, setSoloPuedoUsar] = useState(false);
  const [aviso, setAviso] = useState(null);

  const [sheetAbierta, setSheetAbierta] = useState(false);
  const [limite, setLimite] = useState(PAGINA);

  // Barra condensada. Se maneja con un onScroll común y un booleano: sin
  // Animated.event, para no interferir con la virtualización de la lista.
  const [condensada, setCondensada] = useState(false);
  const alScrollear = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const debe = y > UMBRAL_BARRA;
    setCondensada(prev => (prev === debe ? prev : debe));
  }, []);

  const cargar = useCallback(async () => {
    const [{ data: bcos }, { data: cats }] = await Promise.all([
      supabase.from('bancos').select('id,nombre,color,logo_url').eq('activo', true).order('nombre'),
      supabase.from('categorias').select('id,nombre,emoji').eq('is_active', true).order('nombre'),
    ]);
    setBancosMap(new Map((bcos || []).map(b => [b.id, b])));
    setCatsMap(new Map((cats || []).map(c => [c.id, c])));

    // La paginación por rango necesita un orden estable. Ordenando solo por
    // porcentaje hay cientos de empates, Postgres puede devolverlos en distinto
    // orden en cada página, y así se repetían filas y se perdían comercios
    // (traía 2.653 filas pero con duplicados: faltaban 47 comercios).
    let all = [], from = 0; const size = 1000;
    while (true) {
      const { data } = await supabase.from('beneficios').select(COLS)
        .eq('activo', true).or(`vence.is.null,vence.gte.${HOY_STR}`)
        .order('porcentaje', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + size - 1);
      all = all.concat(data || []);
      if (!data || data.length < size) break;
      from += size;
    }
    setBeneficios(all);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useFocusEffect(useCallback(() => {
    // La cabecera de Inicio es navy: los íconos de la barra de estado tienen que ir claros.
    // Las demás pestañas son de fondo claro, así que al salir se vuelve a oscuro.
    setStatusBarStyle('light');
    (async () => {
      setMisBancos(await getMisBancos());
      setMisTarjetas(await getMisTarjetas());
      const p = await getPrefs();
      setSoloMisBancos(!!p.soloMisBancos);
      try { const r = await chequearAvisoDiario(); if (r.mostrar) setAviso(r); } catch {}
    })();
    return () => setStatusBarStyle('dark');
  }, []));

  const toggleEn = (setter) => (valor) =>
    setter(prev => (prev.includes(valor) ? prev.filter(x => x !== valor) : [...prev, valor]));
  const toggleDia = toggleEn(setDiasSel);
  const toggleBanco = toggleEn(setBancosSel);
  const toggleCat = toggleEn(setCatsSel);

  const limpiarFiltros = () => {
    setBusqueda(''); setDiasSel([]); setCatsSel([]); setBancosSel([]);
    setTipoSel(null); setCampaniaSel(null); setSoloPuedoUsar(false);
  };

  // Solo los bancos y categorías que realmente tienen beneficios visibles.
  // BNF y FIC están activos en la base pero con cero beneficios: antes aparecían
  // en el filtro y al tocarlos dejaban la pantalla vacía.
  const bancosConDatos = useMemo(() => {
    const ids = new Set(beneficios.map(b => b.banco_id));
    return [...bancosMap.values()].filter(b => ids.has(b.id));
  }, [beneficios, bancosMap]);

  const catsConDatos = useMemo(() => {
    const ids = new Set(beneficios.map(b => b.categoria_id));
    return [...catsMap.values()].filter(c => ids.has(c.id));
  }, [beneficios, catsMap]);

  const campaniasActivas = useMemo(
    () => [...new Set(beneficios.filter(b => b.campania).map(b => b.campania))],
    [beneficios]
  );

  const vencenEstaSemana = useMemo(
    () => beneficios.filter(b => { const d = diasParaVencer(b.vence); return d !== null && d <= 7; }).length,
    [beneficios]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return beneficios.filter(b => {
      if (q) {
        const banco = bancosMap.get(b.banco_id)?.nombre?.toLowerCase() || '';
        const cat = catsMap.get(b.categoria_id)?.nombre?.toLowerCase() || '';
        if (!b.comercio?.toLowerCase().includes(q) && !banco.includes(q) && !cat.includes(q)) return false;
      }
      if (diasSel.length > 0 && !b.todos_los_dias) {
        const coincide = diasSel.some(d => {
          if (d === 'hoy') return (b.dias || []).includes(HOY);
          if (d === 'finde') return (b.dias || []).some(x => x === 'sabado' || x === 'domingo');
          return (b.dias || []).includes(d);
        });
        if (!coincide) return false;
      }
      if (catsSel.length > 0 && !catsSel.includes(catsMap.get(b.categoria_id)?.nombre)) return false;
      if (bancosSel.length > 0 && !bancosSel.includes(b.banco_id)) return false;
      if (campaniaSel && b.campania !== campaniaSel) return false;
      if (tipoSel) {
        const tipo = b.tipo_tarjeta_simple || b.tipo_tarjeta || 'ambas';
        if (tipoSel === 'credito' && !['credito', 'ambas', 'premium'].includes(tipo)) return false;
        if (tipoSel === 'debito' && !['debito', 'ambas'].includes(tipo)) return false;
        if (tipoSel === 'premium' && tipo !== 'premium') return false;
      }
      if (soloMisBancos && misBancos.length > 0 && !misBancos.includes(b.banco_id)) return false;
      if (soloPuedoUsar && !tarjetaQueAplica(b, misTarjetas)) return false;
      return true;
    });
  }, [beneficios, bancosMap, catsMap, busqueda, diasSel, catsSel, bancosSel,
      campaniaSel, tipoSel, soloMisBancos, soloPuedoUsar, misBancos, misTarjetas]);

  // Un beneficio por fila se agrupa en un comercio: la lista muestra comercios, no beneficios.
  const comercios = useMemo(() => {
    const map = new Map();
    for (const b of filtrados) {
      let g = map.get(b.comercio);
      if (!g) {
        g = {
          comercio: b.comercio, bancosIds: new Set(), maxPct: 0,
          categoria: catsMap.get(b.categoria_id)?.nombre || null,
          colorBanco: null, bancoNombre: '', aplica: false, diasVence: null,
          diasTexto: null, otrosBancos: 0,
        };
        map.set(b.comercio, g);
      }
      if (b.banco_id) g.bancosIds.add(b.banco_id);
      if ((b.porcentaje || 0) > g.maxPct) {
        g.maxPct = b.porcentaje || 0;
        const bk = bancosMap.get(b.banco_id);
        g.colorBanco = bk?.color || null;
        g.bancoNombre = bk?.nombre || '';
        g.diasTexto = b.todos_los_dias
          ? 'Todos los días'
          : (b.dias?.length ? b.dias.map(d => DIAS_CORTO[d] || d).join(' · ') : null);
      }
      if (!g.aplica && tarjetaQueAplica(b, misTarjetas)) g.aplica = true;
      const dv = diasParaVencer(b.vence);
      if (dv !== null && (g.diasVence === null || dv < g.diasVence)) g.diasVence = dv;
    }

    let lista = [...map.values()];
    for (const g of lista) {
      g.otrosBancos = g.bancosIds.size - 1;
      if (!g.bancoNombre) g.bancoNombre = bancosMap.get([...g.bancosIds][0])?.nombre || '';
    }

    if (segmento === 'vos') lista = lista.filter(g => g.aplica);
    if (segmento === 'vence') lista = lista.filter(g => g.diasVence !== null);

    if (segmento === 'vence') {
      lista.sort((a, b) => a.diasVence - b.diasVence || b.maxPct - a.maxPct);
    } else {
      lista.sort((a, b) => b.maxPct - a.maxPct);
    }
    return lista;
  }, [filtrados, bancosMap, catsMap, misTarjetas, segmento]);

  // Cada vez que cambia lo que se ve, se vuelve al principio de la paginación.
  useEffect(() => { setLimite(PAGINA); }, [comercios]);

  const visibles = useMemo(() => comercios.slice(0, limite), [comercios, limite]);
  const hayMas = limite < comercios.length;
  const verMas = useCallback(() => setLimite(l => l + PAGINA), []);

  const filtrosActivos =
    diasSel.length + catsSel.length + bancosSel.length
    + (tipoSel ? 1 : 0) + (campaniaSel ? 1 : 0)
    + (soloMisBancos ? 1 : 0) + (soloPuedoUsar ? 1 : 0);
  const hayFiltro = filtrosActivos > 0 || busqueda.trim().length > 0;

  const irAComercio = useCallback((comercio) => navigation.navigate('Comercio', { comercio }), [navigation]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={s.loadTxt}>Cargando beneficios…</Text>
      </View>
    );
  }

  const cabecera = (
    <View>
      <HeroHeader
        totalBeneficios={beneficios.length}
        vencenPronto={vencenEstaSemana}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        diasSel={diasSel}
        toggleDia={toggleDia}
        limpiarDias={() => setDiasSel([])}
        onPerfil={() => navigation.navigate('Perfil')}
      />

      <View style={s.bloque}>
      {aviso && (
        <TouchableOpacity
          style={s.aviso}
          activeOpacity={0.85}
          onPress={() => { setDiasSel(['hoy']); setAviso(null); }}
        >
          <View style={s.avisoIcon}><Ionicons name="notifications" size={17} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.avisoTitulo}>Descuentos de hoy</Text>
            <Text style={s.avisoCuerpo} numberOfLines={1}>{aviso.cuerpo}</Text>
          </View>
          <TouchableOpacity hitSlop={10} onPress={() => setAviso(null)}>
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <View style={s.segmento}>
        {SEGMENTOS.map(seg => {
          const activo = segmento === seg.id;
          return (
            <TouchableOpacity key={seg.id} style={[s.seg, activo && s.segOn]} onPress={() => setSegmento(seg.id)}>
              <Text style={[s.segTxt, activo && s.segTxtOn]}>{seg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>

      {campaniasActivas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
          {campaniasActivas.map(c => {
            const info = CAMPANIAS[c] || { label: c, emoji: '✨' };
            const activo = campaniaSel === c;
            return (
              <TouchableOpacity
                key={c}
                style={[s.campania, activo && s.campaniaOn]}
                onPress={() => setCampaniaSel(activo ? null : c)}
              >
                <Text style={s.campaniaEmoji}>{info.emoji}</Text>
                <Text style={[s.campaniaTxt, activo && s.campaniaTxtOn]}>{info.label}</Text>
                {activo && <Ionicons name="close-circle" size={14} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
        <TouchableOpacity style={[s.chip, catsSel.length === 0 && s.chipOn]} onPress={() => setCatsSel([])}>
          <Text style={[s.chipTxt, catsSel.length === 0 && s.chipTxtOn]}>Todas</Text>
        </TouchableOpacity>
        {catsConDatos.map(c => {
          const activo = catsSel.includes(c.nombre);
          return (
            <TouchableOpacity key={c.id} style={[s.chip, activo && s.chipOn]} onPress={() => toggleCat(c.nombre)}>
              <Text style={[s.chipTxt, activo && s.chipTxtOn]}>{c.emoji} {c.nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[s.bloque, s.secline]}>
        <Text style={s.seclineTitulo}>
          {segmento === 'vos' ? 'Con tus tarjetas' : segmento === 'vence' ? 'Vencen pronto' : 'Todos los comercios'}
        </Text>
        <Text style={s.seclineCount}>
          {comercios.length.toLocaleString('es-PY')} comercio{comercios.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );

  const vacio = (
    <View style={s.vacio}>
      <Ionicons
        name={segmento === 'vos' ? 'card-outline' : 'search-outline'}
        size={42}
        color={theme.colors.textMuted}
      />
      {segmento === 'vos' && misTarjetas.length === 0 ? (
        <>
          <Text style={s.vacioTxt}>Todavía no cargaste tus tarjetas</Text>
          <Text style={s.vacioSub}>Cargalas en Perfil y acá vas a ver solo lo que podés usar de verdad.</Text>
          <TouchableOpacity style={s.vacioBtn} onPress={() => navigation.navigate('Perfil')}>
            <Text style={s.vacioBtnTxt}>Ir a Perfil</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.vacioTxt}>No hay comercios con estos filtros</Text>
          {hayFiltro && (
            <TouchableOpacity style={s.vacioBtn} onPress={limpiarFiltros}>
              <Text style={s.vacioBtnTxt}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      {/* ScrollView y no FlatList: la virtualización de react-native-web se queda
          clavada en el primer lote y no crece por más que se scrollee. Como la
          lista está acotada por `limite`, se pintan solo los de la página actual. */}
      <ScrollView
        contentContainerStyle={s.lista}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={alScrollear}
        scrollEventThrottle={32}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); cargar(); }}
            tintColor={theme.colors.primary}
            progressViewOffset={60}
          />
        }
      >
        {cabecera}

        {comercios.length === 0 ? vacio : (
          <View style={s.tarjetas}>
            {visibles.map(g => (
              <ComercioCard key={g.comercio} grupo={g} onPress={() => irAComercio(g.comercio)} />
            ))}
          </View>
        )}

        {hayMas ? (
          <View style={s.footer}>
            <TouchableOpacity style={s.masBtn} activeOpacity={0.85} onPress={verMas}>
              <Text style={s.masBtnTxt}>
                Mostrar más ({(comercios.length - limite).toLocaleString('es-PY')} restantes)
              </Text>
            </TouchableOpacity>
          </View>
        ) : comercios.length > 0 ? (
          <Text style={s.footerFin}>
            Eso es todo · {comercios.length.toLocaleString('es-PY')} comercios
          </Text>
        ) : null}
      </ScrollView>

      <BarraCondensada
        activa={condensada}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onFiltros={() => setSheetAbierta(true)}
        filtrosActivos={filtrosActivos}
      />

      <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => setSheetAbierta(true)}>
        <Ionicons name="options-outline" size={18} color="#fff" />
        <Text style={s.fabTxt}>Filtros</Text>
        {filtrosActivos > 0 && (
          <View style={s.fabBadge}><Text style={s.fabBadgeTxt}>{filtrosActivos}</Text></View>
        )}
      </TouchableOpacity>

      <FiltrosSheet
        visible={sheetAbierta}
        onClose={() => setSheetAbierta(false)}
        resultados={comercios.length}
        diasSel={diasSel} toggleDia={toggleDia}
        bancos={bancosConDatos} bancosSel={bancosSel} toggleBanco={toggleBanco}
        categorias={catsConDatos} catsSel={catsSel} toggleCat={toggleCat}
        tipoSel={tipoSel} setTipoSel={setTipoSel}
        misBancos={misBancos} soloMisBancos={soloMisBancos} setSoloMisBancos={setSoloMisBancos}
        misTarjetas={misTarjetas} soloPuedoUsar={soloPuedoUsar} setSoloPuedoUsar={setSoloPuedoUsar}
        onLimpiar={limpiarFiltros} hayFiltro={hayFiltro}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt: { color: theme.colors.textMuted, fontSize: 13 },

  lista: { paddingBottom: 96 },
  // El hero va a sangre; todo lo demás lleva su propio margen lateral.
  bloque: { paddingHorizontal: 22 },
  tarjetas: { paddingHorizontal: 22, gap: 9 },

  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 14, padding: 12,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.primary + '40',
  },
  avisoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avisoTitulo: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  avisoCuerpo: { color: theme.colors.text, fontSize: 13, marginTop: 1 },

  segmento: { flexDirection: 'row', gap: 6, marginTop: 18 },
  seg: {
    flex: 1, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bgCardAlt,
  },
  segOn: { backgroundColor: theme.colors.navy },
  segTxt: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  segTxtOn: { color: '#fff' },

  chipsScroll: { flexGrow: 0, marginTop: 14 },
  chipsContent: { paddingHorizontal: 22, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 36, paddingHorizontal: 13, borderRadius: 12,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  chipTxt: { color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '600' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },

  campania: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 36, paddingHorizontal: 13, borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: theme.colors.primary + '55',
  },
  campaniaOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  campaniaEmoji: { fontSize: 15 },
  campaniaTxt: { color: theme.colors.primaryDark, fontSize: 12.5, fontWeight: '700' },
  campaniaTxtOn: { color: '#fff' },

  secline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 11 },
  seclineTitulo: { color: theme.colors.text, fontSize: 17.5, fontWeight: '800', letterSpacing: -0.3 },
  seclineCount: { color: theme.colors.primary, fontSize: 12.5, fontWeight: '700' },

  footer: { paddingVertical: 22, alignItems: 'center', paddingHorizontal: 22 },
  masBtn: {
    backgroundColor: theme.colors.navy, borderRadius: theme.radius.full,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  masBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footerFin: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 12.5, paddingVertical: 22 },

  vacio: { alignItems: 'center', paddingVertical: 44, gap: 10 },
  vacioTxt: { color: theme.colors.text, fontSize: 15.5, fontWeight: '700', marginTop: 6 },
  vacioSub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  vacioBtn: {
    marginTop: 6, backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.md, paddingHorizontal: 20, paddingVertical: 11,
  },
  vacioBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  fab: {
    position: 'absolute', alignSelf: 'center', bottom: 18,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, paddingHorizontal: 20, borderRadius: theme.radius.full,
    backgroundColor: theme.colors.navy,
    shadowColor: theme.colors.navy, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 18, elevation: 6,
  },
  fabTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  fabBadge: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center',
  },
  fabBadgeTxt: { color: theme.colors.mintInk, fontSize: 11.5, fontWeight: '800' },
});
