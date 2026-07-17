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
  3: 'Estudio',
  4: 'Estudio grande',
  5: 'Corporación',
};

/**
 * Quién eres y qué decides en cada etapa (docs/02 §4, tabla de docs/16 §3.2).
 * Los REQUISITOS y el COSTE de ampliar no se escriben aquí: se leen de balance
 * vía `scaleStageInfo`, que es lo que valida `expandStudio` (docs/17 U1).
 */
export const stageRoles: Record<ScaleStage, string> = {
  1: 'Creador',
  2: 'Líder de equipo',
  3: 'Director',
  4: 'Ejecutivo',
  5: 'Magnate',
};

export const stageFocus: Record<ScaleStage, string> = {
  1: 'Haces el juego con tus manos: sin plantilla, sin nóminas y sin red.',
  2: 'Contratas, asignas y gestionas la moral. El estudio deja de ser solo tú.',
  3: 'Diriges: dos equipos en paralelo y un portfolio que mantener.',
  4: 'Escala de verdad: varios proyectos grandes a la vez, políticas y una nómina que quema.',
  5: 'Estrategia macro y gestión por políticas. La planta entera es tuya… y devora éxitos.',
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

/**
 * Motivos por los que la ampliación de estudio está bloqueada (docs/18 V4-c).
 * El núcleo los elige en core/systems/staff.ts (expandBlockReason); la UI de
 * la cronología de escala solo los muestra junto al botón deshabilitado.
 */
export const expandBlockedLabels = {
  gameOver: 'La partida ha terminado',
  maxStage: 'Ya eres una Corporación: no hay etapa mayor',
  capital: (amount: string) => `Necesitas ${amount} en caja`,
  staff: (n: number) => `Necesitas ${n} personas en plantilla`,
} as const;

/**
 * El titular del log al comprar cada ampliación (docs/02 §4): cada etapa es
 * uno de los grandes momentos de recompensa. Los topes concretos los pone el
 * núcleo al interpolar (expandStudio), leyéndolos de balance.
 */
export const expandLogTexts: Record<Exclude<ScaleStage, 1>, (staffCap: number, projectCap: number) => string> = {
  2: (staffCap) =>
    `El estudio sale del garaje a una oficina pequeña: ya puedes contratar (hasta ${staffCap} personas).`,
  3: (staffCap, projectCap) =>
    `Tu Estudio estrena open space: hasta ${staffCap} personas y ${projectCap} proyectos en paralelo. Ahora diriges.`,
  4: (staffCap, projectCap) =>
    `Estudio grande: una planta entera, hasta ${staffCap} personas, ${projectCap} proyectos y gestión por políticas. La nómina empieza a pesar.`,
  5: (staffCap, projectCap) =>
    `CORPORACIÓN: la torre es tuya. Hasta ${projectCap} proyectos y ${staffCap} personas. Eres el magnate… y este imperio se paga cada semana.`,
};
