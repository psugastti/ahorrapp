# Cambios Ahorrapp (Benefix sync + frontend)

## Base de datos (Supabase) — ya aplicado, en vivo
- Importados los descuentos de Benefix: **+479 beneficios nuevos** (total **606**), sin duplicar los que ya tenías.
- Cada beneficio quedó mapeado a su **banco** y **categoría**, con **% , días, tope, vigencia y tipo de tarjeta** (crédito / débito / premium / ambas).
- **link_oficial** completado en TODOS los beneficios (apunta al sitio del banco correspondiente).

## Frontend (este repo) — falta hacer push para que Vercel lo despliegue
Se corrigieron problemas que rompían el build en Vercel y se agregaron tus pedidos:

1. **Nombres de archivo arreglados** (el build fallaba en Vercel por mayúsculas/sin extensión):
   - `lib/Supabase` → `lib/supabase.js`
   - `lib/Theme` → `lib/theme.js`
   - `screens/Explorarscreens` → `screens/ExplorarScreen.js`
   - `screens/DetalleScreen` → `screens/DetalleScreen.js`
   - `screens/PerfilScreen` → `screens/PerfilScreen.js`
2. **Clave de Supabase actualizada** en `lib/supabase.js` (la anterior estaba vencida → la app no leía datos).
3. **Banco en la tarjeta**: en el detalle, junto al tipo de tarjeta ahora dice también el banco, y se agregó una fila "Banco".
4. **Beneficios linkeados al banco**: botón "Ver en {banco}" en el detalle que abre el link oficial del banco.
5. **Explorar** ya tiene los filtros arriba (búsqueda, tipo de tarjeta, banco y categorías) y al tocar una categoría filtra los beneficios abajo, estilo Benefix.

## Cómo dejarlo en vivo
En tu repo local `psugastti/ahorrapp` reemplazá los archivos con los de esta carpeta y luego:

```bash
git add -A
git commit -m "Sync Benefix + fix build (filenames, supabase key) + banco/link en detalle"
git push origin main
```

Vercel redeploya solo. Para probar local: `npm install && npx expo start --web`.

---

## Rediseño v2 — tema claro (navy + turquesa)
Reskin completo de las 4 pantallas con tu paleta del mockup. Tema **claro** (fondo blanco/gris, textos navy, acentos turquesa). Todo sigue 100% funcional con los datos reales.

- `lib/theme.js`: nueva paleta clara (navy `#0E2A4E`, turquesa `#12B8A6`), radios y sombras.
- `App.js`: barra de navegación blanca, íconos navy/turquesa.
- **Inicio**: saludo + hero navy con total de beneficios, fila de "Destacados" (≥30%), filtros por día y categoría, lista de tarjetas claras.
- **Explorar**: buscador, chips de tipo de tarjeta y banco, y la lista "Todas las categorías" (con "Hasta X% · N beneficios"); al tocar una categoría filtra los beneficios abajo, estilo Benefix.
- **Detalle**: cabecera de marca con % grande, pills (tienda física/online, activo/vencido), filas de info (banco, tarjeta, días, tope, vigencia) y botón fijo **"Activar en {banco}"** que abre el link del banco.
- **Perfil**: stats reales (beneficios/bancos/categorías), selección de "Mis bancos" y menú.

---

## v3 — pedidos de Pablo (13/06/2026)

### Base de datos (Supabase) — ya aplicado, en vivo
1. **Links a beneficios (no a la home):** se agregó `url_beneficios` a cada banco y se apuntó el `link_oficial` de TODOS los beneficios a la **página oficial de promociones/beneficios** del banco. Se corrigieron 3 dominios mal cargados: GNB (`bancognb.com.py`), Atlas (`bancoatlas.com.py`) y BASA (`bancobasa.com.py`). Nota: Itaú→Interventajas, Continental→ContiMarket, BNF→Club de descuentos. FPJ no tiene página pública de beneficios, quedó en su home.
2. **Comercios divididos:** las filas que agrupaban varias marcas se separaron en comercios individuales (Puma · Petrobras · Enex; Biggie · Super Areté · Super Real; Superseis · Stock · Delimarket; Mango · Forever 21 · Springfield · Jack Jones; etc.). Total: **+35 filas** individuales.
3. **Reintegro Ueno por nivel (exacto):** Puma, Petrobras y Enex ahora muestran la tabla **verificada** de las bases oficiales de Ueno (combustibles, nov-2025):
   - Nivel 1: **10%** (tope reintegro Gs. 10.000)
   - Nivel 2: **15%** (Gs. 30.000)
   - Nivel 3: **25%** (Gs. 75.000)
   - Nivel 4: **30%** (Gs. 150.000)
   - Nivel 5: **40%** (Gs. 240.000)
   Se agregó la columna `niveles` (jsonb) para futuros beneficios por nivel.
