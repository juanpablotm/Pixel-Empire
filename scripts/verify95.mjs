/**
 * Verificación en vivo de la Fase 9.5 (docs/19 §9.5) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5178 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9334 --window-size=1440,900
 *   3. node scripts/verify95.mjs
 *
 * Comprueba el panel de INDUSTRIA (?demo=industria): ranking con tiers y
 * momento, calendario de lanzamientos anunciados con el aviso ⚠ de ventana
 * disputada contra tu proyecto, lanzamientos recientes (con 🔥 de fiebre) y
 * los cierres. Y la GALA con nominados reales (?demo=industria&premios=1):
 * los juegos del año de la industria compiten contigo por el ranking. Deja
 * las capturas en capturas/9-5-*.png.
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

// ── 1. El panel de Industria (?demo=industria) ───────────────────────────────
await tab.goto(`${BASE}/?demo=industria`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const panel = await tab.eval(`(() => {
  const main = document.querySelector('#root main');
  const store = window.useGameStore.getState();
  // textContent (no innerText): innerText aplica el text-transform de los
  // rótulos y rompería los includes con caja (lección de verify93).
  return {
    text: main ? main.textContent : '',
    studios: (store.game.rivals?.studios ?? []).length,
    announced: (store.game.rivals?.studios ?? []).filter((r) => r.nextRelease !== null).length,
  };
})()`);
check('el estado tiene la industria sembrada (9 estudios)', panel.studios === 9, `estudios=${panel.studios}`);
check(
  'el ranking nombra estudios con su tier (Mango gigante, Wolfbyte medio)',
  panel.text.includes('Ranking de la industria') &&
    panel.text.includes('Mango Interactive') &&
    panel.text.includes('Gigante') &&
    panel.text.includes('Wolfbyte Studios'),
);
check('tu estudio aparece en el mismo ranking', panel.text.includes('Tu estudio'));
check(
  'el calendario enseña los lanzamientos ANUNCIADOS con su campaña',
  panel.text.includes('Próximos lanzamientos anunciados') &&
    panel.text.includes('Sombras de Hierro') &&
    panel.text.includes('campaña masiva'),
);
check(
  'la ventana disputada avisa del choque con tu proyecto (⚠)',
  panel.text.includes('«Némesis Solar» apunta a esa misma ventana'),
);
check(
  'los lanzamientos recientes llevan reseña y el 🔥 de la fiebre encendida',
  panel.text.includes('Lanzamientos recientes') &&
    panel.text.includes('Réquiem de Neón') &&
    panel.text.includes('El Jardín Vertical') &&
    panel.text.includes('🔥'),
);
check('los cierres se recuerdan (Tortuga Bros.)', panel.text.includes('Cerraron: Tortuga Bros.'));
await tab.shot('capturas/9-5-industria.png');

// ── 2. La gala con nominados REALES (?demo=industria&premios=1) ──────────────
await tab.goto(`${BASE}/?demo=industria&premios=1`);
await new Promise((r) => setTimeout(r, 600));
const gala = await tab.eval(`(() => {
  const dialog = document.querySelector('[data-testid="awards-modal"]');
  const store = window.useGameStore.getState();
  const goty = store.game.studio.lastCeremony?.categories.find((c) => c.categoryId === 'goty');
  return dialog
    ? {
        text: dialog.textContent,
        rank: goty?.rank ?? null,
        nominees: goty?.nominees.map((n) => n.studio) ?? [],
      }
    : null;
})()`);
check('la gala monta', gala !== null);
check(
  'los nominados son los estudios RIVALES reales del año',
  gala.nominees.includes('Aurora Machine') && gala.nominees.includes('Mango Interactive'),
  gala.nominees.join(' | '),
);
check(
  'el ranking del modal nombra sus juegos («Réquiem de Neón», «Coloso del Alba»)',
  gala.text.includes('Réquiem de Neón') && gala.text.includes('Coloso del Alba'),
);
check('tu puesto queda a mitad de tabla (caso realista de E5)', gala.rank !== null && gala.rank > 1,
  `rank=${gala.rank}`);
await tab.shot('capturas/9-5-premios-rivales.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.5 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
