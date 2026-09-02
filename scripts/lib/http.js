const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Algunos servidores paraguayos mandan headers que undici rechaza por estrictos
// ("Unexpected whitespace after header value"). curl los tolera, así que sirve de red.
async function viaCurl(url, timeout, headers = {}) {
  const args = ['-sSL', '--compressed', '-m', String(Math.ceil(timeout / 1000)), '-A', UA];
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  args.push(url);
  const { stdout } = await execFileP('curl', args, {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  });
  return stdout;
}

/** GET con reintentos, timeout y User-Agent de navegador. */
export async function get(url, { tries = 3, timeout = 30000, headers = {}, as = 'text' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, 'Accept-Language': 'es-PY,es;q=0.9', ...headers },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (as === 'json') return await res.json();
      if (as === 'buffer') return Buffer.from(await res.arrayBuffer());
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(1500 * (i + 1));
    } finally {
      clearTimeout(t);
    }
  }
  // Último intento: curl
  try {
    const buf = await viaCurl(url, timeout, headers);
    if (buf.length) {
      if (as === 'buffer') return buf;
      const txt = buf.toString('utf8');
      return as === 'json' ? JSON.parse(txt) : txt;
    }
  } catch {}
  throw new Error(
    `${url} -> ${lastErr.message}${lastErr.cause ? ' (' + (lastErr.cause.code || lastErr.cause.message) + ')' : ''}`
  );
}

/** Corre tareas en paralelo con un techo de concurrencia. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = { ok: true, value: await fn(items[idx], idx) };
        } catch (e) {
          out[idx] = { ok: false, error: e.message };
        }
      }
    })
  );
  return out;
}
