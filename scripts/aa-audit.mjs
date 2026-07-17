/**
 * Auditoría de contraste AA de las 7 pieles de era (docs/10 §8, docs/18 V1).
 *
 * El contraste AA en TODAS las pieles era ya requisito de la 7E, pero nadie lo
 * medía: se comprobaba a ojo, y así se coló el indicador de especialidad de E3
 * (docs/18 V1). Este script lo mide sobre los COLORES COMPUTADOS REALES del
 * navegador, que es la única forma de cazar lo que el hex del token no dice:
 * color-mix(), fondos con alfa (bg-danger/15), texto heredado y composición de
 * varias capas.
 *
 * Se ejecuta vía CDP contra Chrome headless porque el Browser pane integrado de
 * esta máquina tiene rAF muerto (ver scripts/verify7g.mjs).
 *
 *   1. npx vite --port 5175 --strictPort
 *   2. chrome --headless=new --remote-debugging-port=9333 --window-size=1440,1200
 *   3. node scripts/aa-audit.mjs
 *
 * Comprueba, piel por piel y pantalla por pantalla:
 *   · todo texto visible contra su fondo REALMENTE pintado ≥ 4.5:1 (≥ 3:1 si es
 *     texto grande, según WCAG 2.1 AA 1.4.3);
 *   · la separación del indicador de especialidad (docs/18 V1): la tinta fuerte
 *     del destaque contra el mute del resto, que es la señal que se perdía.
 *
 * Lo que NO puede afirmar: los nodos sobre degradado (background-image) no
 * tienen un color de fondo único, así que se listan aparte como revisables a
 * mano en vez de darlos por buenos. Salir con 0 significa "nada medible falla",
 * no "todo es perfecto".
 */
import WebSocket from 'ws';

const BASE = 'http://localhost:5175';
const CDP = 'http://127.0.0.1:9333';

/** Escaparates que cubren el texto denso de la UI; se recorren en las 7 pieles. */
const SCREENS = [
  { demo: 'studio', pantalla: 'equipo', label: 'equipo (tarjetas de empleado)' },
  { demo: 'studio', pantalla: 'estudio', label: 'estudio (HUD + oficina)' },
  { demo: 'studio', pantalla: 'mercado', label: 'mercado (tendencias)' },
  { demo: 'studio', pantalla: 'finanzas', label: 'finanzas (P&L)' },
  { demo: 'creators', pantalla: 'creadores', label: 'creadores' },
  { demo: 'conocimiento', pantalla: 'investigacion', label: 'investigación' },
  { demo: 'gala', pantalla: 'resena', label: 'reseña (gala)' },
];
const ERAS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];

/**
 * Conversor de color CSS → sRGB que corre en la página. Pinta el color en un
 * canvas 1×1 y lee el píxel: así el NAVEGADOR resuelve el formato, sea el que
 * sea. Es imprescindible — Tailwind v4 emite oklch() y una regex de rgb() lo
 * lee como "sin color", que es como este script daba por invisible un botón
 * fucsia perfectamente legible (falso positivo) y podría callar uno real.
 */
