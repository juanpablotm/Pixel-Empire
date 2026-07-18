/**
 * Verificación en vivo de la Fase 9.1 (docs/19 §9.1) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5177 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify91.mjs
 *
 * Comprueba las dos galas de la escalada (?demo=escalada[&madura=1]): que un
 * primer juego humilde se REENCUADRA como logro (récord personal) con su techo
 * de madurez explicado, y que la reseña madura luce las líneas nuevas del
 * desglose (techo, alcance, listón de época, fatiga, banda) con sus cifras.
 * Deja las capturas en capturas/9-1-*.png.
 */
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';

const BASE = 'http://localhost:5177';
const CDP = 'http://127.0.0.1:9333';

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
    // Página completa: el desglose de la gala no cabe en un viewport.
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

/** Espera al acto final de la gala (verdict + desglose) y lee lo que ve el jugador. */
const READ_GALA = `(() => {
  const main = document.querySelector('#root main');
  if (!main) return null;
  const lines = [...main.querySelectorAll('[data-tour="review-breakdown"] li')].map((li) =>
    li.innerText.replace(/\\n/g, ' '),
  );
  const game = window.useGameStore.getState().game.releasedGames.at(-1);
  return {
    text: main.innerText,
    lines,
    review: game.review,
    quality: game.quality,
    cap: game.breakdown.qualityCap,
    capBinding: game.breakdown.capBinding,
    banda: game.reviewMarket.banda,
    fatiga: game.reviewMarket.fatiga,
    personalBest: game.personalBest,
  };
})()`;

async function waitGala(tab) {
  for (let i = 0; i < 30; i++) {
    const done = await tab.eval(
      `document.querySelector('#root main')?.innerText.includes('Volver al estudio') ?? false`,
    );
    if (done) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('La gala no llegó al acto final');
}

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
const tab = await openTab();

// ── 1. La reseña TEMPRANA humilde: el 45-55 como logro (docs/19 §9.1) ───────
await tab.goto(`${BASE}/?demo=escalada`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);
await waitGala(tab);

const temprana = await tab.eval(READ_GALA);
check('la gala temprana monta con su desglose', temprana !== null && temprana.lines.length > 0);
check(
  'la nota es humilde (el 88 al arranque es imposible)',
  temprana.review <= 60,
  `reseña ${temprana.review} / Q ${temprana.quality}`,
);
check(
  'el techo dinámico manda y es el de un estudio verde',
  temprana.cap <= 55 && temprana.capBinding === 'madurez',
  `techo ${temprana.cap} (${temprana.capBinding})`,
);
check(
  'la gala lo REENCUADRA como logro: récord personal visible',
  temprana.personalBest === true && temprana.text.includes('mejor juego hasta ahora'),
);
check(
  'el desglose explica el techo sin tecnicismos',
  temprana.lines.some((l) => /techo|listón de lo posible/i.test(l)),
  temprana.lines.find((l) => /techo/i.test(l)),
);
check(
  'la banda tiene línea propia y cifra en los ajustes (+2)',
  temprana.banda === 2 && temprana.text.includes('Gusto del momento'),
  `banda ${temprana.banda}`,
);
await tab.shot('capturas/9-1-resena-temprana.png');

// ── 2. La reseña MADURA: techo alto, fatiga de fórmula y banda en contra ────
await tab.goto(`${BASE}/?demo=escalada&madura=1`);
await waitGala(tab);
const madura = await tab.eval(READ_GALA);
check('la gala madura monta con su desglose', madura !== null && madura.lines.length > 0);
check(
  'el techo de un estudio hecho y derecho es alto',
  madura.cap >= 75,
  `techo ${madura.cap} (${madura.capBinding})`,
);
check('la Q madura supera de largo a la temprana', madura.quality >= temprana.quality + 15);
check(
  'la fatiga de fórmula pega y se explica (secuela III)',
  (madura.fatiga ?? 0) > 0 && madura.lines.some((l) => /fórmula/i.test(l)),
  `fatiga −${madura.fatiga}`,
);
check(
  'la banda en contra también se explica (−2)',
  madura.banda === -2 && madura.lines.some((l) => /humor del mercado/i.test(l)),
  `banda ${madura.banda}`,
);
check(
  'los ajustes de mercado listan fatiga y gusto con sus cifras',
  madura.text.includes('Fatiga de fórmula') && madura.text.includes('Gusto del momento'),
);
await tab.shot('capturas/9-1-resena-madura.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.1 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
