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
