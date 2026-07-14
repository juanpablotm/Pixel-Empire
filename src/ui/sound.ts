import type { GameState } from '../core';
import { balance } from '../data/balance';
import { useGameStore } from '../state/store';

/**
 * Capa de sonido procedural (Fase 7G, docs/10 §12 [DECIDIDO · opcional]):
 * blips, chime de buena reseña, thud grave de crisis y hum ambiental de
 * oficina, todo sintetizado con Web Audio — sin un solo archivo de audio.
 *
 * Reglas de la casa:
 * - Presentación pura (docs/08): el director OBSERVA cambios de estado y
 *   sonoriza; jamás calcula reglas de juego ni corre dentro del tick.
 * - El juego es perfecto muteado: toggle + volumen en el store (persistidos),
 *   y si Web Audio no existe (tests/jsdom) todo es un no-op silencioso.
 * - Autoplay: el navegador exige un gesto para arrancar el audio; el motor se
 *   desbloquea con el primer pointerdown/keydown y se re-arma si el contexto
 *   vuelve a suspenderse (pestaña oculta, etc.).
 */

// ---------------------------------------------------------------------------
// Eventos sonoros: diff puro de estado → qué debe sonar (testeable sin audio)
// ---------------------------------------------------------------------------

export type SoundEvent =
  | 'tick'
  | 'unlock'
  | 'reviewGood'
  | 'reviewOk'
  | 'reviewBad'
  | 'threat'
  | 'award'
  | 'era';

/**
 * Qué suena al pasar de un estado al siguiente (puro, sin Web Audio):
 * el director lo consume, y los tests lo verifican con estados fabricados.
 */
export function soundEventsFrom(prev: GameState, next: GameState): SoundEvent[] {
  const events: SoundEvent[] = [];
  const morale = balance.staff.releaseMorale;

  if (next.releasedGames.length > prev.releasedGames.length) {
    const latest = next.releasedGames[next.releasedGames.length - 1];
    if (latest.review >= morale.hitReview) events.push('reviewGood');
    else if (latest.review <= morale.flopReview) events.push('reviewBad');
    else events.push('reviewOk');
  }

  const openCrises = (s: GameState) =>
    s.community.crises.filter((c) => c.status === 'abierta').length;
  const activeScandals = (s: GameState) => s.scandals.filter((sc) => sc.weeksLeft > 0).length;
  if (
    openCrises(next) > openCrises(prev) ||
    activeScandals(next) > activeScandals(prev) ||
    next.community.bombs.length > prev.community.bombs.length ||
    (next.gameOver !== null && prev.gameOver === null)
  ) {
    events.push('threat');
  }

  if (next.studio.awards.length > prev.studio.awards.length) events.push('award');
  if (next.era !== prev.era) events.push('era');
  if (
    next.research.unlocked.length > prev.research.unlocked.length ||
    next.staff.length > prev.staff.length
  ) {
    events.push('unlock');
  }
  // El latido del reloj, solo si no hay nada más ruidoso esta semana.
  if (next.week > prev.week && events.length === 0) events.push('tick');

  return events;
}

// ---------------------------------------------------------------------------
// Motor Web Audio (voces sintetizadas)
// ---------------------------------------------------------------------------

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  /** Cadena del hum ambiental (arranca bajo demanda). */
  hum: { source: AudioBufferSourceNode; gain: GainNode } | null;
  analyser: AnalyserNode;
}

let engine: Engine | null = null;
let lastTickAt = 0;

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/** true si este entorno puede sonar (no jsdom/tests). */
export function soundSupported(): boolean {
  return audioContextCtor() !== null;
}

function ensureEngine(): Engine | null {
  if (engine) return engine;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    master.gain.value = masterLevel();
    engine = { ctx, master, hum: null, analyser };
    return engine;
  } catch {
    return null;
  }
}

/** Nivel maestro perceptual: volumen² (0..1) o 0 con el toggle apagado. */
function masterLevel(): number {
  const { soundOn, soundVolume } = useGameStore.getState();
  return soundOn ? soundVolume * soundVolume : 0;
}

