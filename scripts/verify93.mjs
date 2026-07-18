/**
 * Verificación en vivo de la Fase 9.3 (docs/19 §9.3) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5177 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify93.mjs
 *
 * Comprueba el panel de features del Concepto (?demo=features): badges de
 * encaje verde/ámbar/rojo, el ❓ de lo aún por descubrir, los grupos de
 * variantes excluyentes (elegir una desmarca la otra, de verdad, vía núcleo)
 * y el bloqueo de misfits con más bugs; y el desglose (?demo=features&
 * desglose=1): la línea "Features que no pegan" nombra las piezas fuera de
 * sitio. Deja las capturas en capturas/9-3-*.png.
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

// ── 1. El panel de features del Concepto (?demo=features) ───────────────────
await tab.goto(`${BASE}/?demo=features`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const panel = await tab.eval(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  return { text: dialog.innerText };
})()`);
check('el modal de desarrollo (Concepto) monta con el panel de features', panel !== null);
check(
  'los badges de encaje hablan del género elegido (verde/ámbar/rojo)',
  panel.text.includes('Encaja con Aventura') &&
    panel.text.includes('No pega con Aventura') &&
    panel.text.includes('Ni fu ni fa en Aventura'),
);
check(
  'el encaje aún no vivido sale como ❓ (el conocimiento se gana, docs/17 P2)',
  panel.text.includes('Encaje por descubrir'),
);
check(
  'los grupos de variantes anuncian el trade-off excluyente',
  // innerText refleja el text-transform:uppercase del rótulo: sin caja.
  /trade-off: elige una variante/i.test(panel.text) &&
    panel.text.includes('Mundo abierto artesanal') &&
    panel.text.includes('Mundo procedural') &&
    panel.text.includes('Voz digitalizada') &&
    panel.text.includes('Doblaje completo'),
);
// Centrar el panel de features (el modal tiene scroll interno): que la
// captura luzca los badges, el ❓ y los grupos de variantes.
await tab.eval(`(() => {
  const rotulo = [...document.querySelectorAll('p')].find((p) => /trade-off: elige una/i.test(p.innerText));
  rotulo?.scrollIntoView({ block: 'center' });
  return true;
})()`);
await new Promise((r) => setTimeout(r, 300));
await tab.shot('capturas/9-3-features-encaje.png');

// ── 2. La exclusión de variantes es del núcleo (elegir una desmarca la otra) ─
const variantes = await tab.eval(`(() => {
  const store = window.useGameStore;
  const before = store.getState().game.projects[0];
  store.getState().toggleFeature('mapaProcedural', 'demo-proj');
  const after = store.getState().game.projects[0];
  return {
    antes: before.chosenFeatureIds,
    despues: after.chosenFeatureIds,
    bugsAntes: before.bugDebt,
    bugsDespues: after.bugDebt,
  };
})()`);
check(
  'elegir la variante procedural desmarca el mundo abierto artesanal',
  variantes.antes.includes('mundoAbierto') &&
    variantes.despues.includes('mapaProcedural') &&
    !variantes.despues.includes('mundoAbierto'),
  `antes=[${variantes.antes}] después=[${variantes.despues}]`,
);
check(
  'la variante que NO pega (procedural en aventura) mete más bugs que la que pega',
  // artesanal encaja (0.25·1.3 = 0.325); procedural no pega (0.15·1.3·1.75 ≈ 0.341)
  variantes.bugsDespues > variantes.bugsAntes,
  `bugs ${variantes.bugsAntes.toFixed(3)} → ${variantes.bugsDespues.toFixed(3)}`,
);

// ── 3. El desglose nombra las piezas fuera de sitio (&desglose=1) ───────────
await tab.goto(`${BASE}/?demo=features&desglose=1`);
// La gala se revela por actos: un clic la salta al acto final (ReviewScreen).
// Se clica el propio rótulo "clic para saltar" para burbujear al <main> de la
// gala (hay más de un <main> en el layout); si aún no montó, se reintenta.
let saltada = false;
for (let i = 0; i < 12 && !saltada; i++) {
  saltada = await tab.eval(`(() => {
    const hint = [...document.querySelectorAll('p')].find((p) => p.innerText.includes('clic para saltar'));
    if (!hint) return false;
    hint.click();
    return true;
  })()`);
  if (!saltada) await new Promise((r) => setTimeout(r, 400));
}
check('la ceremonia se puede saltar con un clic', saltada);
await new Promise((r) => setTimeout(r, 1200));
const gala = await tab.eval(`(() => {
  const main = document.querySelector('#root');
  const game = window.useGameStore.getState().game.releasedGames.find((g) => g.id === 'demo-93');
  return {
    text: main.innerText,
    linea: game.lines.find((l) => l.factor === 'features'),
    featureParts: game.breakdown.featureParts,
  };
})()`);
check(
  'la línea de features es "Features que no pegan" y en tono ✘',
  gala.linea?.title === 'Features que no pegan' && gala.linea?.tone === 'bad',
);
check(
  'nombra las piezas fuera de sitio y el género (Pilar 2)',
  gala.linea?.detail.includes('Multijugador local') &&
    gala.linea?.detail.includes('Editor de niveles') &&
    gala.linea?.detail.includes('Aventura'),
  gala.linea?.detail,
);
check(
  'la gala en pantalla muestra la línea al jugador',
  gala.text.includes('Features que no pegan'),
);
check(
  'el breakdown congela el encaje de cada feature elegida',
  Array.isArray(gala.featureParts) &&
    gala.featureParts.some((p) => p.id === 'multijugadorLocal' && p.affinity === 'noEncaja') &&
    gala.featureParts.some((p) => p.id === 'finalRamificado' && p.affinity === 'encaja'),
);
await tab.shot('capturas/9-3-desglose-features.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.3 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
