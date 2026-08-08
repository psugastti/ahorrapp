# Cómo trabajar en Ahorrapp

Guía para quien toque el código (persona o agente). Para saber **en qué estado está el proyecto
y qué sigue**, leé primero [ESTADO.md](ESTADO.md).

---

## Versión de Expo — leer antes de escribir código

**Este proyecto corre Expo SDK 52** (`expo ~52.0.0` en `package.json`, React Native 0.76.3).

Los docs correctos son los de esa versión:
https://docs.expo.dev/versions/v52.0.0/

No uses los docs de `latest`. Expo rompe APIs entre SDKs y la documentación por defecto
apunta a la última versión (hoy SDK 57), que no es la de este proyecto. Si vas a subir de
SDK, es una tarea propia y planificada, no algo que pase de costado en otro cambio.

---

## Esta carpeta no es un repo git

Es una copia de trabajo. El repo real es `github.com/psugastti/ahorrapp`.

Para publicar:

```bash
bash deploy.sh "mensaje del commit"
```

Eso clona el repo en `~/ahorrapp-deploy`, copia los archivos de acá encima, commitea y pushea.
Vercel redeploya solo.

**Si agregás un archivo nuevo** (una pantalla, un componente), acordate de sumarlo a la lista
de `cp` dentro de `deploy.sh` o no va a subir nunca.

Para probar local:

```bash
npm install && npx expo start --web
```

---

## Mapa del código

```
App.js                  navegación: 3 tabs (Inicio/Favoritos/Perfil) + 3 pantallas apiladas
index.js                entrada de Expo

screens/
  HomeScreen.js         buscador, filtros, destacados, lista de comercios
  ComercioScreen.js     beneficios de un comercio
  DetalleScreen.js      un beneficio en detalle + reportar error
  CalculadoraScreen.js  con qué tarjeta conviene pagar
  FavoritosScreen.js    guardados
  PerfilScreen.js       mis bancos, mis tarjetas, avisos

lib/
  supabase.js           cliente
  theme.js              paleta, radios, sombras, íconos por categoría
  storage.js            AsyncStorage + lógica de matching de tarjetas
  notifications.js      aviso diario (solo web)
  links.js              abrir links externos

components/
  ui.js                 BancoLogo, TipoBadge
```

---

## Convenciones que ya existen — seguilas

- **Todo en español.** Nombres de variables, funciones, comentarios, strings. `beneficios`,
  `comercio`, `misTarjetas`, `diasParaVencer`. No mezcles inglés.
- **Sin TypeScript.** JavaScript plano con JSX.
- **Estilos con `StyleSheet.create`** al final de cada archivo, en una constante llamada `s`.
  Nada de styled-components ni Tailwind.
- **Colores siempre desde `theme.colors`**, nunca hardcodeados. La única excepción son los
  colores de marca de cada banco, que vienen de la base (`bancos.color`).
- **Íconos de `@expo/vector-icons` (Ionicons).**
- **Sin state manager.** Cada pantalla maneja su propio `useState`. Los datos compartidos entre
  pantallas (favoritos, mis bancos, mis tarjetas) pasan por `lib/storage.js` y se releen con
  `useFocusEffect`.
- **Archivos con mayúscula inicial** para pantallas y componentes, minúscula para `lib/`.
  Esto ya rompió el build de Vercel una vez (Linux distingue mayúsculas, macOS no).

---

## Trampas conocidas

**El build de Vercel es case-sensitive.** macOS no. Si el import dice `./lib/Theme` y el archivo
es `theme.js`, en tu Mac anda y en Vercel explota. Revisá los imports antes de pushear.

**`deploy.sh` copia archivos uno por uno.** No hace `cp -r`. Archivo nuevo que no esté listado,
archivo que no se publica.

**La clave de Supabase vive en `lib/supabase.js`, en el repo.** Es la clave anónima (pública por
diseño), así que no es una filtración — pero significa que la seguridad depende enteramente de
las políticas RLS de Supabase. Si agregás tablas, agregales RLS.

**Los datos crecen mucho más rápido que el código.** Cualquier cosa que escribas asumiendo
"pocos beneficios" se va a romper. Hoy son 2.653 y suben cada semana. Paginá, virtualizá,
no cargues todo en memoria.

**El `.npmrc` tiene `legacy-peer-deps=true`.** Está en el repo, no en esta carpeta. Si instalás
dependencias acá y te pelea con peer deps, esa es la razón.

---

## Antes de dar algo por terminado

1. `npx expo start --web` y abrilo de verdad en el navegador.
2. Probá con la base real, no con datos de prueba: los 2.653 beneficios exponen problemas de
   rendimiento que 10 filas no muestran.
3. Revisá que los imports coincidan en mayúsculas con el nombre real del archivo.
4. Si tocaste la base, anotá qué cambiaste en [ESTADO.md](ESTADO.md).
