# Ahorrapp — de dónde salen los datos

Cómo se alimenta la base de beneficios, banco por banco.
Para el estado general del proyecto, ver [ESTADO.md](ESTADO.md).

> **Revisado el 8 de agosto de 2026** contra la base real.
> La versión anterior de este archivo era de junio y quedó vieja: decía que Continental,
> Interfisa y Familiar no eran automatizables. Los tres se resolvieron desde entonces y
> hoy son las tres fuentes más grandes.

**Objetivo:** alimentar la base directo de los bancos, sin depender de Benefix.
**Realidad:** cada banco publica distinto. No hay una API común. Eso define qué se automatiza
y qué no.

---

## Estado por banco

| Banco | Cómo publica | Activos | Verificado |
|---|---|---:|---|
| **Continental** | **API JSON pública** — `bancontinental.com.py/api/comercios` | 707 | 07/08/2026 |
| **Familiar** | Catálogo Webflow — `familiar.com.py/promociones-tarjetas` | 426 | 07/08/2026 |
| **Interfisa** | Catálogo HTML — `interfisa.com.py/beneficios` | 364 | 07/08/2026 |
| **BASA** | Catálogo HTML (`bancobasa.com.py`) + bases en PDF | 265 | 07/08/2026 |
| **Sudameris** | Bases en PDF, **una por ciudad** (~25 archivos) | 264 | 27/07/2026 |
| **GNB** | Catálogo HTML — `beneficiosbancognb.com.py` | 217 | 02/08/2026 |
| **Atlas** | HTML con atributos `data-*` + **imágenes** de comercios adheridos | 118 | 08/08/2026 |
| **FPJ** | Sitio oficial | 111 | 20/07/2026 |
| **Universitaria** | `universitaria.coop/promociones` + bases PDF | 75 | 08/08/2026 |
| **Itaú** | Interventajas | 61 | 20/07/2026 |
| **Solar** | **API Wagtail** — `api.solar.com.py` + bases PDF | 25 | 08/08/2026 |
| **Ueno** | PDFs mensuales por categoría (texto parseable) | 20 | 02/08/2026 |
| **BNF** | Club de descuentos | **0** | 14/06/2026 |
| **FIC** | Mínimo | **0** | 14/06/2026 |

Además hay **148 beneficios sin `fuente` cargada** — son los que quedaron de la importación
original desde Benefix y nunca se re-verificaron contra el banco.

---

## Las tres categorías

### 1. Se leen limpio y completo
**Continental, Solar** (APIs), **GNB, Interfisa, Familiar, BASA** (catálogos HTML).

Estos publican datos estructurados: nombre, %, días, link. Son el 80% del catálogo.
Refrescar es leer la URL y comparar. Acá vale la pena automatizar.

Continental y Solar exponen **APIs JSON directas** — son las más fáciles de todas y
deberían ser las primeras en tener refresco automático.

### 2. Se leen con trabajo manual
**Ueno, Sudameris, Universitaria, Atlas.**

- **Ueno**: PDFs de texto, parseables. El % real, los niveles y los topes salen bien.
  Lo tedioso es que no hay índice: cada mes hay que ubicar la URL del PDF de cada categoría
  (`ueno.com.py/beneficio-byc/<mes><año>/<categoria>/`).
  Combustibles y supermercados ya tienen la tabla de niveles exacta.
- **Sudameris**: publica **un PDF de bases por ciudad** — Encarnación, CDE, Villarrica,
  Cnel. Oviedo, Hohenau y unos 20 más. Por eso sus 264 beneficios están repartidos en
  ~25 fuentes distintas. Es el más laborioso del lote.
- **Atlas**: parte sale del HTML (`data-*`), pero la lista de comercios adheridos está
  **en imágenes**. Esa parte se cargó a mano.

### 3. Casi no publican
**BNF y FIC** — hoy en cero. Están activos en la base, así que aparecen en el filtro de
bancos de la app y al tocarlos no muestran nada. O se cargan o se desactivan.

---

## Sobre el OCR

La versión anterior de este documento recomendaba **no** perseguir OCR para BASA e Interfisa,
porque publicaban las bases como PDF escaneado. Resultó que no hizo falta: los dos tienen
catálogo HTML con los nombres, y el PDF quedó solo como link de bases. **La recomendación
sigue en pie:** no invertir en OCR. Nombre + link oficial alcanza.

La excepción sigue siendo Atlas, donde la lista de adheridos es una imagen. Ahí se cargó a mano
y es aceptable porque son pocos.

---

## Columnas de la base relacionadas

En `beneficios`:

| Columna | Para qué |
|---|---|
| `fuente` | De dónde salió el dato (texto libre — conviene mantener el mismo string por banco) |
| `verificado_en` | Fecha de la última verificación contra el banco. Alimenta el sello "Verificado el…" |
| `link_oficial`, `url_bases` | Link a la promo y a las bases y condiciones |
| `niveles` (jsonb) | Tabla de % por nivel de tarjeta (Ueno) |
| `tope_periodo` | Si el tope es semanal, mensual, etc. |
| `observacion` | Notas sueltas que no entran en otra columna |
| `tipo_beneficio` | descuento / reintegro / cuotas sin interés |

Bitácora del proceso: `scraping_runs` (252 corridas, la última el 20/07/2026) y
`cambios_scraping` (90 cambios detectados, **1 sin revisar**). No hay pantalla para verlos:
hay que consultarlos en Supabase.

---

## Qué haría falta para automatizar

Hoy **todo se carga a mano o asistido**. No hay Edge Functions ni cron.

Orden recomendado, de mejor a peor relación esfuerzo/beneficio:

1. **Continental y Solar** — son APIs JSON. Un job que las lea y compare contra la base
   cubre 732 beneficios (el 28% del catálogo) sin pelear con HTML.
2. **GNB, Interfisa, Familiar, BASA** — catálogos HTML estables. Mismo job, con un parser
   por banco. Suman otros 1.272 (48%). GNB tiene anti-bot, así que necesita navegador real.
3. **Ueno** — parser de PDF por categoría, con descubrimiento de URL asistido cada mes.
4. **Sudameris** — 25 PDFs por ciudad. Automatizable pero es el más caro; dejarlo último.
5. **Atlas, Universitaria, FPJ, Itaú** — volumen bajo, seguir a mano.
6. **BNF y FIC** — decidir si se cargan o se desactivan.

El respaldo de todo esto sigue siendo el **botón de reportar error** en la app y el
**sello de verificación**, que le dice al usuario qué tan fresco es el dato que está viendo.
