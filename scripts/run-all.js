#!/usr/bin/env node
// Corre TODOS los bancos en una sola pasada y deja el resultado en staging_scrape.
// Uso:  node run-all.js [--dry-run] [--solo=Continental,GNB]
import { SCRAPERS } from './scrapers/index.js';
import { cerrarNavegador } from './lib/navegador.js';
import { db, selectAll } from './lib/db.js';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SOLO = args.find((a) => a.startsWith('--solo='))?.split('=')[1]?.split(',');

const hoy = new Date().toISOString().slice(0, 10);
const t0 = Date.now();

function log(...a) { console.log(...a); }

async function correrBanco(mod) {
  const inicio = Date.now();
  try {
    const filas = await mod.run();
    const limpias = filas.filter((f) => f.comercio && f.comercio.length > 1);
    // 0 filas casi siempre significa que el sitio cambió de formato, no que el
    // banco se quedó sin beneficios. Se marca como error para que NO entre al diff.
    if (limpias.length === 0) {
      return {
        banco: mod.banco, fuente: mod.fuente, ok: false,
        error: 'devolvió 0 beneficios (¿cambió el HTML?)',
        filas: [], segundos: ((Date.now() - inicio) / 1000).toFixed(1),
      };
    }
    return {
      banco: mod.banco, fuente: mod.fuente, ok: true,
      filas: limpias, segundos: ((Date.now() - inicio) / 1000).toFixed(1),
    };
  } catch (e) {
    return {
      banco: mod.banco, fuente: mod.fuente, ok: false,
      error: e.message, filas: [], segundos: ((Date.now() - inicio) / 1000).toFixed(1),
    };
  }
}

const elegidos = SCRAPERS.filter((s) => !SOLO || SOLO.includes(s.banco));

log(`\n=== Ahorrapp — corrida ${hoy} ===`);
log(`Bancos: ${elegidos.map((s) => s.banco).join(', ')}${DRY ? '  [DRY RUN]' : ''}\n`);

// Los que no necesitan navegador van todos juntos en paralelo.
// Los de navegador van en serie después, para no abrir varios Chrome a la vez.
const sinNav = elegidos.filter((s) => !s.requiereNavegador);
const conNav = elegidos.filter((s) => s.requiereNavegador);

const resultados = await Promise.all(sinNav.map(correrBanco));
for (const mod of conNav) resultados.push(await correrBanco(mod));
await cerrarNavegador();

// --- Reporte por banco ---
let total = 0;
for (const r of resultados.sort((a, b) => b.filas.length - a.filas.length)) {
  total += r.filas.length;
  const conPct = r.filas.filter((f) => f.porcentaje != null).length;
  log(
    r.ok
      ? `  OK   ${r.banco.padEnd(14)} ${String(r.filas.length).padStart(4)} beneficios  (${conPct} con %)  ${r.segundos}s`
      : `  FALLA ${r.banco.padEnd(13)} ${r.error}`
  );
}
log(`\n  TOTAL: ${total} beneficios leídos en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (DRY) {
  log('\n(dry-run: no se escribió nada en la base)\n');
  process.exit(0);
}

// --- Guardar en staging ---
const bancos = await selectAll('bancos', 'id,nombre');
const idPorNombre = new Map(bancos.map((b) => [b.nombre.toLowerCase(), b.id]));

const aInsertar = [];
for (const r of resultados) {
  if (!r.ok) continue;
  const bancoId = idPorNombre.get(r.banco.toLowerCase());
  for (const f of r.filas) {
    aInsertar.push({
      banco: r.banco,
      banco_id: bancoId,
      comercio: f.comercio,
      rubro: f.rubro ?? null,
      porcentaje: f.porcentaje ?? null,
      vence: f.vence ?? null,
      dias: f.dias ?? [],
      todos_los_dias: f.todos_los_dias ?? false,
      tope: f.tope_monto ?? null,
      tope_periodo: f.tope_periodo ?? null,
      tipo_beneficio: f.tipo_beneficio ?? null,
      ciudad: f.ciudad ?? null,
      link_oficial: f.link_oficial ?? null,
      url_bases: f.url_bases ?? null,
      externo_id: f.externo_id ?? null,
      solo_presencia: f.solo_presencia ?? false,
      payload: f,
      fuente: r.fuente,
      corrida: hoy,
    });
  }
}

// staging se reemplaza en cada corrida: es una foto del catálogo de hoy
await db.from('staging_scrape').delete().neq('id', 0);
let rechazadas = 0;
for (let i = 0; i < aInsertar.length; i += 500) {
  const lote = aInsertar.slice(i, i + 500);
  const { error } = await db.from('staging_scrape').insert(lote);
  if (!error) continue;
  // Una fila mala (ej. una fecha inexistente en un PDF) no puede tirar la corrida
  // entera: se reintenta de a una y se reportan las que Postgres rechaza.
  for (const fila of lote) {
    const r = await db.from('staging_scrape').insert(fila);
    if (r.error) {
      rechazadas++;
      console.error(`  RECHAZADA ${fila.banco} / ${fila.comercio}: ${r.error.message}`);
    }
  }
}
if (rechazadas) log(`\n  ${rechazadas} filas rechazadas por la base (ver arriba).`);

// bitácora
await db.from('scraping_runs').insert(
  resultados.map((r) => ({
    banco_nombre: r.banco,
    estado: r.ok ? 'completado' : 'error',
    beneficios_encontrados: r.filas.length,
    error_mensaje: r.ok ? null : r.error,
  }))
);

log(`\n  ${aInsertar.length - rechazadas} filas guardadas en staging_scrape.`);
log(`  Siguiente paso:  node apply-diff.js\n`);
