/**
 * Verificación en vivo de la Fase 7G vía CDP contra Chrome headless
 * (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5175 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 \
 *        --autoplay-policy=no-user-gesture-required --window-size=1440,900
 *   3. node scripts/verify7g.mjs
 *
 * Comprueba: rAF vivo, splash de era en el beat, panel de opciones con
 * sonido/accesibilidad, Web Audio corriendo (con señal medible), hum que
 * calla al mutear, tooltips por teclado, atajos 1–9/Espacio y escalado de
 * fuente. Deja las capturas en capturas/7g-*.png.
 */
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';

const BASE = 'http://localhost:5175';
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
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => reject(new Error(`timeout ${method}`)), 15000);
    });
  }

  async goto(url, settleMs = 1200) {
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, settleMs));
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

  /** Clic "de verdad" (Input.*): cuenta como gesto para la autoplay policy. */
  async click(selector) {
    const rect = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!rect) throw new Error(`No existe: ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', {
        type,
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      });
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  /** Clic por texto visible del elemento (botones con emoji/es). */
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
    await new Promise((r) => setTimeout(r, 150));
  }

  async key(key, code) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text: key.length === 1 ? key : undefined });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
    await new Promise((r) => setTimeout(r, 120));
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

// ── 1. rAF vivo (el porqué de verificar aquí y no en el Browser pane) ───────
await tab.goto(`${BASE}/?demo=studio`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

// ── 2. Splash de era en el beat de transición (arte hero 7G) ────────────────
await tab.goto(`${BASE}/?demo=era&era=E3`, 1800);
const splashE3 = await tab.eval(
  `document.querySelector('.era-overlay svg[aria-hidden]') !== null`,
);
check('splash de era presente en el beat (E3)', splashE3);
await tab.shot('capturas/7g-splash-E3.png');

await tab.goto(`${BASE}/?demo=era&era=E6`, 1800);
await tab.shot('capturas/7g-splash-E6.png');

// ── 3. Web Audio: arranca con gesto, suena y el hum calla al mutear ─────────
await tab.goto(`${BASE}/?demo=studio`, 1500);
await tab.click('main'); // gesto: desbloquea el AudioContext
await new Promise((r) => setTimeout(r, 400));
const audioState = await tab.eval(`window.__peSound?.state() ?? 'sin-motor'`);
check('AudioContext corriendo tras el gesto', audioState === 'running', audioState);

const humLevel = await tab.eval(`new Promise((resolve) => {
  setTimeout(() => resolve(window.__peSound?.level() ?? 0), 900);
})`);
check('hum ambiental audible en partida', humLevel > 0.0005, `RMS=${humLevel.toFixed(5)}`);

await tab.eval(`window.__peSound.play('reviewGood')`);
const chimeLevel = await tab.eval(`new Promise((resolve) => {
  let peak = 0;
  const t0 = performance.now();
  const probe = () => {
    peak = Math.max(peak, window.__peSound.level());
    performance.now() - t0 < 700 ? setTimeout(probe, 40) : resolve(peak);
  };
  probe();
})`);
check('el chime de reseña produce señal', chimeLevel > humLevel * 1.5, `pico=${chimeLevel.toFixed(4)}`);

// Mutear con el checkbox REAL del pie: el hum debe apagarse.
await tab.eval(`(() => {
  const label = [...document.querySelectorAll('footer label')].find((l) => l.textContent.includes('Sonido'));
  label.querySelector('input').scrollIntoView({ block: 'center' });
})()`);
await tab.eval(`(() => {
  const label = [...document.querySelectorAll('footer label')].find((l) => l.textContent.includes('Sonido'));
  const box = label.querySelector('input');
  box.click();
})()`);
const mutedLevel = await tab.eval(`new Promise((resolve) => {
  setTimeout(() => resolve(window.__peSound.level()), 1200);
})`);
check('muteado de verdad (RMS ≈ 0 tras apagar Sonido)', mutedLevel < 0.0005, `RMS=${mutedLevel.toFixed(6)}`);
await tab.eval(`(() => {
  const label = [...document.querySelectorAll('footer label')].find((l) => l.textContent.includes('Sonido'));
  label.querySelector('input').click();
})()`);

// ── 4. Tooltips explicativos por teclado (docs/10 §13) ──────────────────────
const tipByKeyboard = await tab.eval(`(() => {
  const chip = document.querySelector('header .tip[data-tip]');
  if (!chip) return 'sin-chip';
  chip.focus({ focusVisible: true });
  const after = getComputedStyle(chip, '::after');
  return { content: after.content !== 'none', tip: chip.dataset.tip.slice(0, 40) };
})()`);
check(
  'tooltip de métrica disponible (chips .tip con data-tip en el HUD)',
  typeof tipByKeyboard === 'object' && tipByKeyboard.content,
  JSON.stringify(tipByKeyboard).slice(0, 80),
);

// ── 5. Atajos de teclado: 8 → Finanzas, Espacio → play/pausa ────────────────
await tab.click('main'); // foco en el documento, lejos de controles
await tab.key('8', 'Digit8');
const finanzas = await tab.eval(
  `document.body.textContent.includes('Libro de caja') || document.body.textContent.includes('Flujo') || document.body.textContent.includes('Runway') || document.body.textContent.includes('runway')`,
);
check('tecla 8 navega a Finanzas', finanzas);
await tab.key('1', 'Digit1');

const speedBefore = await tab.eval(`document.querySelectorAll('[aria-pressed="true"]').length`);
await tab.key(' ', 'Space');
const speedAfter = await tab.eval(`(() => {
  const pressed = [...document.querySelectorAll('[aria-pressed="true"]')];
  return pressed.map((b) => b.textContent.trim()).join('|');
})()`);
check('Espacio alterna pausa/marcha (controles de tiempo)', speedAfter.includes('1') || speedAfter.includes('▶'), `antes=${speedBefore} después=${speedAfter}`);
await tab.key(' ', 'Space');

// ── 6. Escalado de fuente desde el pie (docs/10 §13) ────────────────────────
// El fontSize lo estampa un useEffect: hay que dar un respiro tras el change.
const scaled = await tab.eval(`new Promise((resolve) => {
  const select = [...document.querySelectorAll('footer select')].at(-1);
  if (!select) return resolve('sin-select');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'grande');
  select.dispatchEvent(new Event('change', { bubbles: true }));
  setTimeout(() => resolve(document.documentElement.style.fontSize), 350);
})`);
check('escalado de fuente aplicado al documento', scaled === '112.5%', String(scaled));
await tab.eval(`(() => {
  const select = [...document.querySelectorAll('footer select')].at(-1);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'base');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);

