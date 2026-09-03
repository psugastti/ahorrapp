#!/usr/bin/env node
/**
 * Compara staging_scrape (lo que dicen los bancos hoy) contra beneficios (lo que
 * muestra la app) y decide qué hacer con cada diferencia.
 *
 * AUTO-APLICA (reversible, siempre con respaldo en auditoria_bajas):
 *   - vencidos: activo=true y vence < hoy
 *   - vigencia extendida por la fuente
 *   - completar link_oficial / url_bases vacíos
 *   - sellar verificado_en cuando el dato coincide
 *
 * ENCOLA en cambios_scraping (requiere aprobación de Pablo):
 *   - comercios que ya no figuran en el catálogo (depende de emparejar nombres,
 *     que es frágil: un cambio de rótulo del banco parece un cierre)
 *   - cambios de porcentaje, días o tipo de beneficio
 *   - comercios nuevos que la fuente publica y la base no tiene
 *
 * FRENOS DE MANO para las bajas: un banco solo puede aportar bajas si el scraper
 * leyó al menos el 90% de lo que tiene cargado Y empareja por nombre al menos el
 * 80% de sus comercios. Si no, lo que falta es cobertura del scraper, no comercios
 * cerrados.
 */
import { db, selectAll } from './lib/db.js';
import { claveComercio, claveBase } from './lib/normalize.js';

const DRY = process.argv.includes('--dry-run');
const hoy = new Date().toISOString().slice(0, 10);
// Umbrales para permitir BAJAS. Son altos a propósito: concluir que un comercio
// dejó de existir exige haber leído el catálogo entero, no una parte. Familiar
// publica 425 beneficios y el scraper ve 316 (los que enlazan bases en PDF): con
// un umbral bajo, los 109 que no lee parecían cerrados y no lo están.
const UMBRAL_COBERTURA = 0.9;   // leído / cargado en base
const UMBRAL_EMPAREJADOS = 0.8; // cuántos de la base encuentro por nombre

const log = (...a) => console.log(...a);
const resumen = {
  vencidos: 0, desaparecidos: 0, vigencia_corregida: 0, topes_completados: 0, dias_completados: 0, tipo_corregido: 0,
  links_completados: 0, verificados: 0, encolados: 0, bancos_frenados: [],
};

