import type { Employee, Project, ScaleStage } from '../../core';
import { getDevPhase } from '../../data/devPhases';
import { stageLabels } from '../../data/staffTexts';
import { useGameStore } from '../../state/store';
import { hashFraction } from '../motion';
import { CROWN_PATH } from '../theme/BrandMark';
import { particleScale } from '../theme/motionTokens';
import { avatarLook, type AvatarLook } from './Avatar';

/**
 * La Oficina Viva (docs/10 §5, innovación I1): escena de estudio por código
 * (SVG flat) que actúa de termómetro del equipo. Solo presentación: lee el
 * estado con selectores finos y lo traduce a luz, poses, props y burbujas.
 * Toda la animación es CSS (ui/index.css), desacoplada del tick (docs/08);
 * misma semilla → misma micro-vida (delays derivados por hash, sin RNG).
 */

// ---------------------------------------------------------------------------
// Humor de la oficina (docs/10 §5.2): prioridad crisis > fiesta > crunch > moral
// ---------------------------------------------------------------------------

type OfficeMood = 'crisis' | 'fiesta' | 'crunch' | 'baja' | 'alta' | 'normal';

/** Semanas tras el lanzamiento durante las que la oficina celebra un hit. */
const PARTY_WEEKS = 2;
/** Nota a partir de la cual un lanzamiento es un "hitazo" que se celebra con
 * confeti, aquí y en la gala de reseña (docs/10 §7.1). Umbral de presentación. */
export const HIT_REVIEW = 80;

// ---------------------------------------------------------------------------
// Burbujas de desarrollo (docs/10 §5.4): color por aspecto, 🐛 con bugDebt
// ---------------------------------------------------------------------------

/** 🔵 diseño · 🟢 técnica · 🟣 creatividad · 🟠 arte · 🔴 bug — legibles en todas las pieles. */
const BUBBLE_COLORS = {
  dis: '#5b8ef5',
  tec: '#43b96f',
  crea: '#a06bf0',
  arte: '#f09a3f',
  bug: '#e05252',
} as const;

type BubbleKind = keyof typeof BUBBLE_COLORS;

/** A qué burbuja aporta cada aspecto de desarrollo (data/devPhases.ts). */
const ASPECT_BUBBLE: Record<string, Exclude<BubbleKind, 'bug'> | undefined> = {
  motor: 'tec',
  jugabilidad: 'dis',
  historia: 'crea',
  dialogos: 'crea',
  nivelMundo: 'dis',
  ia: 'tec',
  graficos: 'arte',
  sonido: 'arte',
  qa: undefined, // el QA no emite orbes: los quita (reduce bugDebt)
};

/** Mezcla de colores de orbes según el reparto de esfuerzo real y la deuda de bugs. */
function bubbleMix(project: Project): { color: string; w: number }[] {
  const spec = getDevPhase(project.phase);
  const focus = project.focus[project.phase - 1];
  const acc: Record<Exclude<BubbleKind, 'bug'>, number> = { dis: 0, tec: 0, crea: 0, arte: 0 };
  let total = 0;
  for (const aspect of spec.aspects) {
    const kind = ASPECT_BUBBLE[aspect.id];
    const share = focus[aspect.id] ?? 0;
    if (kind) {
      acc[kind] += share;
      total += share;
    }
  }
  const bugW = Math.min(0.45, project.bugDebt / (project.bugDebt + 12));
  const mix: { color: string; w: number }[] = [];
  if (total <= 0) {
    mix.push({ color: BUBBLE_COLORS.tec, w: 1 - bugW });
  } else {
    for (const kind of ['dis', 'tec', 'crea', 'arte'] as const) {
      if (acc[kind] > 0) mix.push({ color: BUBBLE_COLORS[kind], w: (acc[kind] / total) * (1 - bugW) });
    }
  }
  if (bugW > 0.02) mix.push({ color: BUBBLE_COLORS.bug, w: bugW });
  return mix;
}

/** Elige un color de la mezcla con una fracción determinista 0..1. */
function pickBubbleColor(mix: { color: string; w: number }[], f: number): string {
  const total = mix.reduce((sum, m) => sum + m.w, 0) || 1;
  let cursor = f * total;
  for (const m of mix) {
    cursor -= m.w;
    if (cursor <= 0) return m.color;
  }
  return mix[mix.length - 1]?.color ?? BUBBLE_COLORS.tec;
}

