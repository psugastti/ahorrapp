# Ahorrapp — estado del proyecto

> **Este es el documento de entrada.** Si volvés al proyecto después de un tiempo (o si le pasás
> el proyecto a otra persona o a un agente), empezá acá.
>
> Última revisión: **8 de agosto de 2026** — verificado contra GitHub, Vercel y Supabase, no de memoria.

> **Cambio del 8/08/2026:** se rediseñó el Inicio (cabecera navy, feed limpio, pestaña «Ahorro»)
> y se arreglaron tres bugs que ocultaban catálogo. Detalle abajo, en «Qué está roto».

---

## Qué es

Una app que junta en un solo lugar todos los descuentos y reintegros de los bancos de Paraguay.
Hoy funciona como **web app instalable (PWA)**, hecha con React Native + Expo y exportada a web.
No hay build nativo de iOS/Android todavía.

Competidor directo: [benefix.com.py](https://www.benefix.com.py).

---

## Dónde vive cada cosa

| Pieza | Dónde | Cómo entrar |
|---|---|---|
| App en vivo | https://ahorrapp-eosin.vercel.app | público |
| Código | github.com/psugastti/ahorrapp (rama `main`) | cuenta `psugastti` |
| Hosting | Vercel, deploy automático al pushear a `main` | dashboard de Vercel |
| Base de datos | Supabase → proyecto **Ahorrapp Proyecto** (`itbwqrclualkitsjkyta`) | dashboard de Supabase |
| Esta carpeta | copia de trabajo local (**no es un repo git**) | `deploy.sh` la sube |
| Correo del proyecto | ahorrapp.py@gmail.com | recibe reportes de error |

### Importante sobre esta carpeta

Esta carpeta **no tiene git**. Es una copia de trabajo. El script `deploy.sh` clona el repo real,
copia los archivos de acá encima, y hace commit + push.

**Al 8 de agosto de 2026 esta carpeta y GitHub tienen exactamente el mismo código.**
No hay nada pendiente de subir. (Verificado con un diff archivo por archivo contra el último commit.)

---

## Los números reales de hoy

Consultados directo a Supabase el 8 de agosto de 2026:

| | |
|---|---|
| Beneficios activos y vigentes | **2.653** |
| Comercios distintos | **2.317** |
| Bancos cargados | 14 (2 de ellos sin ningún beneficio activo) |
| Categorías activas | 28 |
| Catálogo de tarjetas | 56 |
| Filas totales en `beneficios` (incluye históricas) | 4.371 |
| Reportes de usuarios sin atender | 1 |
| Cambios de scraping sin revisar | 1 |

### Beneficios activos por banco

| Banco | Activos | Verificado |
|---|---:|---|
| Continental | 707 | 07/08/2026 |
| Familiar | 426 | 07/08/2026 |
| Interfisa | 364 | 07/08/2026 |
| BASA | 265 | 07/08/2026 |
| Sudameris | 264 | 27/07/2026 |
| GNB | 217 | 02/08/2026 |
| Atlas | 118 | 08/08/2026 |
| FPJ | 111 | 20/07/2026 |
| Universitaria | 75 | 08/08/2026 |
| Itaú | 61 | 20/07/2026 |
| Solar | 25 | 08/08/2026 |
| Ueno | 20 | 02/08/2026 |
| **BNF** | **0** | 14/06/2026 |
| **FIC** | **0** | 14/06/2026 |

---

## El desfase que importa

Esto es lo que más confunde al volver al proyecto:

- **Los datos avanzan rápido.** Última carga: hoy mismo (2.125 beneficios tocados el 08/08).
  Antes: 02/08, 27/07, 20/07, 15/07. Cada pocos días.
- **El código está congelado desde el 28 de junio de 2026.** Un commit y medio mes sin tocarse.
- **La app en vivo fue diseñada para ~600 beneficios y hoy sirve 2.653.** Cuadruplicó los datos
  sin que la interfaz cambiara. Eso explica por qué se siente lenta y apretada.

---

## Cómo está armado

**Stack:** Expo SDK 52 · React Native 0.76 · React Navigation 6 · Supabase JS · AsyncStorage.
Sin TypeScript, sin tests, sin state manager (todo en `useState` dentro de cada pantalla).

**Pantallas** (`screens/`):

| Archivo | Qué hace |
|---|---|
| `HomeScreen.js` | Cabecera navy, segmento, categorías y lista de comercios agrupados |
| `ComercioScreen.js` | Todos los beneficios de un comercio, filtrables por tipo de tarjeta y banco |
| `DetalleScreen.js` | Un beneficio: %, condiciones, tabla de niveles, botón de bases, reportar error |
| `CalculadoraScreen.js` | "¿Con qué tarjeta me conviene pagar?" |
| `FavoritosScreen.js` | Beneficios marcados con corazón |
| `PerfilScreen.js` | Mis bancos, mis tarjetas, avisos, links de info |

**Componentes** (`components/`):

| Archivo | Qué hace |
|---|---|
| `HeroHeader.js` | Cabecera navy del Inicio + la barra condensada que aparece al scrollear |
| `ComercioCard.js` | Tarjeta de comercio con la franja del color del banco |
| `FiltrosSheet.js` | Hoja de filtros (día, billetera, tipo de tarjeta, bancos, categorías) |
| `ui.js` | `BancoLogo` y `TipoBadge`, usados por las otras pantallas |

**Librerías propias** (`lib/`):

| Archivo | Qué hace |
|---|---|
| `supabase.js` | Cliente Supabase (URL + clave anónima) |
| `theme.js` | Paleta navy `#0E2A4E` + turquesa `#12B8A6`, radios, sombras, íconos por categoría |
| `storage.js` | AsyncStorage: mis bancos, mis tarjetas, favoritos, preferencias, matching de tarjetas |
| `notifications.js` | Aviso diario de beneficios (solo web, al abrir la app) |
| `links.js` | Apertura de links externos |

**Tablas de Supabase:**

| Tabla | Para qué | Estado |
|---|---|---|
| `beneficios` | El corazón. 30+ columnas | En uso |
| `bancos`, `categorias` | Catálogos | En uso |
| `tarjetas` | Catálogo de 56 tarjetas por banco/nivel | En uso |
| `reportes` | Reportes de error de usuarios | En uso (1 fila) |
| `scraping_runs`, `cambios_scraping` | Bitácora del pipeline de datos | En uso, sin interfaz |
| `auditoria_bajas` | Historial de beneficios dados de baja (1.630 filas) | En uso, sin interfaz |
| `staging_scrape` | Zona de carga temporal | Vacía |
| `beneficio_tarjetas` | Relación beneficio↔tarjeta | **Vacía, nunca se usó** |

No hay Edge Functions. La carga de datos se hace **a mano / asistida**, no automatizada.
El detalle de cómo se alimenta cada banco está en [FUENTES.md](FUENTES.md).

---

## Cómo publicar un cambio

```bash
bash deploy.sh "mensaje del commit"
```

El script clona el repo, copia los archivos de esta carpeta, commitea y pushea.
Vercel redeploya solo en 1-2 minutos.

Para probar en local antes:

```bash
npm install && npx expo start --web
```

---

## Arreglado el 8 de agosto de 2026

Tres bugs que escondían catálogo, los tres verificados contra la base:

1. **Solo se veían 120 comercios de 2.317.** `HomeScreen.js` cortaba la lista en 120 y no
   había forma de ver el resto. Ahora se muestran de a 40 con un botón «Mostrar más», y se
   llega al catálogo completo.

2. **La paginación perdía 47 comercios.** La consulta traía los beneficios de a 1.000
   ordenados solo por `porcentaje`. Como hay cientos de empates, Postgres podía devolverlos
   en distinto orden en cada página: se repetían filas y se perdían otras. Traía 2.653 filas,
   pero no eran las 2.653 correctas. Se agregó `id` como criterio de desempate.

3. **BNF y FIC aparecían en el filtro de bancos sin tener ni un beneficio.** Ahora el filtro
   se arma con los bancos que realmente tienen algo cargado. (En Perfil siguen apareciendo,
   y está bien: ahí la pregunta es dónde tenés cuenta, no qué hay cargado.)

De paso: el filtro «Puedo usar» comparaba mal las tarjetas porque la consulta no traía
`marca_tarjeta` ni `nivel_min`, así que trataba cualquier restricción de marca o nivel como
inexistente. Ahora sí las trae.

### Rediseño del Inicio (opción «Cabina»)

- Cabecera navy que se lleva adentro saludo, buscador y días, con dos cifras arriba
  (beneficios activos / vencen esta semana). Al scrollear se condensa en una barra fina.
- El feed quedó limpio: solo comercios, en tarjetas con la franja del color del banco.
- Segmento **Para vos · Todos · Vence pronto** en lugar de los toggles que aparecían y
  desaparecían según el perfil.
- Filtros completos en una hoja, detrás de una pastilla flotante con contador.
- **Pestaña «Ahorro»** para la calculadora, que antes era una tarjeta perdida en el scroll.
- Se generó `assets/logo-navy.png` (versión clara del logo) porque el original es navy y
  sobre la cabecera no se veía.

**Detalle técnico que conviene no revertir:** el Inicio usa `ScrollView`, no `FlatList`. La
virtualización de react-native-web se queda clavada en el primer lote y no crece por más que
se scrollee (probado: 12 tarjetas y de ahí no pasaba, con y sin `Animated`). Como la lista ya
está acotada por la paginación, el `ScrollView` es lo predecible en las dos plataformas.

---

## Qué sigue roto o a medias

1. **La app descarga los 2.653 beneficios al abrir.** Se aligeró el payload (los datos de
   banco y categoría ya no vienen repetidos en cada fila, se cruzan en memoria), pero sigue
   bajando todo el catálogo. Lo correcto a futuro es filtrar y paginar en el servidor.

2. **1 reporte de usuario y 1 cambio de scraping sin revisar.** No hay pantalla ni proceso
   para atenderlos: hay que entrar a Supabase a mirarlos a mano.

3. **La tabla `beneficio_tarjetas` está vacía y nadie la usa.** O se llena o se borra.

4. **Sin push real.** El "aviso de beneficios del día" solo avisa al abrir la app en web.
   El push de verdad necesita build nativo.

5. **Expo SDK 52; el último es 57.** Cinco versiones atrás. No urge, pero cuanto más se
   espera, más caro es el salto.

6. **148 beneficios sin `fuente`.** Son los de la importación original desde Benefix, nunca
   re-verificados contra el banco.

---

## Por dónde seguir

### A · Automatizar los datos (varios días, sin techo claro)
Es el cuello de botella real: los datos se cargan a mano. [FUENTES.md](FUENTES.md) tiene el
análisis banco por banco. Continental y Solar tienen API JSON y solos cubren el 28% del
catálogo: por ahí empezaría.

### B · Paginar en el servidor (1 día)
Que el Inicio pida solo lo que muestra en vez de bajar 2.653 beneficios. Requiere una vista
o función en Supabase que agrupe por comercio.

### C · Atender lo que reportan los usuarios (medio día)
Una pantalla mínima para ver `reportes` y `cambios_scraping` sin entrar a Supabase.

### D · Build nativo iOS/Android
Habilita el push real. Es el salto más grande y probablemente pide subir de SDK primero.

---

## Historial

Resumen de lo que se hizo, para contexto. El detalle completo de las versiones v1 a v4 está
en el archivo `CAMBIOS.md` del repositorio, en el commit `50fd854` — se sacó de esta carpeta
porque estaba desactualizado y sus instrucciones ("falta hacer push") ya no aplicaban.

| Cuándo | Qué pasó |
|---|---|
| 19/05/2026 | Se crea el proyecto de Supabase |
| jun/2026 (v1-v2) | Importación inicial desde Benefix (606 beneficios). Arreglos de build en Vercel. Rediseño a tema claro navy + turquesa |
| 13/06/2026 (v3) | Links a las páginas de beneficios de cada banco. Comercios agrupados se separan. Niveles de Ueno. Tabla de reportes. Se elimina la pestaña "Explorar" |
| 14/06/2026 (v4) | Sello "verificado el", tipo de beneficio, logos reales de bancos, "mis bancos" y "mis tarjetas" persistentes, favoritos, PWA instalable |
| 14-17/06/2026 | Pantalla por comercio, calculadora de ahorro, avisos diarios |
| 28/06/2026 | Último commit: se ocultan los beneficios vencidos |
| 15/07 – 08/08/2026 | Solo datos. Cinco cargas grandes; el catálogo pasa de ~600 a 2.653 beneficios |