function refreshMaster(): void {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  engine.master.gain.cancelScheduledValues(t);
  engine.master.gain.linearRampToValueAtTime(masterLevel(), t + 0.15);
}

/** Una nota corta con envolvente (sin clics). */
function note(
  e: Engine,
  freq: number,
  opts: {
    type?: OscillatorType;
    at?: number;
    dur?: number;
    vol?: number;
    glideTo?: number;
  } = {},
): void {
  const { type = 'triangle', at = 0, dur = 0.18, vol = 0.15, glideTo } = opts;
  const t0 = e.ctx.currentTime + at;
  const osc = e.ctx.createOscillator();
  const gain = e.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(e.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Ráfaga de ruido filtrado (para el thud y el riser de era). */
function noiseBurst(
  e: Engine,
  opts: { at?: number; dur?: number; vol?: number; cutoff?: number } = {},
): void {
  const { at = 0, dur = 0.15, vol = 0.12, cutoff = 240 } = opts;
  const t0 = e.ctx.currentTime + at;
  const buffer = e.ctx.createBuffer(1, Math.ceil(e.ctx.sampleRate * dur), e.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    // Ruido "marrón": integra ruido blanco (grave, sin siseo).
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = e.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = e.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = e.ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(e.master);
  source.start(t0);
  source.stop(t0 + dur + 0.02);
}

/** Toca un evento sonoro concreto (docs/10 §12: mezcla sutil). */
export function playSoundEvent(event: SoundEvent): void {
  const e = ensureEngine();
  if (!e || e.ctx.state !== 'running' || masterLevel() <= 0) return;
  switch (event) {
    case 'tick': {
      // El blip del reloj, con freno: a x4 no debe ametrallar.
      const now = performance.now();
      if (now - lastTickAt < 180) return;
      lastTickAt = now;
      note(e, 1660, { type: 'square', dur: 0.03, vol: 0.028 });
      break;
    }
    case 'unlock':
      note(e, 880, { type: 'square', dur: 0.06, vol: 0.07 });
      note(e, 1174.7, { type: 'square', at: 0.07, dur: 0.09, vol: 0.07 });
      break;
    case 'reviewGood':
      // El chime de la buena reseña: arpegio mayor ascendente.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        note(e, f, { at: i * 0.09, dur: 0.5, vol: 0.11 }),
      );
      break;
    case 'reviewOk':
      note(e, 659.25, { dur: 0.16, vol: 0.08 });
      note(e, 783.99, { at: 0.1, dur: 0.22, vol: 0.08 });
      break;
    case 'reviewBad':
      // Dos notas que se desinflan.
      note(e, 392, { type: 'sine', dur: 0.3, vol: 0.12, glideTo: 370 });
      note(e, 311.13, { type: 'sine', at: 0.24, dur: 0.42, vol: 0.12, glideTo: 277 });
      break;
    case 'threat':
      // El thud grave de crisis/escándalo/bombing.
      note(e, 130, { type: 'sine', dur: 0.32, vol: 0.5, glideTo: 41 });
      noiseBurst(e, { dur: 0.22, vol: 0.16, cutoff: 200 });
      break;
    case 'award':
      // Fanfarria dorada de la gala: arpegio largo con pedal grave.
      note(e, 261.63, { type: 'sine', dur: 0.9, vol: 0.1 });
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        note(e, f, { at: i * 0.11, dur: 0.55, vol: 0.1 }),
      );
      break;
    case 'era':
      // El mundo cambia: barrido que sube y campanada suave.
      note(e, 160, { type: 'sawtooth', dur: 0.85, vol: 0.05, glideTo: 640 });
      noiseBurst(e, { dur: 0.8, vol: 0.05, cutoff: 700 });
      note(e, 659.25, { at: 0.75, dur: 0.7, vol: 0.11 });
      note(e, 987.77, { at: 0.85, dur: 0.8, vol: 0.09 });
      break;
  }
}

// ---------------------------------------------------------------------------
// Hum ambiental de la oficina (bucle de ruido grave, casi subliminal)
// ---------------------------------------------------------------------------

function humTargetLevel(): number {
  const { appMode, speed, soundOn } = useGameStore.getState();
  if (!soundOn || appMode !== 'game') return 0;
  // La oficina respira más fuerte con el tiempo corriendo.
  return speed > 0 ? 0.05 : 0.024;
}

function refreshHum(): void {
  const e = engine;
  if (!e || e.ctx.state !== 'running') return;
  const target = humTargetLevel();
  if (target > 0 && e.hum === null) {
    // Bucle de ruido marrón de 2 s + paso bajo: el runrún de la oficina.
    const seconds = 2;
    const buffer = e.ctx.createBuffer(1, e.ctx.sampleRate * seconds, e.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = e.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = e.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    const gain = e.ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(e.master);
    source.start();
    e.hum = { source, gain };
  }
  if (e.hum) {
    const t = e.ctx.currentTime;
    e.hum.gain.gain.cancelScheduledValues(t);
    e.hum.gain.gain.linearRampToValueAtTime(target, t + 0.6);
  }
}

// ---------------------------------------------------------------------------
// Desbloqueo por gesto (autoplay policy) + director
// ---------------------------------------------------------------------------

let unlockArmed = false;

/** Arma listeners de gesto que intentan arrancar/reanudar el contexto. */
function armGestureUnlock(): void {
  if (unlockArmed || !soundSupported() || typeof window === 'undefined') return;
  unlockArmed = true;
  const tryUnlock = () => {
    const e = ensureEngine();
    if (!e) return disarm();
    void e.ctx.resume().then(() => {
      if (e.ctx.state === 'running') {
        disarm();
        refreshMaster();
        refreshHum();
      }
    });
  };
  const disarm = () => {
    window.removeEventListener('pointerdown', tryUnlock, true);
    window.removeEventListener('keydown', tryUnlock, true);
    unlockArmed = false;
  };
  window.addEventListener('pointerdown', tryUnlock, true);
  window.addEventListener('keydown', tryUnlock, true);
}

let directorStarted = false;

/**
 * Arranca el director de sonido: observa el store (fuera de React, como el
 * confeti) y sonoriza los cambios. Idempotente; no-op sin Web Audio.
 */
export function initSoundDirector(): void {
  if (directorStarted || !soundSupported()) return;
  directorStarted = true;
  armGestureUnlock();

  // Si la pestaña vuelve y el contexto quedó suspendido, re-armar el gesto.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && engine && engine.ctx.state !== 'running') {
        armGestureUnlock();
      }
    });
  }

  useGameStore.subscribe((state, prev) => {
    if (state.game !== prev.game) {
      for (const event of soundEventsFrom(prev.game, state.game)) {
        playSoundEvent(event);
      }
    }
    if (
      state.soundOn !== prev.soundOn ||
      state.soundVolume !== prev.soundVolume ||
      state.appMode !== prev.appMode ||
      state.speed !== prev.speed
    ) {
      // Encender el sonido cuenta como gesto: intenta reanudar ya.
      if (state.soundOn && !prev.soundOn && engine && engine.ctx.state !== 'running') {
        void engine.ctx.resume();
      }
      if (state.soundOn && engine === null) armGestureUnlock();
      refreshMaster();
      refreshHum();
    }
  });

  // Testigo para verificación externa (CDP) solo en dev: estado y disparos.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as Window & { __peSound?: unknown }).__peSound = {
      state: () => engine?.ctx.state ?? 'sin-motor',
      play: (event: SoundEvent) => playSoundEvent(event),
      level: () => {
        if (!engine) return 0;
        const data = new Float32Array(engine.analyser.fftSize);
        engine.analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (const sample of data) sum += sample * sample;
        return Math.sqrt(sum / data.length);
      },
      debug: () => ({
        state: engine?.ctx.state ?? 'sin-motor',
        currentTime: engine?.ctx.currentTime ?? -1,
        sampleRate: engine?.ctx.sampleRate ?? -1,
        masterGain: engine?.master.gain.value ?? -1,
        humGain: engine?.hum?.gain.gain.value ?? -1,
        humAlive: engine?.hum !== null,
      }),
    };
  }
}
