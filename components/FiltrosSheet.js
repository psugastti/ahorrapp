import { Modal, View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

const DIAS = [
  { id: 'hoy', label: 'Hoy' }, { id: 'finde', label: 'Fin de semana' },
  { id: 'lunes', label: 'Lunes' }, { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' }, { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' }, { id: 'sabado', label: 'Sábado' }, { id: 'domingo', label: 'Domingo' },
];
const TIPOS = [
  { id: 'credito', label: 'Crédito' }, { id: 'debito', label: 'Débito' }, { id: 'premium', label: 'Premium' },
];

// Hoja de filtros completa. Los días rápidos y las categorías también viven en Inicio;
// acá está el set entero para cuando el usuario quiere afinar.
export default function FiltrosSheet({
  visible, onClose, resultados,
  diasSel, toggleDia,
  bancos, bancosSel, toggleBanco,
  categorias, catsSel, toggleCat,
  tipoSel, setTipoSel,
  misBancos, soloMisBancos, setSoloMisBancos,
  misTarjetas, soloPuedoUsar, setSoloPuedoUsar,
  onLimpiar, hayFiltro,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Cerrar filtros" />

        <View style={s.sheet}>
          <View style={s.grip} />
          <View style={s.head}>
            <Text style={s.title}>Filtros</Text>
            {hayFiltro ? (
              <TouchableOpacity onPress={onLimpiar} hitSlop={10}>
                <Text style={s.limpiar}>Limpiar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
            <Grupo titulo="DÍA">
              {DIAS.map(d => (
                <Chip key={d.id} label={d.label} activo={diasSel.includes(d.id)} onPress={() => toggleDia(d.id)} />
              ))}
            </Grupo>

            {(misBancos.length > 0 || misTarjetas.length > 0) && (
              <Grupo titulo="MI BILLETERA">
                {misBancos.length > 0 && (
                  <Chip label="Solo mis bancos" activo={soloMisBancos} onPress={() => setSoloMisBancos(!soloMisBancos)} />
                )}
                {misTarjetas.length > 0 && (
                  <Chip label="Solo lo que puedo usar" activo={soloPuedoUsar} onPress={() => setSoloPuedoUsar(!soloPuedoUsar)} />
                )}
              </Grupo>
            )}

            <Grupo titulo="TIPO DE TARJETA">
              {TIPOS.map(t => (
                <Chip key={t.id} label={t.label} activo={tipoSel === t.id} onPress={() => setTipoSel(tipoSel === t.id ? null : t.id)} />
              ))}
            </Grupo>

            <Grupo titulo="BANCOS">
              {bancos.map(b => {
                const activo = bancosSel.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.chip, s.chipBanco, { borderColor: b.color || theme.colors.borderStrong },
                      activo && { backgroundColor: b.color || theme.colors.navy, borderColor: b.color || theme.colors.navy }]}
                    onPress={() => toggleBanco(b.id)}
                  >
                    <Text style={[s.chipTxt, { color: b.color || theme.colors.navy, fontWeight: '700' }, activo && s.chipTxtOn]}>
                      {b.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Grupo>

            <Grupo titulo="CATEGORÍAS">
              {categorias.map(c => (
                <Chip key={c.id} label={`${c.emoji || ''} ${c.nombre}`.trim()} activo={catsSel.includes(c.nombre)} onPress={() => toggleCat(c.nombre)} />
              ))}
            </Grupo>
          </ScrollView>

          <View style={s.foot}>
            <TouchableOpacity style={s.cta} activeOpacity={0.85} onPress={onClose}>
              <Text style={s.ctaTxt}>
                {resultados === 0
                  ? 'Sin resultados'
                  : `Ver ${resultados.toLocaleString('es-PY')} comercio${resultados === 1 ? '' : 's'}`}
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Grupo({ titulo, children }) {
  return (
    <View>
      <Text style={s.grupoTitulo}>{titulo}</Text>
      <View style={s.chips}>{children}</View>
    </View>
  );
}

function Chip({ label, activo, onPress }) {
  return (
    <TouchableOpacity style={[s.chip, activo && s.chipOn]} onPress={onPress}>
      {activo && <Ionicons name="checkmark" size={13} color="#fff" />}
      <Text style={[s.chipTxt, activo && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,26,48,0.55)' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  grip: { width: 42, height: 5, borderRadius: 3, backgroundColor: theme.colors.borderStrong, alignSelf: 'center', marginTop: 11 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  limpiar: { color: theme.colors.primary, fontSize: 13.5, fontWeight: '700' },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 18, gap: 18 },
  grupoTitulo: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.bgCardAlt, borderRadius: theme.radius.full,
    paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipBanco: { backgroundColor: theme.colors.bgCard },
  chipTxt: { color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '600' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },

  foot: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 17, backgroundColor: theme.colors.navy,
  },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
