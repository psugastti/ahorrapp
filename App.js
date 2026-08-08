import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './lib/theme';
import HomeScreen from './screens/HomeScreen';
import FavoritosScreen from './screens/FavoritosScreen';
import ComercioScreen from './screens/ComercioScreen';
import DetalleScreen from './screens/DetalleScreen';
import PerfilScreen from './screens/PerfilScreen';
import CalculadoraScreen from './screens/CalculadoraScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONOS = {
  Inicio: ['home', 'home-outline'],
  Favoritos: ['heart', 'heart-outline'],
  Ahorro: ['calculator', 'calculator-outline'],
  Perfil: ['person', 'person-outline'],
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.navBg,
          borderTopColor: theme.colors.navBorder,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.navActive,
        tabBarInactiveTintColor: theme.colors.navInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ color, focused }) => {
          const [lleno, vacio] = ICONOS[route.name];
          return <Ionicons name={focused ? lleno : vacio} size={23} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Favoritos" component={FavoritosScreen} />
      {/* La calculadora era una tarjeta perdida en el scroll de Inicio. Es lo más útil
          que tiene la app, así que ahora tiene pestaña propia. */}
      <Tab.Screen name="Ahorro" component={CalculadoraScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen name="Comercio" component={ComercioScreen} />
        <Stack.Screen name="Detalle" component={DetalleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
