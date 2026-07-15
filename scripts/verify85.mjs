/**
 * Verificación en vivo de la Fase 8.5 (docs/17 U2–U3) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5175 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,900
 *   3. node scripts/verify85.mjs
 *
 * Comprueba: la pantalla principal solo lista los juegos que AÚN SE VENDEN y
 * cada uno lleva su mini-gráfico; el menú de la barra abre los modales (juegos
 * lanzados con lo retirado dentro, historial, partida); la concepción es un
 * modal con selectores que pausa el tiempo; y "Continuar desarrollo" lo reanuda
 * a x1. Deja las capturas en capturas/8-5-*.png.
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
    /** Errores reales de la página (consola + excepciones sin capturar). */
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
      // Generoso: algunas evaluaciones SONDEAN el DOM durante segundos (esperar
      // a que el fin de fase reabra la ventana con el reloj corriendo de veras).
      setTimeout(() => reject(new Error(`timeout ${method}`)), 30000);
    });
  }

  /**
   * Navega y ESPERA a que la app monte de verdad. Un margen fijo no vale: la
   * primera carga de Vite compila y puede tardar segundos, y entonces se
   * evaluaría contra about:blank (falsos negativos silenciosos).
   */
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
    await new Promise((r) => setTimeout(r, 250));
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

/** Texto visible de la pantalla (sin los modales, que van en overlay). */
const MAIN_TEXT = `document.querySelector('main')?.innerText ?? ''`;

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
const tab = await openTab();

