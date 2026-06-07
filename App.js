import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import ExplorarScreen from './screens/ExplorarScreen';
import DetalleScreen from './screens/DetalleScreen';
import PerfilScreen from './screens/PerfilScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A1628',
          borderTopColor: '#1E3A5F',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00C9B1',
        tabBarInactiveTintColor: '#4A6FA5',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Inicio: focused ? 'home' : 'home-outline',
            Explorar: focused ? 'search' : 'search-outline',
            Perfil: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Explorar" component={ExplorarScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen name="Detalle" component={DetalleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
