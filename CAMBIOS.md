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

### Pendiente: logo y tipografía
Cuando subas el **logo** (PNG/SVG) lo coloco en el header de Inicio y en splash/íconos (`assets/`). Si la **tipografía** es custom (ej. Poppins), la agrego con `expo-font` y la aplico globalmente. Por ahora se usa la tipografía del sistema.

