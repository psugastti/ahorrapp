import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

export default function OnboardingScreen({ navigation }) {
  const [bancos, setBancos] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBancos()
  }, [])

  async function fetchBancos() {
    const { data } = await supabase.from('bancos').select('*').eq('activo', true).order('nombre')
    if (data) setBancos(data)
    setLoading(false)
  }

  function toggle(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function guardar() {
    await AsyncStorage.setItem('bancosSeleccionados', JSON.stringify(seleccionados))
    await AsyncStorage.setItem('onboardingDone', 'true')
    navigation.replace('Main')
  }

  async function omitir() {
    await AsyncStorage.setItem('onboardingDone', 'true')
    navigation.replace('Main')
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View>

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.emoji}>💳</Text>
        <Text style={s.titulo}>¿Qué tarjetas tenés?</Text>
        <Text style={s.subtitulo}>Seleccioná tus bancos para ver solo los beneficios que te aplican</Text>
      </View>

      <FlatList
        data={bancos}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => {
          const sel = seleccionados.includes(item.id)
          const color = item.color || '#6C63FF'
          return (
            <TouchableOpacity
              style={[s.card, sel && { borderColor: color, borderWidth: 2, backgroundColor: color + '12' }]}
              onPress={() => toggle(item.id)}
            >
              {sel && <View style={[s.check, { backgroundColor: color }]}><Text style={s.checkTxt}>✓</Text></View>}
              <View style={[s.dot, { backgroundColor: color }]} />
              <Text style={[s.nombre, sel && { color }]}>{item.nombre}</Text>
              {item.tipos_tarjeta && (
                <Text style={s.tipos}>{item.tipos_tarjeta.join(' · ')}</Text>
              )}
            </TouchableOpacity>
          )
        }}
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.btnPrimario} onPress={guardar} disabled={seleccionados.length === 0}>
          <Text style={s.btnPrimarioTxt}>
            {seleccionados.length === 0 ? 'Seleccioná al menos uno' : `Ver beneficios (${seleccionados.length} banco${seleccionados.length > 1 ? 's' : ''})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOmitir} onPress={omitir}>
          <Text style={s.btnOmitirTxt}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 20, paddingHorizontal: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  grid: { paddingHorizontal: 12, paddingBottom: 12 },
  card: {
    flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  check: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  checkTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  nombre: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
  tipos: { fontSize: 10, color: '#aaa', marginTop: 3, textAlign: 'center' },
  footer: { padding: 20, gap: 10 },
  btnPrimario: {
    backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', opacity: 1,
  },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOmitir: { alignItems: 'center', paddingVertical: 10 },
  btnOmitirTxt: { color: '#aaa', fontSize: 14 },
})
