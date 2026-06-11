// Tema CLARO de Ahorrapp — paleta navy + turquesa (basada en el diseño de Pablo)
export const theme = {
  colors: {
    // Fondos
    bg: '#F5F7FA',          // fondo general (gris muy claro)
    bgCard: '#FFFFFF',      // tarjetas
    bgCardAlt: '#EEF2F7',   // tarjeta secundaria / chips
    bgSoft: '#E8FBF8',      // turquesa muy suave (fondos de badges)

    // Marca
    navy: '#0E2A4E',        // navy principal (titulos, botones)
    navyDark: '#0A1B3D',
    primary: '#12B8A6',     // turquesa
    primaryDark: '#0E9F90',
    primaryLight: '#D7F6F2',
    accent: '#0E2A4E',      // acento = navy (botones primarios)

    // Texto
    text: '#0E2A4E',        // títulos navy
    textSecondary: '#5A6B82',
    textMuted: '#94A3B8',
    textOnDark: '#FFFFFF',

    // Bordes / utilidades
    border: '#E6EBF2',
    borderStrong: '#D4DCE7',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',

    // Navegación
    navBg: '#FFFFFF',
    navBorder: '#E6EBF2',
    navActive: '#12B8A6',
    navInactive: '#94A3B8',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 26,
    full: 999,
  },
  shadow: {
    card: {
      shadowColor: '#0E2A4E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    },
  },
};

export const CATEGORIAS_ICONOS = {
  'Supermercados': 'cart',
  'Combustible': 'flame',
  'Gastronomía': 'restaurant',
  'Farmacia': 'medical',
  'Indumentaria': 'shirt',
  'Electrónica': 'phone-portrait',
  'Electrodomésticos': 'home',
  'Hogar y Deco': 'bed',
  'Salud y Bienestar': 'heart',
  'Entretenimiento': 'film',
  'Viajes y Turismo': 'airplane',
  'Educación': 'book',
  'Clubes y Gimnasios': 'barbell',
  'Óptica': 'glasses',
  'Estética': 'rose',
  'Shoppings': 'bag',
  'Automotores': 'car',
  'Calzado': 'footsteps',
  'Online': 'globe',
  'Mascotas': 'paw',
  'Deportes': 'football',
  'Varios': 'gift',
  'Joyería': 'diamond',
  'Construcción': 'construct',
  'Perfumería': 'flower',
  'Florería': 'flower-outline',
  'Agro': 'leaf',
  'Municipios': 'business',
};
