/**
 * Verificación en vivo de la Fase 9.6 (docs/19 §9.6) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5178 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9334 --window-size=1440,900
 *   3. node scripts/verify96.mjs
 *
 * Comprueba el paso "¿Quién publica?" del Concepto (?demo=publisher): la
 * tarjeta de auto-publicarse frente a las ofertas leoninas de 1980, la firma
 * real (adelanto a caja, trato congelado) — y el estado de un juego en ACCESO
 * ANTICIPADO (?demo=publisher&ea=1): compradores, ingresos y el reloj de
 * paciencia. Deja las capturas en capturas/9-6-*.png.
 */
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';

const BASE = 'http://localhost:5178';
const CDP = 'http://127.0.0.1:9334';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // aún no
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No responde: ${url}`);
}

class Tab {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(
          msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text,
        );
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => reject(new Error(`timeout ${method}`)), 30000);
    });
  }

  async goto(url, settleMs = 400) {
    await this.send('Page.navigate', { url });
    for (let i = 0; i < 40; i++) {
      try {
        const ready = await this.eval(`document.querySelector('#root main, #root header') !== null`);
        if (ready) {
          await new Promise((r) => setTimeout(r, settleMs));
          return;
        }
      } catch {
        // contexto de ejecución cambiando durante la navegación: reintentar
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`La app no montó en: ${url}`);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? 'excepción en la página');
    }
    return res.result.value;
  }

  async shot(path) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    writeFileSync(path, Buffer.from(data, 'base64'));
    console.log(`📸 ${path}`);
  }
}

async function openTab() {
  const res = await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' });
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  const tab = new Tab(ws);
  await tab.send('Page.enable');
  await tab.send('Runtime.enable');
  return tab;
}

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
const tab = await openTab();

// ── 1. "¿Quién publica?" en el Concepto (?demo=publisher) ────────────────────
await tab.goto(`${BASE}/?demo=publisher`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const concept = await tab.eval(`(() => {
  const dialog = document.querySelector('[role="dialog"][aria-label="Nuevo juego"]');
  // textContent (no innerText): innerText aplica el text-transform de los
  // rótulos y rompería los includes con caja (lección de verify93).
  return dialog ? dialog.textContent : null;
})()`);
check('el modal de concepción monta', concept !== null);
check('existe el paso "¿Quién publica?"', concept.includes('¿Quién publica?'));
check(
  'la tarjeta de auto-publicarse deja claro el trato (todo tuyo, todo el riesgo)',
  concept.includes('Auto-publicado') && concept.includes('te quedas el 100 %'),
);
check(
  'las ofertas de 1980 están sobre la mesa (Magnavista y Cartucho Bros.)',
  concept.includes('Magnavista Corp') && concept.includes('Cartucho Bros.'),
);
check(
  'cada oferta enseña adelanto, reparto y distribución',
  concept.includes('adelanto de') &&
    concept.includes('% de las ventas, para siempre') &&
    concept.includes('% de alcance'),
);
check(
  'la letra pequeña se ve: IP y exclusividad de plataforma',
  concept.includes('Se queda la IP del juego') &&
    concept.includes('Exclusiva: una sola plataforma'),
);

// Seleccionar la oferta de Magnavista: el pie resume el trato elegido.
await tab.eval(`(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')]
    .find((b) => b.textContent.includes('Magnavista Corp'));
  btn.click();
})()`);
await new Promise((r) => setTimeout(r, 300));
const footer = await tab.eval(
  `document.querySelector('[role="dialog"][aria-label="Nuevo juego"]').textContent`,
);
check(
  'con la oferta elegida, el pie resume: adelanto YA y tu 25 %',
  footer.includes('Magnavista Corp: +') && footer.includes('te quedas el 25 %'),
);
// Las tarjetas viven bajo el pliegue del scroll interno del modal: se centran
// antes de la foto (captureBeyondViewport no despliega scrollers internos).
await tab.eval(
  `document.querySelector('[data-tour="publisher-pick"]').scrollIntoView({ block: 'center' })`,
);
await new Promise((r) => setTimeout(r, 300));
await tab.shot('capturas/9-6-publisher-oferta.png');

// La FIRMA de verdad (store → núcleo): adelanto a caja y trato congelado.
const signed = await tab.eval(`(() => {
  const store = window.useGameStore.getState();
  const before = store.game.studio.capital;
  store.startProject({
    name: 'Cintas del Abismo',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'amplio',
    size: 'pequeno',
    publisherId: 'magnavista',
  });
  const after = window.useGameStore.getState().game;
  const deal = after.projects[0]?.publisherDeal ?? null;
  return {
    capitalDelta: after.studio.capital - before,
    deal,
    deals: after.stats.publisherDeals ?? 0,
    logged: after.log.some((e) => e.text.includes('se firma con Magnavista')),
  };
})()`);
check(
  'firmar ingresa el adelanto entero (el arranque lo paga el publisher)',
  signed.deal !== null && signed.capitalDelta === signed.deal.advance,
  `Δcapital=${signed.capitalDelta}`,
);
check(
  'el trato queda congelado en el proyecto (75 %, IP y bolsa)',
  signed.deal !== null &&
    signed.deal.revShare === 0.75 &&
    signed.deal.keepsIp === true &&
    signed.deal.marketingBudgetLeft > 0,
);
check('el arco cuenta el trato y el historial lo nombra', signed.deals === 1 && signed.logged);

// ── 2. Un juego en ACCESO ANTICIPADO (?demo=publisher&ea=1) ──────────────────
await tab.goto(`${BASE}/?demo=publisher&ea=1`);
await new Promise((r) => setTimeout(r, 600));
const ea = await tab.eval(`(() => {
  const dialog = document.querySelector('[role="dialog"][aria-label^="Desarrollo"]');
  return dialog ? dialog.textContent : null;
})()`);
check('la ventana de desarrollo monta con el panel de Publicación', ea !== null && ea.includes('Publicación'));
check('el estado EA es visible: semanas y compradores de la promesa',
  ea.includes('En ACCESO ANTICIPADO') && ea.includes('46 semanas abierto') && ea.includes('15.400'));
check('los ingresos adelantados se enseñan', ea.includes('216.000'));
check(
  'el reloj de paciencia avisa (quedan 6 semanas)',
  ea.includes('La comunidad espera la 1.0: 6 semanas de paciencia'),
);
check(
  'el trade-off queda explicado: feedback ahora, pico recortado después',
  ea.includes('el feedback pule el juego') && ea.includes('restan del pico'),
);
await tab.shot('capturas/9-6-early-access.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.6 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