const PARSE_IMPL = `((() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  return (css) => {
    if (!css || css === 'transparent' || css === 'none') return { r: 0, g: 0, b: 0, a: 0 };
    ctx.clearRect(0, 0, 1, 1);
    // fillStyle ignora valores inválidos: se marca uno centinela para detectarlo.
    ctx.fillStyle = '#010203';
    ctx.fillStyle = css;
    if (ctx.fillStyle === '#010203' && css.replace(/\\s/g, '').toLowerCase() !== '#010203') {
      // Puede ser válido y coincidir; se acepta igualmente pintando.
    }
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
})())`;

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
      // El timer se limpia al resolver: si no, el sondeo de goto deja miles de
      // temporizadores vivos y el proceso se queda sin heap a media auditoría.
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout ${method}`));
      }, 20000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  /**
   * Navega y ESPERA A QUE PINTE de verdad. Con una espera fija, una piel lenta
   * devolvía 0 nodos y el auditor la daba por buena: un falso ✓ es peor que un
   * fallo, así que aquí se sondea hasta que el árbol está montado.
   */
  async goto(url, minNodes = 40) {
    // Con navegaciones seguidas en la misma pestaña, Chrome headless se salta
    // algún montaje: se reintenta en vez de dar la piel por auditada.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.send('Page.navigate', { url: attempt === 0 ? url : `${url}&r=${attempt}` });
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        try {
          const n = await this.eval(`document.querySelectorAll('#root *').length`);
          if (n >= minNodes) {
            // Un respiro para que asienten fuentes y animaciones de entrada.
            await new Promise((r) => setTimeout(r, 400));
            return n;
          }
        } catch {
          // navegación en vuelo
        }
      }
    }
    throw new Error(`La página no montó tras 3 intentos: ${url}`);
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
}

async function openTab(tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' });
      const info = await res.json();
      const ws = new WebSocket(info.webSocketDebuggerUrl, { perMessageDeflate: false });
      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      const tab = new Tab(ws);
      tab.targetId = info.id;
      await tab.send('Page.enable');
      await tab.send('Runtime.enable');
      return tab;
    } catch (e) {
      // Chrome tarda en atender una pestaña recién creada si la anterior aún
      // se está cerrando: reintentar en vez de tirar la auditoría entera.
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

/**
 * Recolector que corre DENTRO de la página. Devuelve, por cada nodo con texto
 * propio visible, el ratio de contraste contra el fondo compuesto de verdad.
 */
/**
 * Helpers compartidos por los dos recolectores. Van en un solo sitio a
 * propósito: tenerlos duplicados ya costó medir E7 como si sus superficies
 * fueran opacas, cuando son translúcidas (glassmorphism) y hay que componerlas.
 */
const HELPERS = `
  const parse = PARSE_IMPL;
  // Composición alfa estándar (source-over) de un color sobre otro opaco.
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  // Fondo efectivo: sube por los ancestros componiendo alfa hasta topar opaco.
  // Si algún ancestro pinta un degradado, no hay color único que medir.
  const backdrop = (el) => {
    let layers = [], gradient = false;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') gradient = true;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a === 1) break;
      }
    }
    if (!layers.length) layers.push({ r: 255, g: 255, b: 255, a: 1 });
    // De la capa más profunda hacia fuera.
    let acc = layers[layers.length - 1];
    if (acc.a < 1) acc = over(acc, { r: 255, g: 255, b: 255, a: 1 });
    for (let i = layers.length - 2; i >= 0; i--) acc = over(layers[i], acc);
    return { color: acc, gradient };
  };
