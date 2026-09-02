#!/usr/bin/env node
/**
 * Compara staging_scrape (lo que dicen los bancos hoy) contra beneficios (lo que
 * muestra la app) y decide qué hacer con cada diferencia.
 *
 * AUTO-APLICA (reversible, siempre con respaldo en auditoria_bajas):
 *   - vencidos: activo=true y vence < hoy
 *   - desaparecidos del catálogo del banco
 *   - vigencia extendida por la fuente
 *   - completar link_oficial / url_bases vacíos
 *   - sellar verificado_en cuando el dato coincide
 *
 * ENCOLA en cambios_scraping (requiere aprobación de Pablo):
 *   - cambios de porcentaje, días o tipo de beneficio
 *   - comercios nuevos que la fuente publica y la base no tiene
 *
 * FRENO DE MANO: si un banco trae menos del 50% de lo que tenía, se asume que
 * el sitio cambió de formato y NO se da de baja nada de ese banco.
 */
import { db, selectAll } from './lib/db.js';
import { claveComercio } from './lib/normalize.js';

const DRY = process.argv.includes('--dry-run');
const hoy = new Date().toISOString().slice(0, 10);
const UMBRAL_CAIDA = 0.5;
const UMBRAL_EMPAREJADOS = 0.5;

const log = (...a) => console.log(...a);
const resumen = {
  vencidos: 0, desaparecidos: 0, vigencia_extendida: 0,
  links_completados: 0, verificados: 0, encolados: 0, bancos_frenados: [],
};

// ---------- datos ----------
const staging = await selectAll('staging_scrape', '*');
const beneficios = await selectAll(
  'beneficios',
  'id,comercio,banco_id,porcentaje,tipo_beneficio,dias,todos_los_dias,vence,activo,link_oficial,url_bases,verificado_en,observacion',
  (q) => q.eq('activo', true)
);
const bancos = await selectAll('bancos', 'id,nombre');
const nombrePorId = new Map(bancos.map((b) => [b.id, b.nombre]));

if (!staging.length) {
  console.error('staging_scrape está vacío: corré primero  node run-all.js');
  process.exit(1);
}

const porBanco = new Map();
for (const s of staging) {
  if (!porBanco.has(s.banco_id)) porBanco.set(s.banco_id, []);
  porBanco.get(s.banco_id).push(s);
}

const bajas = [];   // {id, motivo, fila}
const updates = []; // {id, campos}
const cola = [];    // filas de cambios_scraping

// ---------- 1. vencidos (aplica a TODA la base, venga o no del scraper) ----------
for (const b of beneficios) {
  if (b.vence && b.vence < hoy) {
    bajas.push({ id: b.id, motivo: `vencido_${hoy}`, fila: b });
    resumen.vencidos++;
  }
}
const yaDeBaja = new Set(bajas.map((b) => b.id));