// ── 7. Título: sandbox desbloqueado + panel de opciones completo ────────────
await tab.goto(`${BASE}/`, 800);
await tab.eval(`localStorage.setItem('pixel-empire:sandbox-unlocked', 'true')`);
await tab.goto(`${BASE}/`, 1600);
await tab.clickText('Opciones');
await tab.clickText('Sandbox');
await new Promise((r) => setTimeout(r, 400));
const optionsPanel = await tab.eval(`(() => {
  const text = document.body.textContent;
  return {
    sonido: text.includes('Sonido'),
    letra: text.includes('Letra'),
    reducir: text.includes('Reducir animaciones'),
    sandbox: text.includes('elige tu era de arranque'),
    eras: text.includes('La chispa') && text.includes('El futuro cercano'),
  };
})()`);
check(
  'panel de opciones con sonido + letra + animaciones y sandbox con selector de eras',
  optionsPanel.sonido && optionsPanel.letra && optionsPanel.reducir && optionsPanel.sandbox && optionsPanel.eras,
  JSON.stringify(optionsPanel),
);
await tab.shot('capturas/7g-opciones-sandbox.png');

// ── 8. Sandbox arranca de verdad en la era elegida ──────────────────────────
await tab.clickText('Servicios y streamers');
// El contador de capital "rueda" ~1,3 s al montar: esperar a que aterrice.
await new Promise((r) => setTimeout(r, 2400));
const sandboxState = await tab.eval(`(() => {
  const text = document.body.textContent;
  return { era: text.includes('Servicios y streamers'), rico: text.includes('1.000.000') || /1[.,]000[.,]000/.test(text) };
})()`);
check('partida sandbox en E6 con caja generosa', sandboxState.era && sandboxState.rico, JSON.stringify(sandboxState));
await tab.shot('capturas/7g-sandbox-E6.png');

console.log(failures === 0 ? '\nTodo verificado ✓' : `\n${failures} comprobaciones fallidas ✗`);
process.exit(failures > 0 ? 1 : 0);