function BubbleColumn({ project, seedKey }: { project: Project; seedKey: string }) {
  const mix = bubbleMix(project);
  const dur = project.crunch ? 2.3 : 3.2;
  return (
    <g aria-hidden>
      {[0, 1, 2].map((i) => {
        const f = hashFraction(`${seedKey}:${project.id}:${project.phase}:${i}`);
        return (
          <circle
            key={i}
            className="office-bubble"
            cx={-26 + (f - 0.5) * 12}
            cy={-64}
            r={2.6 + f * 1.6}
            fill={pickBubbleColor(mix, hashFraction(`${seedKey}:c${i}:${project.phase}`))}
            style={{ animationDuration: `${dur}s`, animationDelay: `${(-(f + i / 3) * dur).toFixed(2)}s` }}
          />
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// La gente (docs/10 §5.1): figura procedural sentada, con micro-vida por semilla
// ---------------------------------------------------------------------------

type WorkerPose = 'work' | 'slump' | 'cheer' | 'panic';

const PANTS = '#232936';
const SHOE = '#161a22';
const MUG = '#d9d3c5';

/** Pelo adaptado de Avatar.tsx a la cabeza de la escena (centro 25,-63 · r 7,5). */
function WorkerHair({ look }: { look: AvatarLook }) {
  const { hair, hairStyle } = look;
  if (hairStyle === 0) return <path d="M 17.5 -63 a 7.5 7.5 0 0 1 15 0 z" fill={hair} />;
  if (hairStyle === 1)
    return (
      <>
        <rect x="28" y="-68" width="5" height="13" rx="2.5" fill={hair} />
        <path d="M 17.5 -63 a 7.5 7.5 0 0 1 15 0 z" fill={hair} />
      </>
    );
  if (hairStyle === 2)
    return (
      <>
        <circle cx="25" cy="-69.5" r="5.6" fill={hair} />
        <circle cx="20" cy="-67" r="3.6" fill={hair} />
        <circle cx="30" cy="-67" r="3.6" fill={hair} />
      </>
    );
  return (
    <>
      <ellipse cx="25" cy="-69.6" rx="6" ry="2.8" fill={hair} />
      <circle cx="32" cy="-68.5" r="2.6" fill={hair} />
    </>
  );
}

/**
 * Una persona del equipo en su silla, mirando a su monitor (a la izquierda).
 * La pose refleja el humor; la micro-vida idle (variante por semilla) va en
 * clases CSS con delays negativos deterministas: nada queda sincronizado.
 */
function Worker({ employee, pose, working }: { employee: Employee; pose: WorkerPose; working: boolean }) {
  const look = avatarLook(employee.avatarSeed);
  const f = hashFraction(employee.id);
  const idleVariant = look.hash % 3; // 0 café · 1 estirón · 2 ideas
  const delay = (period: number) => ({ animationDelay: `${(-f * period).toFixed(2)}s` });

  const upperPose =
    pose === 'slump' ? 'translate(1 2.5) rotate(-8 28 -30)' : undefined;

  return (
    <g className={pose === 'panic' ? 'office-panic' : undefined}>
      {/* silla de oficina */}
      <rect x="22" y="-30" width="16" height="4" rx="2" fill="var(--surface-control)" />
      <rect x="36" y="-48" width="4" height="20" rx="2" fill="var(--surface-control)" />
      <rect x="28" y="-26" width="4" height="11" fill="var(--surface-control)" />
      <rect x="22" y="-15" width="16" height="3" rx="1.5" fill="var(--surface-control)" />

      {/* piernas (las tapa el borde de la mesa al dibujarse ésta después) */}
      <rect x="12" y="-34" width="16" height="6" rx="3" fill={PANTS} />
      <rect x="10" y="-30" width="5" height="28" rx="2" fill={PANTS} />
      <rect x="4" y="-4" width="11" height="4" rx="2" fill={SHOE} />

      {/* tronco + cabeza, con la pose del humor */}
      <g transform={upperPose}>
        <g className={idleVariant === 1 && pose !== 'cheer' && pose !== 'panic' ? 'office-stretch' : undefined} style={delay(13)}>
          <rect x="20" y="-56" width="15" height="28" rx="6" fill={look.shirt} />

          {/* brazos según pose */}
          {pose === 'cheer' ? (
            <g className="office-cheer" style={delay(0.9)}>
              <rect x="17" y="-68" width="4.5" height="17" rx="2.2" fill={look.shirt} transform="rotate(24 21 -52)" />
              <rect x="32" y="-68" width="4.5" height="17" rx="2.2" fill={look.shirt} transform="rotate(-24 34 -52)" />
              <circle cx="13.5" cy="-66" r="2.4" fill={look.skin} />
              <circle cx="40" cy="-66" r="2.4" fill={look.skin} />
            </g>
          ) : pose === 'panic' ? (
            <g>
              {/* el móvil: la crisis se sigue en directo (docs/10 §5.2) */}
              <rect x="12" y="-56" width="14" height="4.5" rx="2.2" fill={look.shirt} transform="rotate(-38 24 -52)" />
              <rect x="12.2" y="-64" width="4" height="7" rx="1" fill="#0e1118" />
              <rect x="13" y="-63.2" width="2.4" height="4" rx="0.5" fill="var(--skin-accent, #34d399)" opacity="0.9" />
              <text x="25" y="-76" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent-danger-hi)" className="office-alarm">
                !
              </text>
            </g>
          ) : (
            <g className={working ? 'office-type' : undefined} style={delay(0.6)}>
              <rect x="6" y="-52" width="19" height="4.5" rx="2.2" fill={look.shirt} transform="rotate(26 24 -50)" />
              <circle cx="8" cy="-43.5" r="2.2" fill={look.skin} />
            </g>
          )}

          {/* cabeza */}
          <g transform={pose === 'slump' ? 'rotate(-7 25 -56)' : undefined}>
            <circle cx="25" cy="-63" r="7.5" fill={look.skin} />
            <WorkerHair look={look} />
            <circle cx="20.5" cy="-64" r="1" fill="#1f2937" />
            {look.hasGlasses && (
              <g stroke="#1f2937" strokeWidth="0.9" fill="none">
                <circle cx="20.5" cy="-64" r="2.6" />
                <path d="M 23.1 -64 h 3.4" />
              </g>
            )}
            {pose === 'cheer' ? (
              <path d="M 19.5 -58.5 q 2 2.2 4.5 0" stroke="#7c2d12" strokeWidth="1" fill="none" />
            ) : pose === 'slump' || pose === 'panic' ? (
              <path d="M 19.5 -57.5 h 3.6" stroke="#7c2d12" strokeWidth="1" fill="none" />
            ) : (
              <path d="M 19.5 -58 q 1.8 1.4 3.8 0" stroke="#7c2d12" strokeWidth="1" fill="none" />
            )}
          </g>
        </g>
      </g>

      {/* idea ocasional 💡 (docs/10 §5.1) — solo con buen ánimo */}
      {idleVariant === 2 && (pose === 'work' || pose === 'cheer') && (
        <g className="office-idea" style={delay(11)} aria-hidden>
          <circle cx="25" cy="-79" r="3.4" fill="var(--accent-warn-hi)" />
          <rect x="23.8" y="-75.8" width="2.4" height="2.2" rx="0.6" fill="var(--surface-control-hi)" />
          <g stroke="var(--accent-warn-hi)" strokeWidth="0.9" strokeLinecap="round">
            <path d="M 25 -85 v 2" />
            <path d="M 19.6 -82.4 l 1.6 1.2" />
            <path d="M 30.4 -82.4 l -1.6 1.2" />
          </g>
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// El puesto de trabajo: mesa, monitor (CRT en E1–E3), teclado, café y burbujas
// ---------------------------------------------------------------------------

interface DeskSpot {
  x: number;
  y: number;
  s: number;
}

function Desk({
  spot,
  employee,
  crt,
  mood,
  project,
  night,
}: {
  spot: DeskSpot;
  employee: Employee | null;
  crt: boolean;
  mood: OfficeMood;
  project: Project | null;
  night: boolean;
}) {
  const occupied = employee !== null;
  const crunch = project?.crunch ?? false;
  const pose: WorkerPose =
    mood === 'crisis'
      ? 'panic'
      : mood === 'fiesta'
        ? 'cheer'
        : mood === 'crunch'
          ? 'slump'
          : mood === 'baja' && employee !== null && avatarLook(employee.avatarSeed).hash % 2 === 0
            ? 'slump'
            : 'work';
  const f = employee ? hashFraction(employee.id) : 0;
  const screenOn = occupied;

  return (
    <g transform={`translate(${spot.x} ${spot.y}) scale(${spot.s})`}>
      {project && employee && (
        <title>
          {`${employee.name} — Diseño ${Math.round(project.designPoints)} · Técnica ${Math.round(project.techPoints)} · Deuda de bugs ${project.bugDebt.toFixed(1)}`}
        </title>
      )}
      <ellipse cx="0" cy="1" rx="52" ry="5" fill="#000" opacity="0.14" />

      {/* la persona primero: el tablero le tapa las piernas */}
      {employee && <Worker employee={employee} pose={pose} working={project !== null && mood !== 'fiesta'} />}

      {/* mesa */}
      <rect x="-40" y="-40" width="58" height="5" rx="2" fill="var(--surface-control-hi)" />
      <rect x="-37" y="-35" width="5" height="35" fill="var(--surface-control)" />
      <rect x="12" y="-35" width="5" height="35" fill="var(--surface-control)" />

      {/* monitor: caja CRT en E1–E3, panel plano después (docs/10 §5.2, era) */}
      {crt ? (
        <g>
          <rect x="-36" y="-58" width="18" height="18" rx="2" fill="var(--surface-control)" />
          <rect
            x="-19.5"
            y="-55"
            width="2.6"
            height="13"
            rx="1"
            fill={screenOn ? 'var(--skin-accent, #34d399)' : 'var(--surface-raised)'}
            opacity={screenOn ? 0.95 : 1}
          />
          <rect x="-33" y="-43.5" width="12" height="1.4" rx="0.7" fill="var(--surface-raised)" />
        </g>
      ) : (
        <g>
          <rect x="-27" y="-60" width="3.4" height="17" rx="1.2" fill="var(--surface-control-hi)" />
          <rect
            x="-23.4"
            y="-58"
            width="1.8"
            height="13"
            rx="0.9"
            fill={screenOn ? 'var(--skin-accent, #34d399)' : 'var(--surface-raised)'}
            opacity={screenOn ? 0.95 : 1}
          />
          <rect x="-26.5" y="-43" width="2.4" height="3" fill="var(--surface-control)" />
          <rect x="-31" y="-40.6" width="12" height="1.8" rx="0.9" fill="var(--surface-control)" />
        </g>
      )}

      {/* haz de luz de la pantalla hacia la cara */}
      {screenOn && (
        <polygon
          points="-17,-55 -17,-43 12,-46 6,-57"
          fill="var(--skin-accent, #34d399)"
          opacity="0.07"
        />
      )}

      {/* teclado */}
      {occupied && <rect x="2" y="-42.5" width="12" height="2.5" rx="1" fill="var(--surface-control)" />}

      {/* café: una taza siempre; en crunch, la pila crece (docs/10 §5.2) */}
      {occupied && (
        <g>
          <g
            className={avatarLook(employee!.avatarSeed).hash % 3 === 0 && (pose === 'work' || pose === 'slump') ? 'office-sip' : undefined}
            style={{ animationDelay: `${(-f * 9).toFixed(2)}s` }}
          >
            <rect x="-9" y="-47.5" width="7" height="7" rx="1.2" fill={MUG} />
            <path d="M -2 -45.8 a 2.2 2.2 0 1 1 0 3.4" fill="none" stroke={MUG} strokeWidth="1.4" />
            <path className="office-steam" d="M -6.5 -49 q 1 -2 0 -4" stroke="#ffffff" strokeWidth="0.9" fill="none" opacity="0.4" style={{ animationDelay: `${(-f * 2.8).toFixed(2)}s` }} />
          </g>
          {crunch && (
            <g aria-hidden>
              <rect x="-16" y="-46.5" width="6" height="6" rx="1" fill={MUG} transform="rotate(-9 -13 -43)" opacity="0.9" />
              <rect x="-13" y="-52" width="6" height="6" rx="1" fill={MUG} transform="rotate(6 -10 -49)" opacity="0.85" />
              <rect x="6" y="-48.5" width="6" height="6" rx="1" fill={MUG} transform="rotate(12 9 -45)" opacity="0.9" />
            </g>
          )}
        </g>
      )}

      {/* brillo rojo de "horas extra" bajo el monitor (crunch, docs/10 §5.2) */}
      {crunch && (
        <g aria-hidden>
          <rect x="-36" y="-40.8" width="17" height="1.6" rx="0.8" fill="var(--accent-danger)" opacity="0.85" />
          <ellipse cx="-27" cy="-40" rx="14" ry="6" fill="var(--accent-danger)" opacity="0.12" />
        </g>
      )}

      {/* lámpara cálida en la noche del crunch */}
      {night && occupied && <ellipse cx="-8" cy="-46" rx="30" ry="16" fill="#ffd9a0" opacity="0.13" aria-hidden />}

      {/* burbujas de desarrollo (docs/10 §5.4) */}
      {project && employee && mood !== 'fiesta' && <BubbleColumn project={project} seedKey={employee.id} />}

      {/* pantallas con ↑ de ventas en la fiesta (docs/10 §5.2) */}
      {mood === 'fiesta' && occupied && (
        <g className="office-float" stroke="var(--accent-ok)" strokeWidth="2" fill="none" strokeLinecap="round" aria-hidden>
          <path d="M -26 -64 v -10" />
          <path d="M -31 -69 l 5 -6 5 6" />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Atrezzo de la sala
// ---------------------------------------------------------------------------

function Window({ x, y, w, h, night, skyline }: { x: number; y: number; w: number; h: number; night: boolean; skyline?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={night ? 'url(#office-sky-night)' : 'url(#office-sky-day)'} stroke="var(--border-line-hi)" strokeWidth="2.5" />
      {night ? (
        <g aria-hidden>
          <circle cx={x + w * 0.72} cy={y + h * 0.3} r={Math.min(w, h) * 0.11} fill="#f5f0d8" opacity="0.9" />
          <circle cx={x + w * 0.25} cy={y + h * 0.25} r="1.2" fill="#f5f0d8" opacity="0.8" />
          <circle cx={x + w * 0.45} cy={y + h * 0.5} r="1" fill="#f5f0d8" opacity="0.6" />
          <circle cx={x + w * 0.15} cy={y + h * 0.6} r="1" fill="#f5f0d8" opacity="0.7" />
        </g>
      ) : (
        <g aria-hidden>
          <circle cx={x + w * 0.26} cy={y + h * 0.3} r={Math.min(w, h) * 0.13} fill="#fff7d6" opacity="0.85" />
          <ellipse cx={x + w * 0.62} cy={y + h * 0.34} rx={w * 0.16} ry={h * 0.07} fill="#ffffff" opacity="0.55" />
        </g>
      )}
      {skyline && (
        <g fill={night ? '#101b3a' : '#7fa3c8'} aria-hidden>
          <rect x={x + w * 0.1} y={y + h * 0.55} width={w * 0.12} height={h * 0.45 - 3} />
          <rect x={x + w * 0.28} y={y + h * 0.4} width={w * 0.14} height={h * 0.6 - 3} />
          <rect x={x + w * 0.5} y={y + h * 0.62} width={w * 0.1} height={h * 0.38 - 3} />
          <rect x={x + w * 0.68} y={y + h * 0.48} width={w * 0.16} height={h * 0.52 - 3} />
        </g>
      )}
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="var(--border-line-hi)" strokeWidth="2" />
      <rect x={x - 4} y={y + h} width={w + 8} height="4" rx="2" fill="var(--border-line-hi)" />
    </g>
  );
}

/** Reloj de pared: 10:10 de día; 23:05 y halo rojo si hay crunch (docs/10 §5.2). */
function WallClock({ x, y, crunch }: { x: number; y: number; crunch: boolean }) {
  return (
    <g>
      {crunch && <circle cx={x} cy={y} r="14" fill="var(--accent-danger)" className="office-wash" aria-hidden />}
      <circle cx={x} cy={y} r="10" fill="var(--surface-raised)" stroke={crunch ? 'var(--accent-danger)' : 'var(--border-line-hi)'} strokeWidth="2" />
      <line x1={x} y1={y} x2={x} y2={y - 5} stroke="var(--text-mute)" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${crunch ? 330 : 300} ${x} ${y})`} />
      <line x1={x} y1={y} x2={x} y2={y - 7.5} stroke="var(--text-mute)" strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${crunch ? 30 : 60} ${x} ${y})`} />
      <circle cx={x} cy={y} r="1.2" fill={crunch ? 'var(--accent-danger)' : 'var(--text-mute)'} />
    </g>
  );
}

/** El emblema del estudio en la pared; con humo y alerta en crisis. */
function LogoSign({ x, y, crisis }: { x: number; y: number; crisis: boolean }) {
  return (
    <g>
      <rect x={x - 27} y={y - 20} width="54" height="40" rx="6" fill="var(--surface-raised)" stroke="var(--border-line)" />
      <g transform={`translate(${x - 19.2} ${y - 14.4}) scale(0.8)`}>
        <path d={CROWN_PATH} fill="none" stroke="var(--skin-accent, #34d399)" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {crisis && (
        <g aria-hidden>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              className="office-smoke"
              cx={x - 8 + i * 9}
              cy={y - 24}
              r={3.5 + i}
              fill="var(--text-faint)"
              style={{ animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <g className="office-alarm">
            <path d={`M ${x + 34} ${y - 20} l 7 12 h -14 z`} fill="var(--accent-danger)" />
            <rect x={x + 33.2} y={y - 15.5} width="1.6" height="4.5" rx="0.8" fill="var(--text-oncolor)" />
            <circle cx={x + 34} cy={y - 9.6} r="0.9" fill="var(--text-oncolor)" />
          </g>
        </g>
      )}
    </g>
  );
}

/** Planta de oficina: sana con moral alta, mustia con moral baja (docs/10 §5.2). */
function Plant({ x, y, wilted, s = 1 }: { x: number; y: number; wilted: boolean; s?: number }) {
  const leaf = wilted ? 'var(--accent-warn)' : 'var(--accent-ok)';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -8 -14 h 16 l -2.5 14 h -11 z" fill="var(--surface-control-hi)" />
      {wilted ? (
        <g fill={leaf}>
          <ellipse cx="-7" cy="-16" rx="7" ry="2.6" transform="rotate(38 -7 -16)" />
          <ellipse cx="7" cy="-15" rx="7" ry="2.6" transform="rotate(-42 7 -15)" />
          <ellipse cx="13" cy="-2" rx="4.5" ry="1.8" transform="rotate(18 13 -2)" opacity="0.8" />
        </g>
      ) : (
        <g fill={leaf}>
          <ellipse cx="0" cy="-24" rx="3" ry="9" />
          <ellipse cx="-6" cy="-20" rx="2.6" ry="7.5" transform="rotate(-28 -6 -20)" />
          <ellipse cx="6" cy="-20" rx="2.6" ry="7.5" transform="rotate(28 6 -20)" />
        </g>
      )}
    </g>
  );
}

/** Sofá viejo del garaje (docs/10 §5.3). */
function Sofa({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="-30" width="78" height="14" rx="5" fill="var(--surface-control-hi)" />
      <rect x="0" y="-42" width="10" height="26" rx="4" fill="var(--surface-control-hi)" />
      <rect x="68" y="-42" width="10" height="26" rx="4" fill="var(--surface-control-hi)" />
      <rect x="4" y="-40" width="66" height="12" rx="4" fill="var(--surface-control)" />
      <rect x="12" y="-34" width="24" height="6" rx="3" fill="var(--skin-accent, #34d399)" opacity="0.4" />
      <rect x="42" y="-34" width="24" height="6" rx="3" fill="var(--skin-accent, #34d399)" opacity="0.25" />
      <rect x="4" y="-16" width="5" height="6" fill="var(--surface-control)" />
      <rect x="69" y="-16" width="5" height="6" fill="var(--surface-control)" />
    </g>
  );
}

/** Puerta de garaje con lamas (etapa 1). */
function GarageDoor({ x, w, night }: { x: number; w: number; night: boolean }) {
  return (
    <g>
      <rect x={x} y="36" width={w} height="216" rx="4" fill="var(--surface-raised)" stroke="var(--border-line-hi)" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={x + 6} y1={68 + i * 32} x2={x + w - 6} y2={68 + i * 32} stroke="var(--border-line-hi)" strokeWidth="2" opacity="0.8" />
      ))}
      <rect x={x + w / 2 - 8} y="224" width="16" height="4" rx="2" fill="var(--border-line-hi)" />
      {!night && <rect x={x + 4} y="40" width={w - 8} height="10" fill="#fff7d6" opacity="0.18" aria-hidden />}
    </g>
  );
}

/** Cajas de cartón de la mudanza eterna (etapa 1). */
function Boxes({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="-22" width="30" height="22" rx="2" fill="#a97b4f" />
      <line x1="15" y1="-22" x2="15" y2="0" stroke="#8a6238" strokeWidth="3" />
      <rect x="5" y="-40" width="24" height="18" rx="2" fill="#b98a5c" transform="rotate(-4 17 -31)" />
      <line x1="7" y1="-31" x2="28" y2="-32.5" stroke="#8a6238" strokeWidth="3" />
    </g>
  );
}

/** Estantería con juegos y trofeos (etapa 2+). */
function Shelf({ x, y }: { x: number; y: number }) {
  const books = ['#5b8ef5', '#e05252', '#f09a3f', '#43b96f', '#a06bf0'];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="80" height="4" rx="2" fill="var(--surface-control-hi)" />
      <rect x="0" y="34" width="80" height="4" rx="2" fill="var(--surface-control-hi)" />
      {books.map((c, i) => (
        <rect key={i} x={6 + i * 11} y={-16 - (i % 2) * 3} width="7" height={16 + (i % 2) * 3} rx="1" fill={c} opacity="0.85" />
      ))}
      <path d="M 14 30 l 5 -10 l 5 10 z" fill="var(--accent-capital)" transform="translate(30 4)" />
      <rect x="8" y="24" width="12" height="10" rx="1" fill="var(--surface-control)" />
    </g>
  );
}

/** Pizarra de diseño con el gráfico soñado (etapa 3+). */
function Whiteboard({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-45" y="-28" width="90" height="56" rx="3" fill="#f2efe6" stroke="var(--border-line-hi)" strokeWidth="2.5" />
      <polyline points="-34,14 -18,4 -4,8 12,-8 30,-16" fill="none" stroke="#43b96f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M -34 -16 h 26" stroke="#5b8ef5" strokeWidth="2" strokeLinecap="round" />
      <path d="M -34 -9 h 18" stroke="#5b8ef5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <circle cx="26" cy="10" r="5" fill="none" stroke="#e05252" strokeWidth="2" />
      <rect x="-20" y="28" width="40" height="3" rx="1.5" fill="var(--surface-control-hi)" />
    </g>
  );
}

/** Rack de servidores parpadeante (etapa 4). */
function ServerRack({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="-86" width="36" height="86" rx="3" fill="#10141c" stroke="var(--border-line-hi)" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="4" y={-78 + i * 20} width="28" height="12" rx="1.5" fill="var(--surface-control)" />
          <circle className="office-led" cx="26" cy={-72 + i * 20} r="1.6" fill={i % 2 === 0 ? '#43b96f' : '#f09a3f'} style={{ animationDelay: `${i * 0.55}s` }} />
          <circle cx="21" cy={-72 + i * 20} r="1.4" fill="var(--surface-raised)" />
        </g>
      ))}
    </g>
  );
}

/** Sala de reuniones acristalada al fondo (etapa 4). */
function MeetingRoom({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="var(--skin-accent, #34d399)" opacity="0.05" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--border-line-hi)" strokeWidth="2" />
      <line x1={x + w / 3} y1={y} x2={x + w / 3} y2={y + h} stroke="var(--border-line-hi)" strokeWidth="1.4" opacity="0.7" />
      <line x1={x + (2 * w) / 3} y1={y} x2={x + (2 * w) / 3} y2={y + h} stroke="var(--border-line-hi)" strokeWidth="1.4" opacity="0.7" />
      {/* dentro: mesa, pantalla con gráfico y dos siluetas reunidas */}
      <rect x={x + w * 0.2} y={y + h - 26} width={w * 0.55} height="5" rx="2" fill="var(--surface-control-hi)" />
      <rect x={x + w * 0.3} y={y + h - 21} width="4" height="16" fill="var(--surface-control)" />
      <rect x={x + w * 0.6} y={y + h - 21} width="4" height="16" fill="var(--surface-control)" />
      <rect x={x + w * 0.32} y={y + 16} width={w * 0.36} height="24" rx="2" fill="var(--surface-control)" />
      <polyline
        points={`${x + w * 0.36},${y + 32} ${x + w * 0.45},${y + 26} ${x + w * 0.54},${y + 29} ${x + w * 0.63},${y + 22}`}
        fill="none"
        stroke="var(--accent-ok)"
        strokeWidth="1.6"
      />
      <g fill="var(--text-faint)" opacity="0.75">
        <circle cx={x + w * 0.16} cy={y + h - 42} r="5" />
        <rect x={x + w * 0.16 - 4.5} y={y + h - 37} width="9" height="18" rx="4" />
        <circle cx={x + w * 0.84} cy={y + h - 40} r="5" />
        <rect x={x + w * 0.84 - 4.5} y={y + h - 35} width="9" height="16" rx="4" />
      </g>
    </g>
  );
}

/** Fluorescente colgado; de noche proyecta su cono (etapas 3–4). */
function CeilingLight({ x, night }: { x: number; night: boolean }) {
  return (
    <g aria-hidden>
      <line x1={x} y1="0" x2={x} y2="10" stroke="var(--border-line-hi)" strokeWidth="1.5" />
      <rect x={x - 30} y="10" width="60" height="5" rx="2.5" fill="var(--surface-raised)" stroke="var(--border-line)" />
      {night && <polygon points={`${x - 26},15 ${x + 26},15 ${x + 44},96 ${x - 44},96`} fill="#ffd9a0" opacity="0.07" />}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Distribución por etapa de escala (docs/10 §5.3): la cámara se aleja
// ---------------------------------------------------------------------------

const SCENE_H = 280;

const LAYOUTS: Record<ScaleStage, { width: number; desks: DeskSpot[] }> = {
  // Garaje: un par de puestos apretados entre cajas.
  1: {
    width: 500,
    desks: [
      { x: 268, y: 250, s: 1.12 },
      { x: 412, y: 250, s: 1.12 },
    ],
  },
  // Estudio pequeño: una sala con 4 puestos.
  2: {
    width: 640,
    desks: [
      { x: 122, y: 250, s: 0.98 },
      { x: 272, y: 250, s: 0.98 },
      { x: 422, y: 250, s: 0.98 },
      { x: 572, y: 250, s: 0.98 },
    ],
  },
  // Open space: dos filas.
  3: {
    width: 760,
    desks: [
      { x: 112, y: 252, s: 0.84 },
      { x: 282, y: 252, s: 0.84 },
      { x: 452, y: 252, s: 0.84 },
      { x: 622, y: 252, s: 0.84 },
      { x: 152, y: 206, s: 0.72 },
      { x: 312, y: 206, s: 0.72 },
      { x: 472, y: 206, s: 0.72 },
      { x: 632, y: 206, s: 0.72 },
    ],
  },
  // Estudio grande: planta amplia, sala de cristal y servidores.
  4: {
    width: 880,
    desks: [
      { x: 96, y: 254, s: 0.72 },
      { x: 226, y: 254, s: 0.72 },
      { x: 356, y: 254, s: 0.72 },
      { x: 486, y: 254, s: 0.72 },
      { x: 616, y: 254, s: 0.72 },
      { x: 746, y: 254, s: 0.72 },
      { x: 132, y: 206, s: 0.6 },
      { x: 252, y: 206, s: 0.6 },
      { x: 372, y: 206, s: 0.6 },
      { x: 492, y: 206, s: 0.6 },
      { x: 612, y: 206, s: 0.6 },
      { x: 732, y: 206, s: 0.6 },
    ],
  },
  // Corporación: la torre — tres filas, doble sala y granja de servidores.
  5: {
    width: 980,
    desks: [
      { x: 84, y: 256, s: 0.66 },
      { x: 198, y: 256, s: 0.66 },
      { x: 312, y: 256, s: 0.66 },
      { x: 426, y: 256, s: 0.66 },
      { x: 540, y: 256, s: 0.66 },
      { x: 654, y: 256, s: 0.66 },
      { x: 110, y: 214, s: 0.56 },
      { x: 216, y: 214, s: 0.56 },
      { x: 322, y: 214, s: 0.56 },
      { x: 428, y: 214, s: 0.56 },
      { x: 534, y: 214, s: 0.56 },
      { x: 640, y: 214, s: 0.56 },
      { x: 152, y: 180, s: 0.48 },
      { x: 300, y: 180, s: 0.48 },
      { x: 448, y: 180, s: 0.48 },
      { x: 596, y: 180, s: 0.48 },
    ],
  },
};

const CONFETTI_COLORS = ['#5b8ef5', '#43b96f', '#a06bf0', '#f09a3f', '#e8b44a', '#eb6a6a'];

// ---------------------------------------------------------------------------
// La escena
// ---------------------------------------------------------------------------

export function OfficeScene() {
  const staff = useGameStore((s) => s.game.staff);
  const scaleStage = useGameStore((s) => s.game.studio.scaleStage);
  const era = useGameStore((s) => s.game.era);
  const projects = useGameStore((s) => s.game.projects);
  const week = useGameStore((s) => s.game.week);
  const speed = useGameStore((s) => s.speed);
  const crisisOpen = useGameStore((s) => s.game.community.crises.some((c) => c.status === 'abierta'));
  const bombing = useGameStore((s) => s.game.community.bombs.length > 0);
  const lastGame = useGameStore((s) => s.game.releasedGames[s.game.releasedGames.length - 1] ?? null);

  // Agregados de presentación (la UI no calcula reglas, solo resume para pintar).
  const avgMorale =
    staff.length === 0 ? 50 : staff.reduce((sum, e) => sum + e.morale, 0) / staff.length;
  const crunch = projects.some((p) => p.crunch);
  const fiesta =
    lastGame !== null && week - lastGame.releaseWeek <= PARTY_WEEKS && lastGame.review >= HIT_REVIEW;
  const crisis = crisisOpen || bombing;
  const mood: OfficeMood = crisis
    ? 'crisis'
    : fiesta
      ? 'fiesta'
      : crunch
        ? 'crunch'
        : avgMorale < 40
          ? 'baja'
          : avgMorale >= 65
            ? 'alta'
            : 'normal';
  const night = mood === 'crunch';
  const wilted = avgMorale < 40 || mood === 'crunch';
  const crt = era === 'E1' || era === 'E2' || era === 'E3';

  const layout = LAYOUTS[scaleStage];
  const W = layout.width;
  const seated = layout.desks.map((spot, i) => ({ spot, employee: staff[i] ?? null }));
  const projectFor = (employee: Employee | null): Project | null => {
    if (!employee) return null;
    return projects.find((p) => p.assignedStaff.includes(employee.id)) ?? null;
  };

  const moodText: Record<OfficeMood, string> = {
    crisis: 'La oficina está en modo pánico: hay una crisis en marcha.',
    fiesta: 'La oficina celebra el último lanzamiento.',
    crunch: 'Es de noche y se trabaja en crunch: el café se acumula.',
    baja: 'El ánimo está por los suelos.',
    alta: 'El ambiente es cálido y productivo.',
    normal: 'Una semana normal en el estudio.',
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${SCENE_H}`}
      className={`office block h-auto w-full ${speed === 0 ? 'office-paused' : ''}`}
      role="img"
      aria-label={`Oficina del estudio (${stageLabels[scaleStage]}): ${staff.length} ${
        staff.length === 1 ? 'persona' : 'personas'
      }, moral media ${Math.round(avgMorale)}. ${moodText[mood]}`}
    >
      <defs>
        <linearGradient id="office-sky-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fb2e5" />
          <stop offset="100%" stopColor="#cfe7f7" />
        </linearGradient>
        <linearGradient id="office-sky-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1233" />
          <stop offset="100%" stopColor="#233257" />
        </linearGradient>
      </defs>

      {/* pared y suelo */}
      <rect x="0" y="0" width={W} height="252" fill="color-mix(in oklab, var(--surface-raised) 45%, var(--surface-panel))" />
      <rect x="0" y="252" width={W} height={SCENE_H - 252} fill="color-mix(in oklab, var(--surface-control) 55%, var(--surface-app))" />
      <rect x="0" y="248" width={W} height="4" fill="var(--border-line)" />

      {/* atrezzo por etapa (docs/10 §5.3) */}
      {scaleStage === 1 && (
        <g>
          <GarageDoor x={16} w={130} night={night} />
          <Window x={196} y={58} w={110} h={80} night={night} />
          <LogoSign x={368} y={78} crisis={crisis} />
          <WallClock x={458} y={62} crunch={crunch} />
          <Sofa x={54} y={252} />
          <Boxes x={152} y={252} />
          <Plant x={478} y={252} wilted={wilted} s={0.9} />
          <ellipse cx={330} cy={262} rx={120} ry={7} fill="var(--skin-accent, #34d399)" opacity="0.07" aria-hidden />
        </g>
      )}
      {scaleStage === 2 && (
        <g>
          <Window x={64} y={54} w={124} h={86} night={night} />
          <Window x={296} y={54} w={124} h={86} night={night} />
          <LogoSign x={510} y={76} crisis={crisis} />
          <WallClock x={592} y={58} crunch={crunch} />
          <Shelf x={452} y={128} />
          <Plant x={30} y={252} wilted={wilted} />
          <ellipse cx={330} cy={264} rx={190} ry={8} fill="var(--skin-accent, #34d399)" opacity="0.06" aria-hidden />
        </g>
      )}
      {scaleStage === 3 && (
        <g>
          <CeilingLight x={190} night={night} />
          <CeilingLight x={380} night={night} />
          <CeilingLight x={570} night={night} />
          <Window x={56} y={48} w={150} h={82} night={night} skyline />
          <Window x={302} y={48} w={150} h={82} night={night} skyline />
          <Window x={548} y={48} w={150} h={82} night={night} skyline />
          <LogoSign x={380} y={152} crisis={crisis} />
          <WallClock x={732} y={54} crunch={crunch} />
          <Whiteboard x={708} y={172} />
          <Plant x={26} y={252} wilted={wilted} />
          <Plant x={736} y={252} wilted={wilted} />
        </g>
      )}
      {scaleStage === 4 && (
        <g>
          <CeilingLight x={140} night={night} />
          <CeilingLight x={310} night={night} />
          <CeilingLight x={480} night={night} />
          <Window x={44} y={38} w={150} h={76} night={night} skyline />
          <Window x={234} y={38} w={150} h={76} night={night} skyline />
          <Window x={424} y={38} w={150} h={76} night={night} skyline />
          <MeetingRoom x={644} y={88} w={222} h={162} />
          <LogoSign x={606} y={150} crisis={crisis} />
          <WallClock x={614} y={52} crunch={crunch} />
          <ServerRack x={18} y={250} />
          <Plant x={76} y={252} wilted={wilted} />
          <Plant x={628} y={252} wilted={wilted} s={0.85} />
        </g>
      )}
      {scaleStage === 5 && (
        <g>
          <CeilingLight x={120} night={night} />
          <CeilingLight x={280} night={night} />
          <CeilingLight x={440} night={night} />
          <CeilingLight x={600} night={night} />
          <Window x={36} y={34} w={140} h={72} night={night} skyline />
          <Window x={212} y={34} w={140} h={72} night={night} skyline />
          <Window x={388} y={34} w={140} h={72} night={night} skyline />
          <Window x={564} y={34} w={140} h={72} night={night} skyline />
          <MeetingRoom x={732} y={70} w={230} h={180} />
          <LogoSign x={700} y={140} crisis={crisis} />
          <WallClock x={706} y={44} crunch={crunch} />
          <ServerRack x={16} y={250} />
          <ServerRack x={52} y={250} />
          <Plant x={104} y={252} wilted={wilted} s={0.85} />
          <Plant x={700} y={252} wilted={wilted} s={0.85} />
        </g>
      )}

      {/* los puestos: fila del fondo primero (orden z) */}
      {[...seated]
        .map((entry, i) => ({ ...entry, i }))
        .sort((a, b) => a.spot.y - b.spot.y)
        .map(({ spot, employee, i }) => (
          <Desk
            key={i}
            spot={spot}
            employee={employee}
            crt={crt}
            mood={mood}
            project={projectFor(employee)}
            night={night}
          />
        ))}

      {/* capa de luz: el humor tiñe la sala (docs/10 §5.2) */}
      {night && <rect x="0" y="0" width={W} height={SCENE_H} fill="#0a1128" opacity="0.34" aria-hidden />}
      {mood === 'baja' && <rect x="0" y="0" width={W} height={SCENE_H} fill="#2b3242" opacity="0.16" aria-hidden />}
      {mood === 'alta' && <rect x="0" y="0" width={W} height={SCENE_H} fill="var(--accent-capital)" opacity="0.05" aria-hidden />}
      {crisis && <rect x="0" y="0" width={W} height={SCENE_H} fill="var(--accent-danger)" className="office-wash" aria-hidden />}

      {/* confeti del hit (docs/10 §5.2) — partículas con presupuesto
          (docs/10 §4.3), fuera con reduced-motion */}
      {mood === 'fiesta' && (
        <g aria-hidden>
          {Array.from({ length: Math.round(26 * particleScale()) }, (_, i) => {
            const f = hashFraction(`confeti:${i}`);
            const g = hashFraction(`confeti-b:${i}`);
            return (
              <rect
                key={i}
                className="office-confetti"
                x={f * W}
                y={-12}
                width={3.4 + g * 3}
                height={5 + f * 3}
                rx="1"
                fill={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
                transform={`rotate(${Math.round(f * 60 - 30)} ${f * W} 0)`}
                style={{
                  animationDuration: `${(2.2 + g * 1.6).toFixed(2)}s`,
                  animationDelay: `${(-f * 3.8).toFixed(2)}s`,
                }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
