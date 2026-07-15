import type { SalaryTier, Specialty } from '../core/model/staff';
import type { ScaleStage } from '../core/model/gameState';

/**
 * Contenido editable del personal: pools de nombres para la generación
 * determinista de candidatos (PRNG con semilla) y etiquetas legibles.
 */

export const firstNames: readonly string[] = [
  'Ada', 'Bruno', 'Carmen', 'Dani', 'Elena', 'Fede', 'Gala', 'Hugo',
  'Iris', 'Jorge', 'Karla', 'Leo', 'Marta', 'Nico', 'Olga', 'Pablo',
  'Quima', 'Rosa', 'Sergio', 'Tania', 'Ulises', 'Vera', 'Xavi', 'Yago',
];

export const lastNames: readonly string[] = [
  'Aguirre', 'Bravo', 'Cordero', 'Delgado', 'Escudero', 'Ferrer', 'Gallardo', 'Herrera',
  'Ibáñez', 'Juárez', 'Lozano', 'Manrique', 'Navarro', 'Oliva', 'Pons', 'Quintana',
  'Riquelme', 'Salgado', 'Tovar', 'Urrutia', 'Valdés', 'Zabala', 'Montes', 'Peralta',
];

export const specialtyLabels: Record<Specialty, string> = {
  diseno: 'Diseño',
  tecnica: 'Técnica',
  arte: 'Arte',
  audio: 'Audio',
  marketing: 'Marketing',
};

export const tierLabels: Record<SalaryTier, string> = {
  junior: 'Junior',
  senior: 'Senior',
  estrella: 'Estrella',
};

export const stageLabels: Record<ScaleStage, string> = {
  1: 'Garaje',
  2: 'Estudio pequeño',
  3: 'Estudio consolidado',
  4: 'Corporación',
};

/**
 * Quién eres y qué decides en cada etapa (docs/02 §4, tabla de docs/16 §3.2).
 * Los REQUISITOS no se escriben aquí: se leen de balance vía `scaleStageInfo`,
 * que es lo que comprueba `advanceScale` (docs/17 U1).
 */
export const stageRoles: Record<ScaleStage, string> = {
  1: 'Creador',
  2: 'Líder de equipo',
  3: 'Director',
  4: 'Magnate',
};

export const stageFocus: Record<ScaleStage, string> = {
  1: 'Haces el juego con tus manos: sin plantilla, sin nóminas y sin red.',
  2: 'Contratas, asignas y gestionas la moral. El estudio deja de ser solo tú.',
  3: 'Diriges: varios equipos y proyectos en paralelo, y un portfolio que mantener.',
  4: 'Estrategia macro y gestión por políticas. La planta entera es tuya.',
};

/**
 * Motivos por los que el botón de contratar se deshabilita (docs/17 B1). La
 * lógica los elige en core/systems/staff.ts (hireBlockReason); la UI solo los
 * muestra como texto visible. Copy centralizado aquí, junto al resto de
 * etiquetas del personal.
 */
export const hireBlockedLabels = {
  gameOver: 'La partida ha terminado',
  garage: 'En el garaje no cabe nadie más: consigue capital para mudarte',
  officeFull: 'Oficina llena — mejórala',
  noFunds: 'No te llega el capital para contratar',
} as const;
