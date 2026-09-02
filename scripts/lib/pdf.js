import { get } from './http.js';

/** Descarga un PDF y devuelve su texto plano (todas las páginas, espacios normalizados). */
export async function textoDePdf(url, { timeout = 60000 } = {}) {
  const buf = await get(url, { as: 'buffer', timeout, tries: 2 });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true, verbosity: 0 }).promise;
  let txt = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    txt += tc.items.map((i) => i.str).join(' ') + '\n';
  }
  return txt.replace(/\s+/g, ' ').trim();
}