4. **Limpieza:** se desactivaron **15 beneficios vencidos** (ya no aparecen) y se eliminaron **5 duplicados exactos** (Crocs, Club Internacional de Tenis, Biggie).
5. **Tabla `reportes`:** nueva tabla con permiso de inserción anónima para recibir los reportes de error desde la app.

Estado final: **615 beneficios activos**.

### Frontend
6. **"Activar en {banco}" eliminado.** El detalle ahora tiene un único botón: **"Ver bases y condiciones"** (abre la página oficial del beneficio).
7. **Botón para reportar errores** en cada beneficio: *"¿Este beneficio tiene un error? Reportar aquí"* → abre un formulario (motivo + mensaje + correo opcional). Al enviar **guarda el reporte en Supabase** y además **abre un correo prellenado a psugastti@gmail.com**.
8. **Tabla de niveles** visible en el detalle cuando el beneficio es por nivel.
9. **Pestaña "Explorar" eliminada.** En Inicio ahora están el **buscador por comercio** y el **selector de día** (Todos · Hoy · Finde · Lun…Dom), más los filtros por categoría.
10. **Botones muertos arreglados:** se quitó la campana sin función; en Perfil, "¿Cómo funciona?", "Privacidad" y "Sugerencias" ahora abren info/correo; "Versión" ya no simula ser un enlace.

### Pendiente / a verificar manualmente
- Las demás categorías de Ueno (tiendas, gastronomía, farmacias, etc.) también son por nivel, pero cada promo tiene su propia tabla mensual en sus bases. Se pueden cargar igual que combustibles cuando quieras pasarme los PDFs.
- Links: la mayoría apunta a la página general de beneficios del banco (no a cada beneficio puntual, porque los bancos no publican una URL por comercio).

### Cómo dejarlo en vivo
```bash
git add -A && git commit -m "v3: links beneficios, split comercios, niveles Ueno, reportes, buscador en inicio" && git push origin main
```

---

---

## v4 — comparativa con Benefix: 5 mejoras (14/06/2026)

### 1) Fiabilidad
- Nueva columna `verificado_en` y **sello "Datos verificados el [fecha]"** en cada detalle.
- Nueva columna `tipo_beneficio` (**descuento / reintegro / cuotas s/interés**) con badge en lista y detalle — deja claro si es al instante o cashback.

### 2) Mis bancos persistente + logos reales
- Logos reales de los 14 bancos (favicon oficial) con fallback a inicial — `bancos.logo_url`.
- "Mis bancos" se **guarda en el dispositivo** (AsyncStorage) y hay toggle "Solo mis bancos" en Inicio.

### 3) Mis tarjetas / ¿con cuál pago?
- En Perfil se cargan tarjetas (banco + tipo + **nivel ueno+** 1-5).
- En cada beneficio aparece **"Tu tarjeta"** si aplica, y en Ueno se muestra **tu % exacto según tu nivel** (no "hasta 40%").
- Toggle "Puedo usar" en Inicio para ver solo lo aplicable a tus tarjetas.

### 4) Notificaciones (preparado)
- Toggle "Aviso de beneficios del día" en Perfil. En web avisa al abrir; el **push real (app cerrada) queda para la versión nativa** iOS/Android.

### 5) Favoritos + modo instalable
- **Favoritos** con corazón en cada beneficio y **pestaña Favoritos** nueva.
- **PWA instalable**: `app.json` con manifest (nombre, colores, standalone) → "Agregar a pantalla de inicio".

### Datos nuevos
Local-first (sin login) con login opcional a futuro. Nuevas tablas/columnas: `beneficios.verificado_en`, `beneficios.tipo_beneficio`, `bancos.logo_url`. Nueva dependencia: `@react-native-async-storage/async-storage`.

### Pendiente (acordado)
- **Logo real:** dejé un placeholder en `assets/logo.png`. Reemplazá ese archivo por el logo definitivo (misma ruta y nombre) y listo, no hace falta tocar código.
- **Push nativo, modo oscuro y mapa de sucursales** (lat/lng) quedan para una próxima etapa.

---

### Pendiente: logo y tipografía
Cuando subas el **logo** (PNG/SVG) lo coloco en el header de Inicio y en splash/íconos (`assets/`). Si la **tipografía** es custom (ej. Poppins), la agrego con `expo-font` y la aplico globalmente. Por ahora se usa la tipografía del sistema.