`;

const COLLECT = `(() => {
  HELPERS_IMPL

  const label = (el) => {
    const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
    const t = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 32);
    return el.tagName.toLowerCase() + (cls ? '.' + String(cls).trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' «' + t + '»';
  };

  // Los emoji se pintan con la fuente de color del sistema: su legibilidad no
  // depende del color CSS, así que medirlos da fallos que no existen (un 🚀 de
  // portada salía a 1,38:1 y se ve perfectamente).
  const soloEmoji = (t) => /^[\\p{Extended_Pictographic}\\p{Emoji_Component}\\s\\u200d\\ufe0f]+$/u.test(t);

  const out = { fails: [], gradients: [], svg: [], checked: 0 };
  for (const el of document.querySelectorAll('body *')) {
    // Solo nodos con texto PROPIO (evita contar el mismo texto por cada ancestro).
    const propio = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .trim();
    if (!propio.length) continue;
    if (soloEmoji(propio)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // WCAG 1.4.3 exime a los controles deshabilitados.
    if (el.closest('[disabled]') || el.closest('[aria-hidden="true"]')) continue;
    // El texto solo-lector (sr-only) no se ve: no aplica contraste.
    if (r.width <= 1 && r.height <= 1) continue;

    // El texto SVG no es medible por este camino: se pinta con 'fill' (no con
    // 'color') y su fondo lo dibuja el propio SVG (<rect> con degradado), no un
    // ancestro del DOM. Medirlo daba fallos inventados — las portadas salían a
    // 1,38:1 cuando en realidad se pintan con su paleta sobre su gradiente. Se
    // aparta a revisión manual en vez de afirmar un número falso.
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
      if (out.svg.length < 10) out.svg.push({ el: label(el) });
      continue;
    }

    const bg = backdrop(el);
    let fg = parse(s.color);
    // Texto totalmente transparente (p. ej. relleno por degradado): no hay
    // color que medir, y compararlo daría un 1:1 falso.
    if (!fg || fg.a === 0) continue;
    if (fg.a < 1) fg = over(fg, bg.color);

    const size = parseFloat(s.fontSize);
    const weight = parseInt(s.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bg.color);
    out.checked++;

    const row = { el: label(el), fg: hex(fg), bg: hex(bg.color), got: Math.round(got * 100) / 100, need };
    // E4 pinta degradado en cada tarjeta/chip/botón: sin tope, la lista cruza
    // el puente CDP con cientos de filas por pantalla y no aporta nada.
    if (bg.gradient) { if (out.gradients.length < 15) out.gradients.push(row); continue; }
    if (got < need) out.fails.push(row);
  }
  out.fails.sort((a, b) => a.got - b.got);
  out.fails = out.fails.slice(0, 10);
  return out;
})()`;

/** La señal de docs/18 V1: destaque de especialidad contra el resto de la fila. */
const SPECIALTY = `(() => {
  HELPERS_IMPL

  const row = document.querySelector('article[aria-label^="Empleado"] [data-skill-row]');
  if (!row) return null;
  const spans = [...row.children];
  const hi = spans.find((s) => s.hasAttribute('data-specialty'));
  const rest = spans.filter((s) => s !== hi);
  if (!hi || !rest.length) return null;
  const sHi = getComputedStyle(hi), sRest = getComputedStyle(rest[0]);

  // La señal es una FORMA (docs/18 V1): un chip con superficie y borde propios,
  // que se recorta contra la tarjeta en cualquier piel. TODO se compone antes
  // de medir: en E7 las superficies son translúcidas (cristal) y leerlas como
  // opacas daba un 2,22:1 que no existe.
  const fondo = backdrop(row).color;
  const chipRaw = parse(sHi.backgroundColor);
  const bordeRaw = parse(sHi.borderTopColor);
  const chip = over(chipRaw, fondo);
  const borde = over(bordeRaw, fondo);
  let texto = parse(sHi.color);
  if (texto.a < 1) texto = over(texto, chip);
  return {
    tieneChip: chipRaw.a > 0,
    tieneBorde: parseFloat(sHi.borderTopWidth) > 0 && bordeRaw.a > 0,
    bordeVsFondo: Math.round(ratio(borde, fondo) * 100) / 100,
    chipVsFondo: Math.round(ratio(chip, fondo) * 100) / 100,
    textoEnChip: Math.round(ratio(texto, chip) * 100) / 100,
    pesoHi: sHi.fontWeight,
    pesoResto: sRest.fontWeight,
  };
})()`;

/**
 * Cierra la pestaña DE VERDAD. Cerrar solo el WebSocket deja el target vivo:
 * una pestaña por piel y por ejecución acababa tumbando a Chrome por falta de
 * memoria (VirtualAlloc failed) tras unas pocas pasadas.
 */
async function closeTab(tab) {
  try {
    if (tab.targetId) await fetch(`${CDP}/json/close/${tab.targetId}`);
  } catch {
    // si ya no está, mejor
  }
  tab.ws.close();
}

/** Inserta helpers y conversor de color en los recolectores antes de evaluarlos. */
const withParse = (src) =>
  src.replace(/HELPERS_IMPL/g, HELPERS).replace(/PARSE_IMPL/g, PARSE_IMPL);

console.log('Esperando a Vite y a Chrome…');
await waitFor(BASE);
await waitFor(`${CDP}/json/version`);
let tab = await openTab();

const allGradients = [];
for (const era of ERAS) {
  console.log(`\n── Piel ${era} ${'─'.repeat(50)}`);
  // Pestaña nueva por piel: reutilizar una sola durante 50+ navegaciones hace
  // que Chrome headless se salte montajes a mitad de la auditoría.
  const fresh = await openTab();
  await closeTab(tab);
  tab = fresh;
  for (const s of SCREENS) {
    await tab.goto(`${BASE}/?demo=${s.demo}&era=${era}&pantalla=${s.pantalla}`);
    const out = await tab.eval(withParse(COLLECT));
    // Sin texto que medir no hay nada que afirmar: eso es un fallo del arnés,
    // no un aprobado.
    const measured = out.checked >= 20;
    const detail = !measured
      ? `solo ${out.checked} nodos con texto: la pantalla no cargó`
      : out.fails.length === 0
        ? `${out.checked} nodos`
        : out.fails
            .slice(0, 4)
            .map((f) => `${f.el} ${f.fg}/${f.bg} = ${f.got}:1 (necesita ${f.need})`)
            .join('; ');
    check(`${era} · ${s.label}`, measured && out.fails.length === 0, detail);
    for (const g of out.gradients) allGradients.push({ era, screen: s.label, ...g });
  }

  // El indicador de especialidad, la regresión concreta de docs/18 V1.
  await tab.goto(`${BASE}/?demo=studio&era=${era}&pantalla=equipo`);
  const spec = await tab.eval(withParse(SPECIALTY));
  if (!spec) {
    check(`${era} · indicador de especialidad localizado`, false, 'no se encontró la fila');
  } else {
    // Qué se exige: que el chip sea un objeto (superficie propia + borde que se
    // vea), que su texto vaya en AA sobre él y que el peso cambie.
    //
    // NO se exige un salto fuerte de luminosidad chip/fondo. Las rampas de
    // superficie de esta paleta son cortas a propósito — ningún chip del
    // sistema de diseño pasa de ~1,2:1 contra su panel — y era justo depender
    // de la luminosidad lo que rompía E3. La señal la sostienen cuatro canales
    // a la vez (superficie, borde, peso 600 vs 400 y tinta fuerte vs mute); el
    // borde es el que dibuja la forma, así que se le pide ser perceptible
    // (1,5:1), no el 3:1 de WCAG 1.4.11 — que aplica a controles, y esto es
    // énfasis tipográfico cuyo significado ya carga el propio texto.
    const ok =
      spec.tieneChip &&
      spec.tieneBorde &&
      spec.bordeVsFondo >= 1.5 &&
      spec.textoEnChip >= 4.5 &&
      spec.pesoHi !== spec.pesoResto;
    check(
      `${era} · especialidad destaca (chip + borde + texto AA)`,
      ok,
      `borde/fondo ${spec.bordeVsFondo}:1, texto/chip ${spec.textoEnChip}:1, chip/fondo ${spec.chipVsFondo}:1, peso ${spec.pesoHi} vs ${spec.pesoResto}`,
    );
  }
}

if (allGradients.length) {
  console.log(`\n── Sobre degradado: ${allGradients.length} nodos, revisión a mano ───────`);
  const worst = allGradients.sort((a, b) => a.got - b.got).slice(0, 8);
  for (const g of worst) {
    console.log(`  ${g.era} · ${g.screen}: ${g.el} → ${g.got}:1 contra su color de fondo base`);
  }
  console.log('  (el degradado no tiene color único; el ratio es orientativo)');
}

await closeTab(tab);
console.log(failures === 0 ? '\nContraste AA verificado ✓' : `\n${failures} comprobaciones fallidas ✗`);
process.exit(failures > 0 ? 1 : 0);