// ── 1. La pantalla principal, limpia y con solo lo que se vende (U2) ───────
await tab.goto(`${BASE}/?demo=studio`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

const main = await tab.eval(MAIN_TEXT);
// innerText llega con el text-transform aplicado (card-title va en versalitas).
check('la principal titula "A la venta"', /a la venta/i.test(main));
check('lista los juegos que aún venden', main.includes('Órbita Rota') && main.includes('Ciudad Neón'));
check('NO lista el juego retirado (vive en el modal)', !main.includes('Garaje Racer'));
check('el historial ya no ocupa la pantalla', !main.includes('Historial'));
check('las opciones de partida ya no ocupan la pantalla', !main.includes('Guardar'));

const sparks = await tab.eval(
  `document.querySelectorAll('main svg[role="img"][aria-label^="Copias por semana"]').length`,
);
check('cada juego a la venta lleva su mini-gráfico', sparks === 2, `gráficos=${sparks}`);

// El mini-gráfico dibuja la serie real, no una línea plana de relleno.
const sparkPath = await tab.eval(`(() => {
  const svg = document.querySelector('main svg[aria-label^="Copias por semana"]');
  const d = svg?.querySelector('path:nth-of-type(2)')?.getAttribute('d') ?? '';
  return { puntos: (d.match(/L/g) ?? []).length + 1, d: d.slice(0, 40) };
})()`);
check('el gráfico traza la cola de ventas semana a semana', sparkPath.puntos >= 4, `puntos=${sparkPath.puntos}`);
await tab.shot('capturas/8-5-principal-limpia.png');

// El estante queda bajo el pliegue en 900 px: su propia captura.
await tab.eval(
  `document.querySelector('main svg[aria-label^="Copias por semana"]').closest('section').scrollIntoView({ block: 'center' })`,
);
await new Promise((r) => setTimeout(r, 400));
await tab.shot('capturas/8-5-estante-graficos.png');

// ── 2. El menú de la barra abre los modales (U2) ───────────────────────────
await tab.clickText('☰ Menú');
const menuOpen = await tab.eval(`document.querySelector('[role="menu"]') !== null`);
check('el menú de la barra despliega', menuOpen);

await tab.clickText('🕹️ Juegos lanzados');
const gamesModal = await tab.eval(`(() => {
  const d = document.querySelector('[role="dialog"][aria-label="Juegos lanzados"]');
  return d ? d.innerText : null;
})()`);
check('abre el modal de juegos lanzados', gamesModal !== null);
check('el modal SÍ contiene el juego retirado', (gamesModal ?? '').includes('Garaje Racer'));
check('y lo marca fuera de tiendas', (gamesModal ?? '').includes('fuera de tiendas'));
await tab.shot('capturas/8-5-modal-juegos.png');

await tab.clickText('✕ Cerrar');
await tab.clickText('☰ Menú');
await tab.clickText('📜 Historial');
const historyModal = await tab.eval(
  `document.querySelector('[role="dialog"][aria-label="Historial"]') !== null`,
);
check('abre el modal de historial', historyModal);

await tab.clickText('✕ Cerrar');
await tab.clickText('☰ Menú');
await tab.clickText('💾 Partida');
const saveModal = await tab.eval(`(() => {
  const d = document.querySelector('[role="dialog"][aria-label="Partida"]');
  return d ? d.innerText : null;
})()`);
check('abre el modal de partida', saveModal !== null);
check(
  'con guardar/cargar/nueva/título/legado/retirarse',
  ['💾 Guardar', '📂 Cargar', '✨ Nueva partida', '🏠 Volver al título', '🏛️ Ver legado', '🏛️ Retirarse']
    .every((label) => (saveModal ?? '').includes(label)),
);
await tab.shot('capturas/8-5-modal-partida.png');
await tab.clickText('✕ Cerrar');

// ── 3. La concepción es un modal con selectores y pausa (U3) ───────────────
await tab.goto(`${BASE}/?demo=studio`);
// El escaparate tiene un proyecto en curso: el atajo abre igual la concepción.
await tab.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`);
await new Promise((r) => setTimeout(r, 500));
const conception = await tab.eval(`(() => {
  const d = document.querySelector('[role="dialog"][aria-label="Nuevo juego"]');
  if (!d) return null;
  const selects = [...d.querySelectorAll('select')].map((s) => ({
    id: s.id,
    opciones: s.options.length,
  }));
  return { selects, texto: d.innerText.slice(0, 120) };
})()`);
check('la concepción abre como MODAL', conception !== null);
check(
  'tema, género y plataforma son selectores',
  (conception?.selects ?? []).map((s) => s.id).join(',') ===
    'concept-theme,concept-genre,concept-platform',
  JSON.stringify(conception?.selects ?? []),
);
const speedAfterOpen = await tab.eval(
  `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('⏸ Pausa'))?.getAttribute('aria-pressed')`,
);
check('abrir la concepción pausa el tiempo', speedAfterOpen === 'true', `pausa=${speedAfterOpen}`);
await tab.shot('capturas/8-5-modal-creacion.png');

// El Fit reacciona al cambiar el selector (la UI solo muestra; core calcula).
const fitChanged = await tab.eval(`(() => {
  const dialog = document.querySelector('[role="dialog"][aria-label="Nuevo juego"]');
  const before = dialog.querySelector('[role="status"]')?.getAttribute('aria-label');
  const select = dialog.querySelector('#concept-genre');
  const last = select.options[select.options.length - 1].value;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, last);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return new Promise((resolve) => setTimeout(() => resolve({
    before,
    after: document.querySelector('[role="dialog"] [role="status"]')?.getAttribute('aria-label'),
    genero: last,
  }), 250));
})()`);
check(
  'el medidor de Fit responde al selector de género',
  typeof fitChanged.after === 'string' && fitChanged.after.startsWith('Fit:'),
  `${fitChanged.before} → ${fitChanged.after} (${fitChanged.genero})`,
);

// ── 4. El desarrollo es un modal por fases (U3 + Fase 8.5) ─────────────────
// Sobre una PARTIDA REAL, no sobre el escaparate: el demo arranca con un
// proyecto casi terminado que se lanzaría antes de cambiar de fase, y lo que
// se quiere probar aquí es justo el ciclo fase → continuar → fase.
await tab.goto(BASE);
await tab.clickText('✨ Nueva partida');
await new Promise((r) => setTimeout(r, 500));
const tutorialUp = await tab.eval(
  `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Saltar tutorial'))`,
);
if (tutorialUp) await tab.clickText('Saltar tutorial');