// ---------- 2..5 por banco ----------
for (const [bancoId, filas] of porBanco) {
  const nombre = nombrePorId.get(bancoId) || `banco ${bancoId}`;
  const enBase = beneficios.filter((b) => b.banco_id === bancoId);
  const soloPresencia = filas.every((f) => f.solo_presencia);

  // freno 1: el banco trae mucho menos de lo que tenía
  let puedeDarDeBaja = enBase.length === 0 || filas.length / enBase.length >= UMBRAL_CAIDA;
  if (!puedeDarDeBaja) {
    resumen.bancos_frenados.push(`${nombre}: leyó ${filas.length} vs ${enBase.length} en base`);
  }

  const porClave = new Map();
  for (const f of filas) {
    const k = claveComercio(f.comercio); // NUNCA f.clave: la genera Postgres con otra regla
    if (!porClave.has(k)) porClave.set(k, f);
  }

  // freno 2: si el emparejamiento por nombre falla en masa, no son bajas reales,
  // es que cambió el formato del sitio (o la normalización de nombres).
  if (puedeDarDeBaja && enBase.length >= 20) {
    const clavesFuente = new Set([...porClave.keys()]);
    const emparejables = enBase.filter((b) => clavesFuente.has(claveComercio(b.comercio))).length;
    if (emparejables / enBase.length < UMBRAL_EMPAREJADOS) {
      puedeDarDeBaja = false;
      resumen.bancos_frenados.push(
        `${nombre}: solo emparejó ${emparejables} de ${enBase.length} comercios por nombre`
      );
    }
  }

  const emparejados = new Set();

  for (const b of enBase) {
    if (yaDeBaja.has(b.id)) continue;
    const k = claveComercio(b.comercio);
    const f = porClave.get(k);

    if (!f) {
      // desapareció del catálogo
      if (puedeDarDeBaja) {
        bajas.push({ id: b.id, motivo: `desaparecio_del_catalogo_${nombre}_${hoy}`, fila: b });
        resumen.desaparecidos++;
      }
      continue;
    }
    emparejados.add(k);

    const campos = {};
    let coincide = true;

    // vigencia: extender es seguro (el dato es textual de la fuente)
    if (f.vence && f.vence >= hoy && f.vence !== b.vence) {
      campos.vence = f.vence;
      resumen.vigencia_extendida++;
    }
    // completar huecos, nunca pisar lo que ya hay
    if (!b.link_oficial && f.link_oficial) { campos.link_oficial = f.link_oficial; resumen.links_completados++; }
    if (!b.url_bases && f.url_bases) { campos.url_bases = f.url_bases; resumen.links_completados++; }

    // --- lo que NO se toca solo ---
    if (!soloPresencia && f.porcentaje != null && b.porcentaje != null && f.porcentaje !== b.porcentaje) {
      coincide = false;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'porcentaje', comercio: b.comercio, beneficio_id: b.id,
        porcentaje_anterior: b.porcentaje, porcentaje_nuevo: f.porcentaje,
        descripcion_anterior: `${b.porcentaje}%`, descripcion_nuevo: `${f.porcentaje}%`,
        estado: 'pendiente',
        notas: `Detectado por scraper automático. Fuente: ${f.link_oficial || f.fuente}`,
      });
    }
    if (!soloPresencia && f.tipo_beneficio && b.tipo_beneficio && f.tipo_beneficio !== b.tipo_beneficio) {
      coincide = false;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'tipo_beneficio', comercio: b.comercio, beneficio_id: b.id,
        descripcion_anterior: b.tipo_beneficio, descripcion_nuevo: f.tipo_beneficio,
        estado: 'pendiente',
        notas: `Fuente: ${f.link_oficial || f.fuente}`,
      });
    }
    const diasBase = [...(b.dias || [])].sort().join(',');
    const diasFuente = [...(f.dias || [])].sort().join(',');
    if (!soloPresencia && diasFuente && diasBase && diasFuente !== diasBase) {
      coincide = false;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'dias', comercio: b.comercio, beneficio_id: b.id,
        descripcion_anterior: diasBase, descripcion_nuevo: diasFuente,
        estado: 'pendiente',
        notas: `Fuente: ${f.link_oficial || f.fuente}`,
      });
    }

    // sello de verificación solo si el dato coincide con la fuente
    if (coincide && !soloPresencia && b.verificado_en !== hoy) {
      campos.verificado_en = hoy;
      resumen.verificados++;
    }
    if (Object.keys(campos).length) updates.push({ id: b.id, campos });
  }

  // ---------- 6. altas: la fuente lo publica y la base no lo tiene ----------
  if (!soloPresencia) {
    for (const [k, f] of porClave) {
      if (emparejados.has(k)) continue;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'alta', comercio: f.comercio, beneficio_id: null,
        porcentaje_nuevo: f.porcentaje,
        descripcion_nuevo: [
          f.porcentaje != null ? `${f.porcentaje}%` : null,
          f.tipo_beneficio,
          f.todos_los_dias ? 'todos los días' : (f.dias || []).join('/'),
          f.vence ? `vence ${f.vence}` : null,
        ].filter(Boolean).join(' · '),
        estado: 'pendiente',
        notas: `Comercio nuevo en el catálogo. Fuente: ${f.link_oficial || f.fuente}`,
      });
    }
  }
}
resumen.encolados = cola.length;

// ---------- reporte ----------
log(`\n=== Diff ${hoy} ===`);
log(`  Leídos por el scraper : ${staging.length}`);
log(`  Activos en la base    : ${beneficios.length}\n`);
log(`  AUTO-APLICA`);
log(`    vencidos dados de baja   : ${resumen.vencidos}`);
log(`    desaparecidos del banco  : ${resumen.desaparecidos}`);
log(`    vigencia extendida       : ${resumen.vigencia_extendida}`);
log(`    links completados        : ${resumen.links_completados}`);
log(`    sellados verificado_en   : ${resumen.verificados}`);
log(`\n  A LA COLA (necesitan tu OK): ${resumen.encolados}`);
for (const t of ['porcentaje', 'dias', 'tipo_beneficio', 'alta']) {
  const n = cola.filter((c) => c.tipo_cambio === t).length;
  if (n) log(`    ${t.padEnd(16)} ${n}`);
}
if (resumen.bancos_frenados.length) {
  log(`\n  FRENO DE MANO — no se dio de baja nada de:`);
  for (const b of resumen.bancos_frenados) log(`    ${b}`);
}

if (DRY) { log('\n(dry-run: no se escribió nada)\n'); process.exit(0); }

// ---------- escritura ----------
if (bajas.length) {
  for (let i = 0; i < bajas.length; i += 300) {
    const lote = bajas.slice(i, i + 300);
    await db.from('auditoria_bajas').insert(
      lote.map((b) => ({ beneficio_id: b.id, motivo: b.motivo, estado_anterior: b.fila }))
    );
    await db.from('beneficios').update({ activo: false }).in('id', lote.map((b) => b.id));
  }
}
for (const u of updates) {
  await db.from('beneficios').update(u.campos).eq('id', u.id);
}
if (cola.length) {
  for (let i = 0; i < cola.length; i += 300) {
    await db.from('cambios_scraping').insert(cola.slice(i, i + 300));
  }
}

log(`\n  Listo. ${bajas.length} bajas, ${updates.length} actualizaciones, ${cola.length} en cola.`);
log(`  Revisá la cola:  select * from cambios_scraping where estado='pendiente';\n`);