// ---------- datos ----------
const staging = await selectAll('staging_scrape', '*');
const beneficios = await selectAll(
  'beneficios',
  'id,comercio,banco_id,porcentaje,tipo_beneficio,dias,todos_los_dias,vence,activo,link_oficial,url_bases,verificado_en,observacion,nivel_min,tope_monto,tope_periodo',
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

  // freno 1: cobertura. Si no leí casi todo el catálogo, no puedo saber qué falta.
  const cobertura = enBase.length === 0 ? 1 : filas.length / enBase.length;
  let puedeDarDeBaja = cobertura >= UMBRAL_COBERTURA;
  if (!puedeDarDeBaja) {
    resumen.bancos_frenados.push(
      `${nombre}: leyó ${filas.length} de ${enBase.length} (${Math.round(cobertura * 100)}%)`
    );
  }

  // Se indexa por la clave completa y por la clave sin sufijo de local, porque
  // varios bancos publican "COMERCIO-SHOPPING X" y la base guarda solo "Comercio".
  // NUNCA se usa f.clave: esa la genera Postgres con otra regla y no empareja.
  // Si el scraper de este banco distingue tramos de tarjeta (Interfisa emite una
  // fila por afinidad con nivel_min), la clave incluye el tramo: así la fila
  // "Cole Haan · Platinum+" no pisa a "Cole Haan · cualquier tarjeta".
  const conTramos = filas.some((f) => f.payload?.nivel_min != null);
  const nivelDe = (x) => (conTramos ? `|n${x?.nivel_min ?? ''}` : '');
  const porClave = new Map();
  for (const f of filas) {
    const suf = nivelDe(f.payload);
    for (const k of [claveComercio(f.comercio) + suf, claveBase(f.comercio) + suf]) {
      if (k && !porClave.has(k)) porClave.set(k, f);
    }
  }
  const buscar = (b) => {
    const suf = nivelDe(b);
    return porClave.get(claveComercio(b.comercio) + suf) ?? porClave.get(claveBase(b.comercio) + suf);
  };

  // freno 2: si el emparejamiento por nombre falla en masa, no son bajas reales,
  // es que cambió el formato del sitio (o la normalización de nombres).
  if (puedeDarDeBaja && enBase.length >= 20) {
    const emparejables = enBase.filter((b) => buscar(b)).length;
    if (emparejables / enBase.length < UMBRAL_EMPAREJADOS) {
      puedeDarDeBaja = false;
      resumen.bancos_frenados.push(
        `${nombre}: emparejó ${emparejables} de ${enBase.length} por nombre ` +
          `(${Math.round((emparejables / enBase.length) * 100)}%)`
      );
    }
  }

  const emparejadas = new Set(); // filas de la fuente que ya matchearon con la base

  for (const b of enBase) {
    if (yaDeBaja.has(b.id)) continue;
    const f = buscar(b);

    if (!f) {
      // "Desapareció del catálogo" es la única conclusión que depende de emparejar
      // nombres, y el emparejamiento por nombre es frágil (un banco cambia el rótulo
      // y parece que cerró el comercio). Va a la cola, no se aplica solo.
      if (puedeDarDeBaja) {
        cola.push({
          fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
          tipo_cambio: 'baja', comercio: b.comercio, beneficio_id: b.id,
          porcentaje_anterior: b.porcentaje,
          descripcion_anterior: `${b.porcentaje ?? '?'}% · ${b.tipo_beneficio ?? ''}`.trim(),
          descripcion_nuevo: 'ya no figura en el catálogo del banco',
          estado: 'pendiente',
          notas: `[scraper] No apareció en la lectura del ${hoy}. Verificar antes de dar de baja.`,
        });
        resumen.desaparecidos++;
      }
      continue;
    }
    emparejadas.add(f);

    const campos = {};
    let coincide = true;

    // vigencia: la fecha textual de la fuente manda, se acorte o se extienda
    if (f.vence && f.vence >= hoy && f.vence !== b.vence) {
      campos.vence = f.vence;
      resumen.vigencia_corregida++;
    }
    // completar huecos con datos textuales de la fuente (nunca pisar lo cargado)
    const p = f.payload ?? {};
    if (b.tope_monto == null && p.tope_monto != null) {
      campos.tope_monto = p.tope_monto;
      if (p.tope_periodo) campos.tope_periodo = p.tope_periodo;
      resumen.topes_completados++;
    }
    if (!(b.dias || []).length && !b.todos_los_dias && ((p.dias || []).length || p.todos_los_dias)) {
      campos.dias = p.dias || [];
      campos.todos_los_dias = !!p.todos_los_dias;
      resumen.dias_completados++;
    }
    // completar huecos, nunca pisar lo que ya hay
    if (!b.link_oficial && f.link_oficial) { campos.link_oficial = f.link_oficial; resumen.links_completados++; }
    if (!b.url_bases && f.url_bases) { campos.url_bases = f.url_bases; resumen.links_completados++; }

    // --- lo que NO se toca solo ---
    // Varios bancos publican tramos ("20% o 25% según tu tarjeta"). Si lo que tiene
    // la base es uno de esos tramos, no cambió nada: el scraper solo vio el otro.
    const tramos = f.payload?.porcentajes ?? (f.porcentaje != null ? [f.porcentaje] : []);
    const yaEsUnTramo = b.porcentaje != null && tramos.includes(b.porcentaje);

    if (!soloPresencia && f.porcentaje != null && b.porcentaje != null &&
        f.porcentaje !== b.porcentaje && !yaEsUnTramo) {
      coincide = false;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'porcentaje', comercio: b.comercio, beneficio_id: b.id,
        porcentaje_anterior: b.porcentaje, porcentaje_nuevo: f.porcentaje,
        descripcion_anterior: `${b.porcentaje}%`, descripcion_nuevo: `${f.porcentaje}%`,
        estado: 'pendiente',
        notas:
          `[scraper] Detectado por scraper automático.` +
          (tramos.length > 1 ? ` La fuente publica tramos: ${tramos.join('% / ')}%.` : '') +
          ` Fuente: ${f.link_oficial || f.fuente}`,
      });
    }
    // "descuento → reintegro" se aplica solo cuando la fuente lo dice textualmente
    // ("20% de reintegro"): mismo criterio que la vigencia. Para el usuario no es lo
    // mismo (el reintegro llega después, al extracto) y la base lo tenía mal en ~165.
    // Queda registrado en la cola como 'aplicado_auto' para que haya rastro.
    const textoFuente = `${f.payload?.observacion ?? ''} ${f.payload?.tipo_beneficio ?? ''}`;
    const reintegroTextual =
      f.tipo_beneficio === 'reintegro' && b.tipo_beneficio === 'descuento' && /reintegro/i.test(textoFuente);
    if (!soloPresencia && reintegroTextual) {
      campos.tipo_beneficio = 'reintegro';
      resumen.tipo_corregido++;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'tipo_beneficio', comercio: b.comercio, beneficio_id: b.id,
        descripcion_anterior: 'descuento', descripcion_nuevo: 'reintegro',
        estado: 'aplicado_auto',
        notas: `[scraper] La fuente dice "reintegro" textualmente. Fuente: ${f.link_oficial || f.fuente}`,
      });
    } else if (!soloPresencia && f.tipo_beneficio && b.tipo_beneficio && f.tipo_beneficio !== b.tipo_beneficio) {
      coincide = false;
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'tipo_beneficio', comercio: b.comercio, beneficio_id: b.id,
        descripcion_anterior: b.tipo_beneficio, descripcion_nuevo: f.tipo_beneficio,
        estado: 'pendiente',
        notas: `[scraper] Fuente: ${f.link_oficial || f.fuente}`,
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
        notas: `[scraper] Fuente: ${f.link_oficial || f.fuente}`,
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
    const yaVisto = new Set();
    for (const f of filas) {
      if (emparejadas.has(f)) continue;
      // una fila por comercio: la fuente puede repetir el mismo local
      const kf = claveComercio(f.comercio) + nivelDe(f.payload);
      if (yaVisto.has(kf)) continue;
      yaVisto.add(kf);
      cola.push({
        fecha: hoy, banco_id: bancoId, banco_nombre: nombre,
        tipo_cambio: 'alta', comercio: f.comercio, beneficio_id: null,
        porcentaje_nuevo: f.porcentaje,
        payload: f.payload ?? null,
        descripcion_nuevo: [
          f.porcentaje != null ? `${f.porcentaje}%` : null,
          f.tipo_beneficio,
          f.payload?.nivel_min ? `nivel ${f.payload.nivel_min}+` : null,
          f.payload?.tope_monto ? `tope ${f.payload.tope_monto.toLocaleString('es-PY')}` : null,
          f.todos_los_dias ? 'todos los días' : (f.dias || []).join('/'),
          f.vence ? `vence ${f.vence}` : null,
        ].filter(Boolean).join(' · '),
        estado: 'pendiente',
        notas: `[scraper] Comercio nuevo en el catálogo. Fuente: ${f.link_oficial || f.fuente}`,
      });
    }
  }
}
resumen.encolados = cola.filter((c) => c.estado === 'pendiente').length;

