import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore, type GameStore } from '../../state/store';
import { PopIn } from '../components/Motion';
import { tutorialSteps } from './steps';

/**
 * La capa de guía del tutorial (Fase 7F, docs/10 §13): dibuja un foco
 * (spotlight) sobre el control REAL del paso actual y una tarjeta con la
 * instrucción. Nunca bloquea: el telón deja pasar los clics, el jugador pulsa
 * el control de verdad y el paso avanza observando el estado (steps.ts).
 * "Saltar tutorial" está siempre visible (docs/13 7F: no frena al experto).
 *
 * Sin requestAnimationFrame: el ancla se re-mide con un intervalo barato +
 * resize/scroll; el movimiento del foco es una transición CSS con los tokens
 * (ui/index.css .tour-spotlight), apagada con "Reducir animaciones".
 */

/** Aire del foco alrededor del control resaltado (px). */
const SPOT_PAD = 6;
/** Geometría de la tarjeta de instrucción (px). */
const TIP_WIDTH = 320;
const TIP_GAP = 12;
const TIP_MARGIN = 12;
const TIP_EST_HEIGHT = 170;
/** Cadencia de re-medición del ancla (ms); no es animación, solo layout. */
const MEASURE_MS = 300;

function sameRect(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function TutorialGuide() {
  const stepIndex = useGameStore((s) => s.tutorialStep);
  const advance = useGameStore((s) => s.advanceTutorial);
  const end = useGameStore((s) => s.endTutorial);

  const step =
    stepIndex !== null && stepIndex < tutorialSteps.length ? tutorialSteps[stepIndex] : null;
  const finished = stepIndex !== null && stepIndex >= tutorialSteps.length;

  // Fin del guion: marcar completado y apagar la capa.
  useEffect(() => {
    if (finished) end();
  }, [finished, end]);

  // Avance por acción real: observa el store; el guard sobre tutorialStep
  // evita avances dobles mientras la suscripción vieja se desmonta.
  useEffect(() => {
    const when = step?.advanceWhen;
    if (!when || stepIndex === null) return;
    const check = (s: GameStore) => {
      if (s.tutorialStep === stepIndex && when(s)) advance();
    };
    check(useGameStore.getState());
    return useGameStore.subscribe(check);
  }, [step, stepIndex, advance]);

  // Medición del ancla `data-tour` del paso (null mientras no exista en el DOM).
  const [rect, setRect] = useState<DOMRect | null>(null);
  const foundRef = useRef(false);
  useEffect(() => {
    setRect(null);
    foundRef.current = false;
    const target = step?.target;
    if (!target || step.quiet) return;

    const measure = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      if (!foundRef.current) {
        foundRef.current = true;
        // Primer avistamiento: traer el control a la vista (salto directo;
        // 'smooth' sería movimiento no esencial). jsdom no lo implementa.
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      const next = el.getBoundingClientRect();
      setRect((prev) => (prev !== null && sameRect(prev, next) ? prev : next));
    };

    measure();
    const timer = window.setInterval(measure, MEASURE_MS);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  if (!step || stepIndex === null) return null;

  const counter = (
    <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      🎓 Tutorial · paso {stepIndex + 1} de {tutorialSteps.length}
    </p>
  );
  const skipButton = (
    <button type="button" onClick={end} className="btn btn-ghost px-2 py-1 text-xs">
      Saltar tutorial
    </button>
  );
  const nextButton = step.nextLabel ? (
    <button type="button" onClick={advance} className="btn btn-primary px-3 py-1.5 text-sm">
      {step.nextLabel}
    </button>
  ) : null;

  // Chip discreto: pasos "quiet" y anclas que aún no están en pantalla
  // (p. ej. el desglose de la reseña mientras dura la gala). Nunca estorba.
  if (step.quiet || (step.target !== null && rect === null)) {
    return (
      <Layer className="bottom-14 left-4">
        <PopIn
          key={step.id}
          className="pointer-events-auto card flex max-w-xs flex-col gap-1.5 px-4 py-3"
        >
          {counter}
          <p className="text-sm font-semibold text-ink-hi">{step.title}</p>
          <p className="text-xs text-ink-mute">{step.body}</p>
          <div className="mt-1 flex items-center gap-2">
            {nextButton}
            {skipButton}
          </div>
        </PopIn>
      </Layer>
    );
  }

  // Tarjeta centrada (bienvenida/cierre): telón suave que deja pasar clics.
  if (step.target === null) {
    return (
      <Layer className="inset-0 flex items-center justify-center bg-scrim px-6">
        <PopIn key={step.id} className="pointer-events-auto card modal-panel flex w-96 max-w-full flex-col gap-2">
          {counter}
          <p className="text-lg font-semibold text-ink-hi">{step.title}</p>
          <p className="text-sm text-ink">{step.body}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            {skipButton}
            {nextButton}
          </div>
        </PopIn>
      </Layer>
    );
  }

  // Foco sobre el control real: el "agujero" es un box-shadow gigante y el
  // propio foco no captura punteros — el clic cae en el control de verdad.
  if (rect === null) return null; // (inalcanzable: el modo chip ya lo cubre)
  const spot = {
    top: rect.top - SPOT_PAD,
    left: rect.left - SPOT_PAD,
    width: rect.width + SPOT_PAD * 2,
    height: rect.height + SPOT_PAD * 2,
  };
  const below = rect.bottom + TIP_GAP + TIP_EST_HEIGHT < window.innerHeight;
  const tipLeft = clamp(
    rect.left + rect.width / 2 - TIP_WIDTH / 2,
    TIP_MARGIN,
    Math.max(TIP_MARGIN, window.innerWidth - TIP_WIDTH - TIP_MARGIN),
  );
  const tipStyle = below
    ? { top: rect.bottom + TIP_GAP + SPOT_PAD, left: tipLeft }
    : { bottom: window.innerHeight - spot.top + TIP_GAP, left: tipLeft };

  return (
    <Layer className="inset-0">
      <div className="tour-spotlight" style={spot} />
      <div className="absolute w-80 max-w-[calc(100vw-1.5rem)]" style={tipStyle}>
        <PopIn
          key={step.id}
          className="pointer-events-auto card flex flex-col gap-1.5 px-4 py-3"
        >
          {counter}
          <p className="text-sm font-semibold text-ink-hi">{step.title}</p>
          <p className="text-sm text-ink">{step.body}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {skipButton}
            {nextButton ?? <span className="text-xs italic text-ink-faint">te toca a ti</span>}
          </div>
        </PopIn>
      </div>
    </Layer>
  );
}

/** Capa fija de la guía: sobre el contenido (y el tinte moral), bajo los
 *  modales de crisis/dilema (z-40) — una crisis real manda más que la guía. */
function Layer({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`pointer-events-none fixed z-[35] ${className}`}>{children}</div>;
}
