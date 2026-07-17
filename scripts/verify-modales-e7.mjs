/**
 * Auditoría de opacidad de los modales en la piel de E7 (docs/10 §8) vía CDP
 * contra Chrome headless (el Browser pane integrado tiene rAF muerto).
 *
 *   1. npx vite --port 5177 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify-modales-e7.mjs
 *
 * E7 es glassmorphism: `--surface-panel` vale rgba(148,163,184,0.08) y el scrim
 * solo tapa un 65 %, así que cualquier superficie FLOTANTE con `bg-panel` deja
 * ver la Oficina Viva a través de su texto. Todas deben llevar `.modal-panel`.
 * Los paneles en página quedan fuera a propósito: ahí el cristal es el look.
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
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path, Buffer.from(data, 'base64'));
    console.log(`📸 ${path}`);
  }

  async clickText(text, tag = 'button') {
    const rect = await this.eval(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(tag)})];
      const el = els.find((b) => b.textContent.includes(${JSON.stringify(text)}));
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!rect) throw new Error(`No hay ${tag} con texto: ${text}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', {
        type,
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
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

/** Alfa efectivo de la superficie flotante que hay en pantalla. */
const FLOATING_ALPHA = `(() => {
  const el = document.querySelector('.modal-panel');
  if (!el) return { found: false };
  const bg = getComputedStyle(el).backgroundColor;
  const m = bg.match(/rgba?\\(([^)]+)\\)/);
  const parts = m ? m[1].split(',').map(Number) : [];
  return { found: true, bg, alpha: parts.length === 4 ? parts[3] : 1 };
})()`;

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
const tab = await openTab();

/** Cada caso: [nombre, url en E7, apertura opcional]. */
const CASES = [
  ['gala de premios', `${BASE}/?demo=premios&ganas=1`, null],
  ['crisis', `${BASE}/?demo=crisis&era=E7`, null],
  ['aviso importante (P&L)', `${BASE}/?demo=aviso&era=E7`, null],
  ['concepción', `${BASE}/?demo=aciegas&era=E7`, null],
  ['cronología de escala', `${BASE}/?demo=cronologia&eje=escala&era=E7`, null],
  ['guía del tutorial', `${BASE}/?demo=tutorial&era=E7`, null],
  ['menú del HUD', `${BASE}/?demo=studio&era=E7`, '☰ Menú'],
];

for (const [name, url, open] of CASES) {
  await tab.goto(url);
  if (open) await tab.clickText(open);
  const r = await tab.eval(FLOATING_ALPHA);
  const era = await tab.eval(`document.querySelector('.era-E7') !== null`);
  if (!r.found) {
    check(`${name}: hay superficie flotante en pantalla`, false, 'sin .modal-panel');
    continue;
  }
  check(`${name}: opaco sobre el cristal de E7`, era && r.alpha >= 0.9, `${r.bg}`);
}

// Y la prueba de que la regla es la PROFUNDIDAD, no el componente: los paneles
// en página siguen siendo cristal en E7 (ahí el glassmorphism es el look).
await tab.goto(`${BASE}/?demo=studio&era=E7&pantalla=finanzas`);
const enPagina = await tab.eval(`(() => {
  const el = [...document.querySelectorAll('main div')].find((d) =>
    getComputedStyle(d).backgroundColor.startsWith('rgba(148, 163, 184'));
  return el !== undefined;
})()`);
check('los paneles en página conservan el cristal de E7 (no se han tocado)', enPagina);
await tab.shot('capturas/e7-modales-opacos.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Modales opacos en E7' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
