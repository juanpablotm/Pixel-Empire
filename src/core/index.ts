/**
 * API pública del núcleo de simulación (docs/08 §3). Todo lo que esté fuera
 * de core/ (state/, save/, ui/) importa desde aquí, no de los módulos internos.
 */
export type { EraId } from './model/era';
export type { GameOverInfo, GameState, LogEntry, ScaleStage, Studio } from './model/gameState';
export type { Employee, SalaryTier, Specialty, TeamFactorResult } from './model/staff';
export type {
  Audience,
  DevPhaseNumber,
  FocusAllocation,
  Project,
  ProjectSize,
} from './model/project';
export type {
  FactorTone,
  QualityBreakdown,
  QualityFactor,
  ReleasedGame,
  ReviewLine,
} from './model/release';
export type {
  DevAspect,
  DevPhaseSpec,
  Feature,
  Genre,
  Platform,
  Theme,
  Trait,
} from './model/content';

export { makeRng } from './engine/rng';
export type { Rng } from './engine/rng';
export { tick } from './engine/tick';
export { createInitialState } from './engine/initialState';
export { createGameLoop, SPEEDS } from './engine/gameLoop';
export type { GameLoop, Speed } from './engine/gameLoop';

export {
  computeFit,
  computeQuality,
  computeBugLevel,
  fitBand,
  realDesignShare,
} from './systems/quality';
export type { ConceptDraft, FitBand, FitResult, QualityContext } from './systems/quality';
export {
  advanceProjects,
  estimateProject,
  phaseWeeks,
  projectProgress,
  projectTotalWeeks,
  setFocus,
  startProject,
  toggleFeature,
} from './systems/projects';
export type { ProjectConcept } from './systems/projects';
export { buildReviewLines, reviewVerdict } from './systems/review';
export { advanceSales, expectedUnits } from './systems/sales';
export { advanceEconomy } from './systems/economy';
export {
  advanceScale,
  advanceStaff,
  applyReleaseMorale,
  computeSynergy,
  computeTeamFactor,
  computeTeamOutput,
  createFounder,
  crunchSensitivity,
  fireEmployee,
  generateCandidates,
  hireCandidate,
  hiringCost,
  motivateEmployee,
  salaryTierOf,
  setCrunch,
  staffCap,
  teamInnovationBonus,
  toggleAssignment,
  trainEmployee,
} from './systems/staff';
export type { MotivationKind } from './systems/staff';