// ---------- reporte ----------
log(`\n=== Diff ${hoy} ===`);
log(`  Leídos por el scraper : ${staging.length}`);
log(`  Activos en la base    : ${beneficios.length}\n`);
log(`  AUTO-APLICA`);
log(`    vencidos dados de baja   : ${resumen.vencidos}`);
log(`    vigencia corregida       : ${resumen.vigencia_corregida}`);
log(`    topes completados        : ${resumen.topes_completados}`);
log(`    días completados         : ${resumen.dias_completados}`);
log(`    descuento→reintegro      : ${resumen.tipo_corregido}  (la fuente lo dice textual)`);
log(`    links completados        : ${resumen.links_completados}`);
log(`    sellados verificado_en   : ${resumen.verificados}`);
log(`\n  A LA COLA (necesitan tu OK): ${resumen.encolados}`);
for (const t of ['baja', 'porcentaje', 'dias', 'tipo_beneficio', 'alta']) {
  const n = cola.filter((c) => c.tipo_cambio === t && c.estado === 'pendiente').length;
  if (n) log(`    ${t.padEnd(16)} ${n}`);
}
if (resumen.bancos_frenados.length) {
  log(`\n  FRENO DE MANO — no se dio de baja nada de:`);
  for (const b of resumen.bancos_frenados) log(`    ${b}`);
}

if (DRY) { log('\n(dry-run: no se escribió nada)\n'); process.exit(0); }

// ---------- escritura ----------
// Cada corrida re-evalúa TODO contra la fuente, así que la cola pendiente de la corrida
// anterior queda vieja: se marca 'superado' (no se borra, queda el historial). Lo que
// Pablo ya aprobó o rechazó no se toca porque ya no está en 'pendiente'.
{
  const { data: viejos } = await db
    .from('cambios_scraping')
    .select('id')
    .eq('estado', 'pendiente')
    .like('notas', '[scraper]%');
  if (viejos?.length) {
    await db
      .from('cambios_scraping')
      .update({ estado: 'superado' })
      .in('id', viejos.map((v) => v.id));
    log(`  ${viejos.length} pendientes de corridas anteriores marcados como superados.`);
  }
}

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
