import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'

const DIAS_ES = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
}

export default function BeneficiosScreen({ route }) {
  const { categoria } = route.params
  const [beneficios, setBeneficios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBeneficios() }, [])

  async function fetchBeneficios() {
    const { data, error } = await supabase
      .from('beneficios')
      .select('*, bancos(nombre, color, slug)')
      .eq('categoria_id', categoria.id)
      .eq('activo', true)
      .order('porcentaje', { ascending: false })
    if (!error) setBeneficios(data)
    setLoading(false)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icono}>{categoria.icono}</Text>
        <Text style={styles.titulo}>{categoria.nombre}</Text>
        <Text style={styles.subtitulo}>{beneficios.length} beneficios disponibles</Text>
      </View>
      <FlatList
        data={beneficios}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => <BeneficioCard beneficio={item} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No hay beneficios para esta categoría</Text></View>}
      />
    </SafeAreaView>
  )
}

function BeneficioCard({ beneficio }) {
  const banco = beneficio.bancos
  const color = banco?.color || '#6C63FF'
  const diasTexto = beneficio.todos_los_dias
    ? 'Todos los días'
    : (beneficio.dias || []).map(d => DIAS_ES[d] || d).join(' · ')
  const topeTexto = beneficio.tope_monto
    ? 'Tope Gs. ' + beneficio.tope_monto.toLocaleString('es-PY')
    : null

  return (
    <View style={styles.card}>
      <View style={[styles.bancoTag, { backgroundColor: color + '18' }]}>
        <View style={[styles.bancoDot, { backgroundColor: color }]} />
        <Text style={[styles.bancoNombre, { color }]}>{banco?.nombre}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.porcentajeWrap}>
          <Text style={[styles.porcentaje, { color }]}>{beneficio.porcentaje}%</Text>
          <Text style={styles.offLabel}>OFF</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.comercio}>{beneficio.comercio}</Text>
          {beneficio.etiqueta ? <Text style={styles.etiqueta}>{beneficio.etiqueta}</Text> : null}
          {diasTexto ? <View style={styles.diasWrap}><Text style={styles.diasTexto}>{diasTexto}</Text></View> : null}
          {topeTexto ? <Text style={styles.tope}>{topeTexto}</Text> : null}
          {beneficio.vence ? <Text style={styles.vence}>Vence: {beneficio.vence}</Text> : null}
        </View>
      </View>
      {beneficio.descripcion ? <Text style={styles.descripcion}>{beneficio.descripcion}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, alignItems: 'center' },
  icono: { fontSize: 40, marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  subtitulo: { fontSize: 14, color: '#888', marginTop: 4 },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  bancoTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  bancoDot: { width: 8, height: 8, borderRadius: 4 },
  bancoNombre: { fontSize: 12, fontWeight: '600' },
  cardBody: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 14 },
  porcentajeWrap: { alignItems: 'center', minWidth: 56 },
  porcentaje: { fontSize: 34, fontWeight: '800', lineHeight: 38 },
  offLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 1 },
  info: { flex: 1 },
  comercio: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  etiqueta: { fontSize: 13, color: '#555', marginBottom: 4 },
  diasWrap: { alignSelf: 'flex-start', backgroundColor: '#F0EEFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  diasTexto: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
  tope: { fontSize: 12, color: '#888', marginTop: 2 },
  vence: { fontSize: 11, color: '#bbb', marginTop: 2 },
  descripcion: { fontSize: 12, color: '#777', paddingHorizontal: 14, paddingBottom: 12, lineHeight: 18 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#aaa', fontSize: 15 },
})
