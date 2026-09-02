# Scrapers de Ahorrapp

Un solo comando lee **todos los bancos a la vez** y deja la base al día.

```bash
cd scripts
npm install
node run-all.js --dry-run     # solo leer, no toca nada
node run-all.js               # leer y guardar en staging_scrape
node apply-diff.js            # comparar y aplicar
```

## Cómo está armado

```
run-all.js      corre los 11 scrapers en paralelo → staging_scrape
apply-diff.js   compara staging vs beneficios → aplica lo seguro, encola lo dudoso
scrapers/       un archivo por banco
lib/normalize.js  parseo de %, días, fechas y topes (nunca inventa)
lib/http.js     fetch con reintentos y respaldo por curl
lib/navegador.js Chrome headless para las fuentes con anti-bot
```

## Qué se aplica solo y qué no

| Auto-aplica (reversible) | Va a la cola para tu OK |
|---|---|
| Beneficios vencidos | Cambios de porcentaje |
| Comercios que desaparecieron del catálogo | Cambios de días |
| Vigencia extendida por el banco | Cambio de tipo (descuento/reintegro/cuotas) |
| Completar links vacíos | Comercios nuevos |
| Sello `verificado_en` | |

Toda baja se respalda antes en `auditoria_bajas`. Nada se borra nunca.

**Freno de mano:** si un banco devuelve menos del 50% de lo que tenía, se asume que
el sitio cambió de formato y no se da de baja nada de ese banco. Queda en el reporte.

## Estado por banco

| Banco | Cómo se lee | Aprox. |
|---|---|---:|
| Continental | API JSON (`/api/comercios?_limit=-1`) | 731 |
| Interfisa | HTML `.cards-con-modal-item` | 365 |
| Familiar | Webflow paginado, sigue "Siguiente" | 316 |
| BASA | HTML, **solo presencia** (el % está en PDF-imagen) | 216 |
| FPJ | datos en el `alt` de las imágenes | 90 |
| Universitaria | una página por categoría + PDF de bases | 75 |
| Sudameris | una página de detalle por beneficio | 48 |
| Solar | HTML | 25 |
| Atlas | atributos `data-pct` / `data-desc` | 12 |
| Ueno | avisa que salió el PDF del mes (los comercios son logos) | aviso |
| GNB | Chrome headless (Akamai bloquea fetch) | 202 |

Itaú sigue a mano: sus páginas de detalle requieren navegador con sesión.

## Credenciales

`SUPABASE_SERVICE_KEY` (Supabase → Project Settings → API → `service_role`).

- Local: `scripts/.env` con `SUPABASE_SERVICE_KEY=eyJ...` (está en .gitignore)
- CI: secret del repo en GitHub

## Automático

`.github/workflows/scraper.yml` corre los lunes 08:00 (Paraguay) y también a mano
desde la pestaña Actions con "Run workflow".
