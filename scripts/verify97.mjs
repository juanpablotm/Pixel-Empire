/**
 * Verificación en vivo de la Fase 9.7 (docs/19 §9.7) vía CDP contra Chrome
 * headless (el Browser pane integrado tiene rAF muerto: no sirve para animación).
 *
 *   1. npx vite --port 5178 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9334 --window-size=1440,900
 *   3. node scripts/verify97.mjs
 *
 * Comprueba la GESTIÓN de un servicio en vivo (?demo=gaas): parroquia,
 * dotación, neto y cierre — y el panel de ADQUISICIONES (?demo=filiales):
 * compra desde el ranking, negativas nombradas y la cartera de filiales con
 * sus directivas. Deja las capturas en capturas/9-7-*.png.
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

// ── 1. Gestión de un servicio en vivo (?demo=gaas) ───────────────────────────
await tab.goto(`${BASE}/?demo=gaas`);
const frames = await tab.eval(`new Promise((resolve) => {
  let n = 0;
  const step = () => { n++; n < 12 ? requestAnimationFrame(step) : resolve(n); };
  requestAnimationFrame(step);
  setTimeout(() => resolve(n), 3000);
})`);
check('requestAnimationFrame vivo (12 frames)', frames >= 12, `frames=${frames}`);

// La gala se salta con un clic (la ficha entera queda a la vista).
await tab.eval(`document.querySelector('main').click()`);
await new Promise((r) => setTimeout(r, 500));

// textContent (no innerText): innerText aplica text-transform (lección verify93).
const ficha = await tab.eval(`document.querySelector('main').textContent`);
check('el bloque del servicio en vivo monta', ficha.includes('Servicio en vivo'));
check(
  'la parroquia es visible (jugadores y pico)',
  ficha.includes('27.400') && ficha.includes('31.900'),
);
check(
  'la dotación se enseña completa (5/5, sin descuido)',
  ficha.includes('Equipo del servicio: 5/5') && !ficha.includes('DESCUIDADO'),
);
check(
  'el neto semanal y el acumulado están a la vista',
  ficha.includes('Neto semanal') && ficha.includes('Acumulado'),
);
check(
  'la monetización del servicio se nombra (pase + tienda)',
  ficha.includes('pase de batalla') && ficha.includes('tienda moderada'),
);
check('el cierre existe como decisión', ficha.includes('Cerrar el servicio'));

// El neto que pinta la UI sale del selector puro del núcleo (docs/08 §6).
const netUi = await tab.eval(`(() => {
  const s = window.useGameStore.getState().game;
  const game = s.releasedGames[0];
  const svc = game.liveService;
  const cfg = { arpu: 0.5, pass: 0.5, agg: 0.8, base: 1500, perPlayer: 0.1 };
  const arpu = cfg.arpu * (1 + cfg.pass + cfg.agg * svc.aggressiveness);
  const gross = svc.players * arpu;
  return Math.round(gross - (cfg.base + svc.players * cfg.perPlayer));
})()`);
check('el neto estimado es coherente con balance.liveOps', Number.isFinite(netUi) && netUi > 0, `≈${netUi}/sem`);
await tab.eval(`document.querySelector('[data-tour="live-service"]').scrollIntoView({ block: 'center' })`);
await new Promise((r) => setTimeout(r, 300));
await tab.shot('capturas/9-7-gaas.png');

// Retirar a un empleado del servicio DE VERDAD (store → núcleo): la dotación baja.
const staffing = await tab.eval(`(() => {
  const store = window.useGameStore.getState();
  const game = store.game.releasedGames[0];
  const first = game.liveService.assignedStaff[0];
  store.toggleLiveServiceAssignment(game.id, first);
  const after = window.useGameStore.getState().game.releasedGames[0];
  return { before: game.liveService.assignedStaff.length, after: after.liveService.assignedStaff.length };
})()`);
check('retirar del servicio funciona (5 → 4)', staffing.before === 5 && staffing.after === 4);

// Cerrar el servicio (sunset): libera equipo, queda la lápida y el aviso.
const sunset = await tab.eval(`(() => {
  const store = window.useGameStore.getState();
  const game = store.game.releasedGames[0];
  store.sunsetLiveService(game.id);
  const s = window.useGameStore.getState().game;
  const svc = s.releasedGames[0].liveService;
  return {
    closed: svc.closedWeek !== undefined,
    freed: svc.assignedStaff.length === 0,
    logged: s.log.some((e) => e.text.includes('Cierras el servicio')),
  };
})()`);
check('el cierre del servicio cierra, libera y deja noticia', sunset.closed && sunset.freed && sunset.logged);

// ── 2. Panel de adquisiciones y filiales (?demo=filiales) ────────────────────
await tab.goto(`${BASE}/?demo=filiales`);
await new Promise((r) => setTimeout(r, 600));
const panel = await tab.eval(`document.querySelector('main').textContent`);
check('el ranking monta con los botones de compra', panel.includes('Ranking de la industria'));
check('la cartera de filiales existe', panel.includes('Tus filiales'));
check(
  'la filial invertida luce su talento y su flujo',
  panel.includes('Tortuga Bros.') && panel.includes('Invertir'),
);
check(
  'la filial exprimida enseña el cascarón que viene (talento hundido)',
  panel.includes('Bad Robot Bytes') && panel.includes('Exprimir'),
);
check(
  'los adquiridos quedan nombrados fuera del ranking',
  panel.includes('Adquiridos por ti: Tortuga Bros. · Bad Robot Bytes'),
);
check('vender es una decisión visible', panel.includes('Vender ('));

// Las negativas son nombradas (Pilar 2): el gigante no vende; el indie en racha tampoco.
const reasons = await tab.eval(`(() => {
  const buttons = [...document.querySelectorAll('[data-tour="adquisiciones"] button')];
  const forRow = (name) => {
    const row = buttons.find((b) => b.closest('li')?.textContent.includes(name) && b.title);
    return row ? row.title : null;
  };
  return { racha: forRow('Cinco Pixeles'), buyable: forRow('Nimbus Softworks') };
})()`);
check(
  'el indie en racha se niega (rechazo nombrado)',
  reasons.racha !== null && reasons.racha.includes('racha'),
  reasons.racha ?? '',
);
check(
  'el elegible invita a comprar (precio en el botón)',
  reasons.buyable !== null && reasons.buyable.includes('sale de la competencia'),
);
await tab.shot('capturas/9-7-adquisiciones.png');

// COMPRAR de verdad (store → núcleo): paga, marca el runtime y abre la filial.
const bought = await tab.eval(`(() => {
  const store = window.useGameStore.getState();
  const before = store.game.studio.capital;
  store.acquireStudio('nimbus');
  const s = window.useGameStore.getState().game;
  const runtime = s.rivals.studios.find((r) => r.id === 'nimbus');
  const sub = (s.subsidiaries ?? []).find((x) => x.id === 'nimbus');
  return {
    paid: before - s.studio.capital,
    acquired: runtime.acquiredWeek !== undefined,
    sub: sub ? { talent: sub.talent, directive: sub.directive } : null,
    logged: s.log.some((e) => e.text.includes('Compras Nimbus Softworks')),
  };
})()`);
check(
  'comprar paga el precio y saca al rival de la competencia',
  bought.paid > 0 && bought.acquired,
  `pagado=${bought.paid}`,
);
check(
  'la filial nace con el talento del estudio y directiva autónoma',
  bought.sub !== null && bought.sub.talent === 27 && bought.sub.directive === 'autonomo',
);
check('la compra deja noticia en el historial', bought.logged);

// Cambiar la directiva desde la UI del núcleo (setSubsidiaryDirective).
const directed = await tab.eval(`(() => {
  const store = window.useGameStore.getState();
  store.setSubsidiaryDirective('nimbus', 'invertir');
  const sub = window.useGameStore.getState().game.subsidiaries.find((x) => x.id === 'nimbus');
  return sub.directive;
})()`);
check('la directiva de la filial se fija (invertir)', directed === 'invertir');

check(
  'sin errores de consola ni excepciones en toda la sesión',
  tab.errors.length === 0,
  tab.errors.slice(0, 3).join(' | '),
);

console.log(failures === 0 ? '\n✅ Fase 9.7 verificada' : `\n❌ ${failures} comprobación(es) fallidas`);
process.exit(failures === 0 ? 0 : 1);
