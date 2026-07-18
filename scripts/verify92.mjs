/**
 * Verificación en vivo de la Fase 9.2 (docs/19 §9.2) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5177 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify92.mjs
 *
 * Comprueba el taller de motores (?demo=motores): el motor propio envejecido
 * con su estado frente a la época, la obra de mejora con su coste (💰 + 💡 +
 * semanas) y el catálogo licenciable con royalty; y la elección de motor al
 * concebir (?demo=motores&concebir=1): adecuación SIEMPRE visible, royalty
 * del licenciado y plataformas extra que aparecen con el kit del motor.
 * Deja las capturas en capturas/9-2-*.png.
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

// ── 1. El taller de motores (?demo=motores) ─────────────────────────────────
await tab.goto(`${BASE}/?demo=motores`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const taller = await tab.eval(`(() => {
  const section = document.querySelector('[data-tour="motores"]');
  if (!section) return null;
  const state = window.useGameStore.getState().game;
  return {
    text: section.innerText,
    engines: (state.engines ?? []).map((e) => ({ name: e.name, gen: e.generation })),
    points: state.research.points,
  };
})()`);
check('el taller de motores monta en la pantalla de I+D', taller !== null);
check(
  'el motor propio envejecido aparece con su estado frente a la época',
  taller.text.includes('Motor Albatros') && /se queda justo|desfasado/.test(taller.text),
);
check(
  'la obra de mejora está en oferta con su triple coste (💰 + 💡 + semanas)',
  /Mejorar «Motor Albatros» a la generación 5/.test(taller.text) &&
    /💡/.test(taller.text) &&
    /semanas/.test(taller.text),
);
check(
  'las capacidades investigadas se ofrecen como extras de la obra',
  taller.text.includes('Online') && taller.text.includes('Kit biplataforma'),
);
check(
  'el catálogo licenciable lista motores modernos con su royalty',
  taller.text.includes('Unify') && /% de\s*royalty/.test(taller.text.replace(/\n/g, ' ')),
);
await tab.shot('capturas/9-2-motores.png');

// ── 2. Encargar la obra de verdad (la UI despacha; el núcleo decide) ────────
const before = await tab.eval(
  `window.useGameStore.getState().game.studio.capital`,
);
await tab.eval(`(() => {
  const section = document.querySelector('[data-tour="motores"]');
  const btn = [...section.querySelectorAll('button')].find((b) => b.innerText.includes('Encargar obra'));
  btn.click();
  return true;
})()`);
await new Promise((r) => setTimeout(r, 300));
const obra = await tab.eval(`(() => {
  const state = window.useGameStore.getState().game;
  return {
    capital: state.studio.capital,
    points: state.research.points,
    build: state.engineBuild,
  };
})()`);
check(
  'encargar la obra descuenta 💰 y 💡 y deja la obra en curso',
  obra.build !== null && obra.capital < before && obra.points < 120,
  `obra: gen ${obra.build?.generation}, ${obra.build?.weeksLeft} semanas`,
);
const tallerEnObra = await tab.eval(
  `document.querySelector('[data-tour="motores"]').innerText`,
);
check(
  'el taller muestra la obra en curso con sus semanas',
  /Mejorando «Motor Albatros»/.test(tallerEnObra) && /Quedan \d+ de \d+ semanas/.test(tallerEnObra),
);

// ── 3. La elección de motor al concebir (?demo=motores&concebir=1) ──────────
await tab.goto(`${BASE}/?demo=motores&concebir=1`);
const concepcion = await tab.eval(`(() => {
  const select = document.querySelector('#concept-engine');
  if (!select) return null;
  const dialog = select.closest('[role="dialog"]');
  return {
    options: [...select.options].map((o) => o.text),
    value: select.value,
    text: dialog.innerText,
  };
})()`);
check('el modal de concepción trae el selector de motor', concepcion !== null);
check(
  'ofrece artesanal + motor propio + catálogo licenciado (con su royalty)',
  concepcion.options.some((o) => /artesanal/i.test(o)) &&
    concepcion.options.some((o) => /Motor Albatros/.test(o)) &&
    concepcion.options.some((o) => /Unify.*licencia/.test(o)),
  concepcion.options.join(' | '),
);
check(
  'el propio (gen 3 en E5) sale preseleccionado y su adecuación es visible',
  concepcion.value === 'demo-motor' &&
    /El motor (va justo|se queda corto|va sobrado)/.test(concepcion.text),
);

// Cambia a un licenciado con kit biplataforma: royalty + plataformas extra.
await tab.eval(`(() => {
  const select = document.querySelector('#concept-engine');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'unify');
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await new Promise((r) => setTimeout(r, 300));
const conUnify = await tab.eval(
  `document.querySelector('#concept-engine').closest('[role="dialog"]').innerText`,
);
check(
  'con el licenciado moderno, la adecuación mejora y la royalty se avisa',
  /va sobrado/.test(conUnify) && /Royalty: 7\s*% de las ventas/.test(conUnify),
);
check(
  'el kit biplataforma del motor abre las plataformas extra',
  // innerText refleja el text-transform:uppercase del label: comparar sin caja.
  /plataformas extra \(hasta 1\)/i.test(conUnify),
);
await tab.shot('capturas/9-2-concebir-motor.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.2 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
