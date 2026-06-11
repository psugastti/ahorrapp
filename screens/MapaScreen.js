import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'

const GOOGLE_API_KEY = 'AIzaSyAT4wrK_3_UMgsotz4xwOPLcQCamEeR5RA'

export default function MapaScreen() {
  const [beneficios, setBeneficios] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    fetchBeneficios()
  }, [])

  async function fetchBeneficios() {
    const { data } = await supabase
      .from('beneficios')
      .select('*, bancos(nombre, color), categorias(nombre, icono)')
      .eq('activo', true)
      .not('lat', 'is', null)
    if (data) setBeneficios(data)
    setLoading(false)
  }

  const center = { lat: -25.2867, lng: -57.6473 }

  const markers = beneficios.map(b => ({
    position: { lat: b.lat, lng: b.lng },
    title: b.comercio,
    color: b.bancos?.color || '#6C63FF',
    beneficio: b,
  }))

  const markersJson = JSON.stringify(markers)

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; }
    #map { width: 100vw; height: 100vh; }
    .info-box {
      position: fixed; bottom: 20px; left: 10px; right: 10px;
      background: white; border-radius: 16px; padding: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: none;
      z-index: 1000;
    }
    .info-box.visible { display: block; }
    .info-banco { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .info-comercio { font-size: 16px; font-weight: 700; color: #1A1A2E; margin-bottom: 4px; }
    .info-pct { font-size: 28px; font-weight: 800; }
    .info-dias { background: #F0EEFF; color: #6C63FF; border-radius: 6px; padding: 3px 8px; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 4px; }
    .info-desc { font-size: 12px; color: #888; margin-top: 6px; }
    .close-btn { position: absolute; top: 12px; right: 12px; font-size: 18px; cursor: pointer; color: #aaa; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="info-box" id="infoBox">
    <span class="close-btn" onclick="closeInfo()">✕</span>
    <div class="info-banco" id="infoBanco"></div>
    <div class="info-comercio" id="infoCom"></div>
    <div class="info-pct" id="infoPct"></div>
    <div class="info-dias" id="infoDias"></div>
    <div class="info-desc" id="infoDesc"></div>
  </div>
  <script>
    const markers = ${markersJson};
    const DIAS_ES = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' };

    function closeInfo() {
      document.getElementById('infoBox').classList.remove('visible');
    }

    function showInfo(b) {
      const banco = b.bancos || {};
      const dias = b.todos_los_dias ? 'Todos los días' : (b.dias || []).map(d => DIAS_ES[d] || d).join(' · ');
      document.getElementById('infoBanco').textContent = banco.nombre || '';
      document.getElementById('infoBanco').style.color = banco.color || '#6C63FF';
      document.getElementById('infoCom').textContent = b.comercio;
      document.getElementById('infoPct').textContent = b.porcentaje + '% OFF';
      document.getElementById('infoPct').style.color = banco.color || '#6C63FF';
      document.getElementById('infoDias').textContent = dias;
      document.getElementById('infoDesc').textContent = b.descripcion || '';
      document.getElementById('infoBox').classList.add('visible');
    }

    function initMap() {
      const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: -25.2867, lng: -57.6473 },
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      markers.forEach(m => {
        const color = (m.color || '#6C63FF').replace('#', '');
        const marker = new google.maps.Marker({
          position: m.position,
          map,
          title: m.title,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">' +
              '<ellipse cx="20" cy="47" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>' +
              '<path d="M20 0 C9 0 0 9 0 20 C0 35 20 50 20 50 C20 50 40 35 40 20 C40 9 31 0 20 0Z" fill="#' + color + '"/>' +
              '<text x="20" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial">' + (m.beneficio.porcentaje || '') + '%</text>' +
              '</svg>'
            ),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50),
          }
        });
        marker.addListener('click', () => showInfo(m.beneficio));
      });
    }
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&callback=initMap"></script>
</body>
</html>`

  if (loading) return <View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View>

  // For web platform use iframe/WebView equivalent
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.titulo}>📍 Mapa de descuentos</Text>
        <Text style={s.sub}>{beneficios.length} comercios en el mapa</Text>
      </View>
      <View style={s.mapContainer}>
        {typeof document !== 'undefined' ? (
          <iframe
            srcDoc={htmlContent}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Mapa de descuentos"
          />
        ) : (
          <View style={s.center}>
            <Text style={s.noMapTxt}>El mapa está disponible en la versión web</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  mapContainer: { flex: 1 },
  noMapTxt: { color: '#aaa', fontSize: 15 },
})
