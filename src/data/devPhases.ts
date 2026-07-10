import type { DevPhaseSpec } from '../core/model/content';
import type { DevPhaseNumber } from '../core/model/project';

/**
 * Las 3 fases de desarrollo y sus aspectos (docs/02 §2 paso 3). Los pesos
 * mapean el esfuerzo a Diseño/Técnica según docs/03 factor B (Diseño =
 * creatividad, historia, jugabilidad; Técnica = motor, gráficos, rendimiento);
 * el esfuerzo en QA no puntúa balance: reduce la deuda de bugs (factor D).
 */
export const devPhases: readonly DevPhaseSpec[] = [
  {
    phase: 1,
    name: 'Concepto',
    aspects: [
      { id: 'motor', name: 'Motor', designWeight: 0, techWeight: 1, qaWeight: 0 },
      { id: 'jugabilidad', name: 'Jugabilidad', designWeight: 1, techWeight: 0, qaWeight: 0 },
      { id: 'historia', name: 'Historia', designWeight: 1, techWeight: 0, qaWeight: 0 },
    ],
  },
  {
    phase: 2,
    name: 'Producción',
    aspects: [
      { id: 'dialogos', name: 'Diálogos', designWeight: 1, techWeight: 0, qaWeight: 0 },
      { id: 'nivelMundo', name: 'Nivel y mundo', designWeight: 0.5, techWeight: 0.5, qaWeight: 0 },
      { id: 'ia', name: 'IA', designWeight: 0, techWeight: 1, qaWeight: 0 },
    ],
  },
  {
    phase: 3,
    name: 'Pulido',
    aspects: [
      { id: 'graficos', name: 'Gráficos', designWeight: 0, techWeight: 1, qaWeight: 0 },
      { id: 'sonido', name: 'Sonido', designWeight: 0.5, techWeight: 0.5, qaWeight: 0 },
      { id: 'qa', name: 'Corrección de bugs (QA)', designWeight: 0, techWeight: 0, qaWeight: 1 },
    ],
  },
];

export function getDevPhase(phase: DevPhaseNumber): DevPhaseSpec {
  const spec = devPhases.find((p) => p.phase === phase);
  if (!spec) throw new Error(`Fase de desarrollo desconocida: ${phase}`);
  return spec;
}