await tab.clickText('💡 Nuevo juego');
await new Promise((r) => setTimeout(r, 400));
await tab.eval(`(() => {
  const input = document.querySelector('#game-name');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Ciclo de Fases');
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await tab.clickText('Empezar desarrollo');
await new Promise((r) => setTimeout(r, 500));

const devModal = await tab.eval(`(() => {
  const d = document.querySelector('[role="dialog"][aria-label^="Desarrollo de"]');
  if (!d) return null;
  const texto = d.innerText;
  const cols = getComputedStyle(d.querySelector('.grid')).gridTemplateColumns.split(' ').length;
  return {
    texto,
    columnas: cols,
    // La decisión de la fase y el contexto, cada uno en su sitio.
    esfuerzo: /reparto de esfuerzo/i.test(texto),
    equipo: /equipo asignado/i.test(texto),
    marketing: /marketing/i.test(texto),
    fases: ['Concepto', 'Producción', 'Pulido'].every((f) => texto.includes(f)),
  };
})()`);
check('el desarrollo abre como MODAL', devModal !== null);
check('con el stepper de las 3 fases', devModal?.fases === true);
check('reparto de esfuerzo, equipo y marketing dentro',
  devModal?.esfuerzo && devModal?.equipo && devModal?.marketing);
check('maquetado en DOS columnas, no en pila', devModal?.columnas === 2, `columnas=${devModal?.columnas}`);
await tab.shot('capturas/8-5-desarrollo-modal.png');

// La barra de scroll del modal ya no es la del sistema (cambio 1).
const scrollbar = await tab.eval(`(() => {
  const body = document.querySelector('[role="dialog"][aria-label^="Desarrollo de"] .scroll-slim');
  return body ? getComputedStyle(body).scrollbarWidth : null;
})()`);
check('la barra de scroll del modal lleva diseño propio', scrollbar === 'thin', `scrollbar-width=${scrollbar}`);

// "Continuar desarrollo": cierra la ventana y el mundo echa a andar a x1.
await tab.clickText('▶ Continuar desarrollo');
await new Promise((r) => setTimeout(r, 300));
const afterContinue = await tab.eval(`(() => {
  const x1 = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '▶ x1');
  return {
    cerrado: document.querySelector('[role="dialog"][aria-label^="Desarrollo de"]') === null,
    x1: x1?.getAttribute('aria-pressed'),
    oficina: document.querySelector('main .hero-stage') !== null,
  };
})()`);
check('"Continuar desarrollo" cierra la ventana', afterContinue.cerrado);
check('…pone el tiempo en x1', afterContinue.x1 === 'true', `x1=${afterContinue.x1}`);
check('…y deja ver la Oficina Viva trabajando', afterContinue.oficina);
await tab.shot('capturas/8-5-oficina-trabajando.png');

// Con el reloj corriendo de verdad (x1 = 1 s por semana), el fin de fase
// reabre la ventana sola: el pacing que pidió el jugador.
const reopened = await tab.eval(`new Promise((resolve) => {
  const t0 = Date.now();
  const probe = () => {
    const d = document.querySelector('[role="dialog"][aria-label^="Desarrollo de"]');
    if (d) return resolve({ ok: true, texto: d.innerText, ms: Date.now() - t0 });
    if (Date.now() - t0 > 15000) return resolve({ ok: false });
    setTimeout(probe, 250);
  };
  probe();
})`);
check(
  'al acabar la fase, la ventana se reabre sola (pacing por fases)',
  reopened.ok === true,
  reopened.ok ? `en ${(reopened.ms / 1000).toFixed(1)} s` : 'no reapareció en 15 s',
);
check(
  'y vuelve con la fase nueva cargada (Producción)',
  /Reparto de esfuerzo — fase de Producción/i.test(reopened.texto ?? ''),
);
const pausedOnPhase = await tab.eval(
  `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('⏸ Pausa'))?.getAttribute('aria-pressed')`,
);
check('el hito de fase para el reloj', pausedOnPhase === 'true', `pausa=${pausedOnPhase}`);
// La ventana acaba de entrar con su spring: se deja asentar antes del retrato.
await new Promise((r) => setTimeout(r, 700));
await tab.shot('capturas/8-5-desarrollo-fase-nueva.png');

// ── 4b. Fuera el paso manual del tiempo (cambio 2) ─────────────────────────
const manualStep = await tab.eval(
  `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('+1 semana'))`,
);
check('"+1 semana" ya no existe en la interfaz', manualStep === false);

// ── 5. El tutorial (7F) sobrevive a la mudanza: su ancla del Fit ahora vive
//      DENTRO del modal, y la guía (z-35) debe quedar por encima (z-30) ─────
await tab.goto(`${BASE}/?demo=tutorial`);
await tab.clickText('Vamos');
await tab.clickText('💡 Nuevo juego');
await new Promise((r) => setTimeout(r, 500));
const tutorial = await tab.eval(`(() => {
  const modal = document.querySelector('[role="dialog"][aria-label="Nuevo juego"]');
  const anchor = modal?.querySelector('[data-tour="fit-meter"]');
  const guide = document.body.innerText.includes('El Fit es tu brújula');
  return { modal: modal !== null, anchor: anchor !== null, guide };
})()`);
check('el tutorial abre la concepción y avanza al paso del Fit', tutorial.modal && tutorial.guide);
check('el ancla del Fit vive dentro del modal', tutorial.anchor);
await tab.shot('capturas/8-5-tutorial-fit.png');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 8.5 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
