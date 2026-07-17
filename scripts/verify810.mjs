/**
 * Verificación en vivo de la Fase 8.10 (docs/18 V6–V7) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5177 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify810.mjs
 *
 * Comprueba la ceremonia de premios competitivos: que revela un RANKING con
 * nominados ficticios con nombre y tu puesto; que el caso normal (eras
 * tempranas) es "te nominan pero no ganas" y el aspiracional (E7, AAA,
 * prestigio) es el 1.º con confeti; y que el reveal escalonado corre de verdad.
 * Deja las capturas en capturas/8-10-*.png.
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

/** Lee el ranking pintado, tal y como lo ve el jugador. */
const READ_CEREMONY = `(() => {
  const dialog = document.querySelector('[data-testid="awards-modal"]');
  if (!dialog) return null;
  const cats = [...dialog.querySelectorAll('[data-award-category]')].map((li) => ({
    id: li.getAttribute('data-award-category'),
    rank: Number(li.getAttribute('data-award-rank')),
    rows: [...li.querySelectorAll('ol li')].map((r) => r.innerText.replace(/\\n/g, ' ')),
  }));
  return { text: dialog.innerText, cats };
})()`;

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
const tab = await openTab();

// ── 1. El caso normal: te nominan, entras en el ranking, NO ganas ──────────
await tab.goto(`${BASE}/?demo=premios`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const perdiendo = await tab.eval(READ_CEREMONY);
check('la gala se abre aunque NO ganes (docs/18 V7)', perdiendo !== null);
check(
  'el titular muestra tu PUESTO, no un "ganaste"',
  /\d\.º/.test(perdiendo.text) && !perdiendo.text.includes('¡Un premio es tuyo!'),
  perdiendo.text.split('\n').slice(0, 4).join(' / '),
);
const goty = perdiendo.cats.find((c) => c.id === 'goty');
check('te nominan al GOTY pero no ganas', goty !== undefined && goty.rank > 1, `puesto ${goty?.rank}`);
check(
  'el ranking lista 5 candidatos: tú + 4 nominados ficticios',
  goty?.rows.length === 5,
  `filas=${goty?.rows.length}`,
);
check(
  'los nominados ficticios tienen nombre de estudio (industria viva)',
  goty?.rows.some((r) => /Studios|Interactive|Digital|Games|Softworks|Bros|Machine|Bytes|Pixeles|Kraken|Lumen|Nocturno/.test(r)),
  goty?.rows[0],
);
check(
  'tu entrada aparece marcada como tuya en el ranking',
  goty?.rows.some((r) => r.includes('Tu estudio')),
);
await tab.shot('capturas/8-10-gala-ranking.png');

// ── 2. El reveal escalonado corre de verdad (no es CSS muerto) ─────────────
const revealed = await tab.eval(`(() => {
  const li = document.querySelector('[data-award-category]');
  if (!li) return null;
  const cs = getComputedStyle(li);
  return { name: cs.animationName, delay: cs.animationDelay, opacity: Number(cs.opacity) };
})()`);
check(
  'el reveal del ranking está animado y escalonado',
  revealed !== null && revealed.name !== 'none' && revealed.delay !== '0s',
  `anim=${revealed?.name} delay=${revealed?.delay}`,
);
check('y termina visible (la animación no deja el ranking en blanco)', revealed.opacity === 1);

// ── 3. El caso aspiracional: E7 + AAA + prestigio = 1.º con confeti ────────
await tab.goto(`${BASE}/?demo=premios&ganas=1`);
const ganando = await tab.eval(READ_CEREMONY);
const gotyWin = ganando.cats.find((c) => c.id === 'goty');
check('en E7 con escala y prestigio, el GOTY cae: puesto 1.º', gotyWin?.rank === 1, `puesto ${gotyWin?.rank}`);
check(
  'el titular celebra el premio',
  ganando.text.includes('tuyo'),
  ganando.text.split('\n').slice(0, 3).join(' / '),
);
check(
  'el confeti solo se dispara al ganar',
  await tab.eval(`document.querySelector('canvas') !== null`),
);

// El caso de ganar cae en E7, cuya piel es glassmorphism al 8 %: el panel del
// modal DEBE ser opaco o el ranking se lee sobre la Oficina Viva de fondo.
const opacidad = await tab.eval(`(() => {
  const panel = document.querySelector('[data-testid="awards-modal"] .modal-panel');
  if (!panel) return null;
  const bg = getComputedStyle(panel).backgroundColor;
  const m = bg.match(/rgba?\\(([^)]+)\\)/);
  const parts = m ? m[1].split(',').map(Number) : [];
  return { bg, alpha: parts.length === 4 ? parts[3] : 1, era: document.querySelector('.era-E7') !== null };
})()`);
check('la gala se juega en la piel de cristal de E7', opacidad?.era === true);
check(
  'y su panel es opaco: el ranking no se lee sobre la oficina',
  opacidad !== null && opacidad.alpha >= 0.9,
  `${opacidad?.bg}`,
);
await tab.shot('capturas/8-10-gala-ganada.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 8.10 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
