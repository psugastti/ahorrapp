// Navegador headless para las fuentes con anti-bot o render por JS (GNB, Itaú).
// Se carga en forma perezosa para que los scrapers simples no dependan de Playwright.
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright');
      return chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
    })().catch((e) => {
      // si Chrome no está instalado (ej. la Mac sin deps), no se reintenta ni
      // se deja una promesa colgada: el banco falla solo y la corrida sigue
      browserPromise = null;
      throw new Error(`navegador no disponible: ${e.message.split('\n')[0]}`);
    });
  }
  return browserPromise;
}

/** Abre la URL en Chrome headless y devuelve el HTML ya renderizado. */
export async function conNavegador(url, { esperar = null, timeout = 45000 } = {}) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'es-PY',
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    if (esperar) {
      await page.waitForSelector(esperar, { timeout: 15000 }).catch(() => {});
    }
    await page.waitForTimeout(2500);
    return await page.content();
  } finally {
    await ctx.close();
  }
}

export async function cerrarNavegador() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    /* nunca romper el cierre de la corrida */
  }
  browserPromise = null;
}
