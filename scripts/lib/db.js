import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga scripts/.env si existe (para correr local). En CI vienen del runner.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const PROJECT_ID = 'itbwqrclualkitsjkyta';
const URL_BASE = process.env.SUPABASE_URL || `https://${PROJECT_ID}.supabase.co`;

// Cliente perezoso: --dry-run no necesita credenciales.
let _client = null;
function cliente() {
  if (!_client) {
    const KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!KEY) {
      console.error(
        '\nFalta SUPABASE_SERVICE_KEY.\n' +
          '  Local: creá scripts/.env con  SUPABASE_SERVICE_KEY=eyJ...\n' +
          '  CI:    cargalo como secret del repo en GitHub.\n' +
          '  Se saca de Supabase > Project Settings > API > service_role.\n'
      );
      process.exit(1);
    }
    _client = createClient(URL_BASE, KEY, { auth: { persistSession: false } });
  }
  return _client;
}

export const db = {
  from: (t) => cliente().from(t),
  rpc: (...a) => cliente().rpc(...a),
};

/** Trae todas las filas paginando (Supabase corta en 1000). */
export async function selectAll(tabla, columnas, filtro = (q) => q) {
  const out = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await filtro(db.from(tabla).select(columnas)).range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
