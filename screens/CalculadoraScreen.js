import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { BancoLogo } from '../components/ui';
import { getMisTarjetas, tarjetaQueAplica, porcentajePersonalizado, calcularAhorro, marcaLabel } from '../lib/storage';

const gs = (n) => 'Gs. ' + Number(n || 0).toLocaleString('es-PY');
const soloNum = (s) => (s || '').replace(/[^0-9]/g, '');

export default function CalculadoraScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [comercio, setComercio] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [montoStr, setMontoStr] = useState('');
  const [misTarjetas, setMisTarjetas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [tarjetaSel, setTarjetaSel] = useState(0); // índice en misTarjetas; null = "ver todas"

  const monto = Number(soloNum(montoStr)) || 0;

  useFocusEffect(useCallback(() => {
    (async () => {
      const tj = await getMisTarjetas();
      setMisTarjetas(tj);
      setTarjetaSel(tj.length > 0 ? 0 : null);
      const { data } = await supabase.from('bancos').select('id,nombre,color').eq('activo', true);
      setBancos(data || []);
    })();
  }, []));

  const bancoNombre = (id) => bancos.find(b => b.id === id)?.nombre || 'Banco';
  const tarjetaLabel = (t) => `${bancoNombre(t.banco_id)} · ${t.tipo === 'debito' ? 'Débito' : 'Crédito'}${t.marca ? ' ' + marcaLabel(t.marca) : ''}`;
  const cardActiva = tarjetaSel != null ? misTarjetas[tarjetaSel] : null;
  const cardsParaMatch = cardActiva ? [cardActiva] : misTarjetas;

  // Autocompletado de comercios
  useEffect(() => {
    const t = q.trim();
    if (comercio || t.length < 2) { setSugerencias([]); return; }
    let cancel = false;
    const id = setTimeout(async () => {
      const { data } = await supabase.from('beneficios').select('comercio').eq('activo', true).ilike('comercio', `%${t}%`).limit(60);
      if (cancel) return;
      const uniq = [...new Set((data || []).map(d => d.comercio))].slice(0, 12);
      setSugerencias(uniq);
    }, 220);
    return () => { cancel = true; clearTimeout(id); };
  }, [q, comercio]);

  const elegirComercio = async (nombre) => {
    setComercio(nombre); setQ(nombre); setSugerencias([]); Keyboard.dismiss();
    setLoadingItems(true);
    const { data } = await supabase.from('beneficios')
      .select('*, bancos(nombre,color,logo_url)')
      .eq('comercio', nombre).eq('activo', true)
      .order('porcentaje', { ascending: false });
    setItems(data || []); setLoadingItems(false);
  };

  const reset = () => { setComercio(null); setQ(''); setItems([]); setSugerencias([]); };

  // % efectivo según la tarjeta activa (ej. nivel ueno)
  const pctEfectivo = (b) => {
    const pers = porcentajePersonalizado(b, cardsParaMatch);
    return pers ? pers.porcentaje : (b.porcentaje || 0);
  };

  const resultados = useMemo(() => {
    return items.map(b => {
      const pct = pctEfectivo(b);
      const calc = calcularAhorro(b, monto, pct);
      const aplica = !!tarjetaQueAplica(b, cardsParaMatch);
      return { b, ...calc, aplica };
    }).sort((a, b) => {
      if (a.aplica !== b.aplica) return a.aplica ? -1 : 1;
      return b.ahorro - a.ahorro;
    });
  }, [items, monto, misTarjetas, tarjetaSel, bancos]);

  // Mejor opción que SÍ podés usar con la tarjeta elegida
  const mejorAplica = useMemo(() => resultados.find(r => r.aplica && r.ahorro > 0) || null, [resultados]);
  const mejorGeneral = useMemo(() => resultados.find(r => r.ahorro > 0) || null, [resultados]);
  const mejor = mejorAplica || mejorGeneral;

  return (
    <View style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={theme.colors.navy} /></TouchableOpacity>
        <Text style={s.topTitle}>Calculadora de ahorro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Elegí dónde vas a comprar y cuánto pensás gastar. Te decimos con qué tarjeta te conviene pagar y cuánto recuperás.</Text>

        {/* PASO 1: COMERCIO */}
        <Text style={s.label}>1 · ¿Dónde vas a comprar?</Text>
        <View style={s.searchBox}>
          <Ionicons name="storefront-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar comercio (ej. Biggie, Shell…)"
            placeholderTextColor={theme.colors.textMuted}
            value={q}
            onChangeText={(t) => { setQ(t); if (comercio) setComercio(null); }}
            returnKeyType="search"
          />
          {q ? <TouchableOpacity onPress={reset}><Ionicons name="close-circle" size={18} color={theme.colors.textMuted} /></TouchableOpacity> : null}
        </View>
        {sugerencias.length > 0 && (
          <View style={s.sugBox}>
            {sugerencias.map(nombre => (
              <TouchableOpacity key={nombre} style={s.sugItem} onPress={() => elegirComercio(nombre)}>
                <Ionicons name="search" size={14} color={theme.colors.textMuted} />
                <Text style={s.sugTxt} numberOfLines={1}>{nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* PASO 2: MONTO */}
        <Text style={s.label}>2 · ¿Cuánto vas a gastar?</Text>
        <View style={s.searchBox}>
          <Text style={s.gsPrefix}>Gs.</Text>
          <TextInput
            style={s.searchInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            value={montoStr ? Number(soloNum(montoStr)).toLocaleString('es-PY') : ''}
            onChangeText={(t) => setMontoStr(soloNum(t))}
            keyboardType="number-pad"
          />
        </View>

        {/* PASO 3: TARJETA */}
        {misTarjetas.length > 0 && (
          <>
            <Text style={s.label}>3 · ¿Con qué tarjeta vas a pagar?</Text>
            <View style={s.tarjetasRow}>
              {misTarjetas.map((t, i) => (
                <TouchableOpacity key={i} style={[s.tjChip, tarjetaSel === i && s.tjChipOn]} onPress={() => setTarjetaSel(i)}>
                  <Ionicons name="card" size={13} color={tarjetaSel === i ? '#fff' : theme.colors.navy} />
                  <Text style={[s.tjChipTxt, tarjetaSel === i && s.tjChipTxtOn]} numberOfLines={1}>{tarjetaLabel(t)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.tjChip, tarjetaSel === null && s.tjChipOn]} onPress={() => setTarjetaSel(null)}>
                <Text style={[s.tjChipTxt, tarjetaSel === null && s.tjChipTxtOn]}>Comparar todas</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* RESULTADOS */}
        {comercio && (
          loadingItems ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
          ) : monto <= 0 ? (
            <View style={s.hintBox}><Ionicons name="calculator-outline" size={20} color={theme.colors.textMuted} /><Text style={s.hintTxt}>Ingresá el monto para ver tu ahorro.</Text></View>
          ) : (
            <>
              {cardActiva && !mejorAplica ? (
                <View style={s.noAplicaCard}>
                  <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
                  <Text style={s.noAplicaTxt}>Con tu {tarjetaLabel(cardActiva)} no hay descuento en {comercio}.{mejorGeneral ? ` La mejor acá es ${mejorGeneral.b.bancos?.nombre} (${mejorGeneral.pct}%) — mirá abajo.` : ''}</Text>
                </View>
              ) : mejor ? (
                <View style={s.bestCard}>
                  <Text style={s.bestKicker}>{cardActiva ? `✓ Pagando con tu ${tarjetaLabel(cardActiva)}` : (mejor.aplica ? '✓ Con tu tarjeta, lo mejor es' : 'Lo mejor para este comercio')}</Text>
                  <Text style={s.bestBanco}>{mejor.b.bancos?.nombre}</Text>
                  <Text style={s.bestAhorro}>Recuperás {gs(mejor.ahorro)}</Text>
                  <Text style={s.bestSub}>pagando {gs(monto)} · {mejor.pct}% {mejor.topeAplicado ? '(tope aplicado)' : ''}</Text>
                </View>
              ) : null}

              <Text style={s.label}>{cardActiva ? 'Comparar con otras tarjetas' : 'Todas las opciones'}</Text>
              <View style={{ gap: 10, paddingHorizontal: 16 }}>
                {resultados.map(({ b, ahorro, pct, aplica, motivo, topeAplicado, faltante }) => (
                  <View key={b.id} style={[s.resCard, aplica && s.resCardAplica]}>
                    <BancoLogo banco={b.bancos} comercio={b.comercio} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.resBanco} numberOfLines={1}>{b.bancos?.nombre}</Text>
                      <Text style={s.resMeta} numberOfLines={1}>
                        {pct}%{b.tope_monto > 0 ? ` · tope ${gs(b.tope_monto)}` : ''}{b.compra_minima > 0 ? ` · mín ${gs(b.compra_minima)}` : ''}
                      </Text>
                      {aplica ? <View style={s.tagAplica}><Ionicons name="checkmark-circle" size={11} color={theme.colors.success} /><Text style={s.tagAplicaTxt}>Tu tarjeta</Text></View> : null}
                    </View>
                    <View style={s.resRight}>
                      {motivo === 'compra_minima' ? (
                        <Text style={s.resNoAplica}>Falta {gs(faltante)}</Text>
                      ) : (
                        <>
                          <Text style={s.resAhorro}>{gs(ahorro)}</Text>
                          {topeAplicado ? <Text style={s.resTope}>tope</Text> : null}
                        </>
                      )}
                    </View>
                  </View>
                ))}
                {resultados.length === 0 ? <Text style={s.hintTxt}>No hay beneficios para este comercio.</Text> : null}
              </View>

              {misTarjetas.length === 0 && (
                <TouchableOpacity style={s.cfgHint} onPress={() => navigation.navigate('Main', { screen: 'Perfil' })}>
                  <Ionicons name="sparkles" size={14} color={theme.colors.primaryDark} />
                  <Text style={s.cfgHintTxt}>Cargá tus tarjetas en Perfil para resaltar las que podés usar →</Text>
                </TouchableOpacity>
              )}
            </>
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 6, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', color: theme.colors.text, fontSize: 18, fontWeight: '800' },

  intro: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '800', paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },

  searchBox: { marginHorizontal: 16, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 8 },
  gsPrefix: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '800' },

  sugBox: { marginHorizontal: 16, marginTop: 6, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  sugItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sugTxt: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },

  hintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 30, paddingHorizontal: 20 },
  hintTxt: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },

  tarjetasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  tjChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.full, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border, maxWidth: '100%' },
  tjChipOn: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  tjChipTxt: { color: theme.colors.navy, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  tjChipTxtOn: { color: '#fff' },

  noAplicaCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFF8EC', borderRadius: theme.radius.lg, borderWidth: 1, borderColor: '#F5E3C2', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  noAplicaTxt: { flex: 1, color: '#8A6D3B', fontSize: 13, fontWeight: '600', lineHeight: 19 },

  bestCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: theme.colors.navy, borderRadius: theme.radius.xl, padding: 20 },
  bestKicker: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  bestBanco: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 },
  bestAhorro: { color: theme.colors.primary, fontSize: 30, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  bestSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  resCard: { backgroundColor: theme.colors.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  resCardAplica: { borderColor: theme.colors.success, backgroundColor: '#F4FCF8' },
  resBanco: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  resMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  tagAplica: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E7F8F0', borderRadius: theme.radius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  tagAplicaTxt: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  resRight: { alignItems: 'flex-end', minWidth: 70 },
  resAhorro: { color: theme.colors.primaryDark, fontSize: 16, fontWeight: '900' },
  resTope: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' },
  resNoAplica: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },

  cfgHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginTop: 16 },
  cfgHintTxt: { flex: 1, color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
