/**
 * API pública del núcleo de simulación (docs/08 §3). Todo lo que esté fuera
 * de core/ (state/, save/, ui/) importa desde aquí, no de los módulos internos.
 */
export type { EraDef, EraId } from './model/era';
export type { GameOverInfo, GameState, LogEntry, ScaleStage, Studio } from './model/gameState';
export type { Award } from './model/awards';
export type {
  MarketKnowledge,
  ResearchNodeDef,
  ResearchState,
  StudioCapability,
} from './model/research';
export type { SalaryPolicy, StudioPolicies } from './model/policies';
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
export type {
  CurvePoint,
  MarketState,
  PlatformMarketState,
  PlatformStage,
  ReviewMarketInfo,
  Segment,
  TrendDirection,
  TrendStage,
  TrendState,
} from './model/market';
export type {
  ActiveScandal,
  CashflowEntry,
  DebtSource,
  LegacyProfile,
  LegacyTrackedStats,
  MonetizationConfig,
  MonetizationModel,
  RegulationState,
  ReputationVector,
} from './model/moral';
export type {
  ActiveCrisis,
  CommunityPost,
  CommunityState,
  CreatorArchetype,
  CrisisCause,
  CrisisResponseId,
  CrisisStatus,
  DilemmaKind,
  PendingDilemma,
  PostMood,
  ReviewBomb,
  StreamResult,
  StreamTier,
} from './model/community';

export { makeRng } from './engine/rng';
export type { Rng } from './engine/rng';
export { tick } from './engine/tick';
export { createInitialState, createSandboxState, initialLegacyStats } from './engine/initialState';
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
  findProject,
  phaseWeeks,
  projectCap,
  projectProgress,
  projectTotalWeeks,
  releasedGameCost,
  setFocus,
  sizeBlockReason,
  startProject,
  toggleFeature,
} from './systems/projects';
export type { ProjectConcept } from './systems/projects';
export { advanceEras } from './systems/eras';
export {
  addReleaseResearchPoints,
  advanceResearch,
  balanceRevealed,
  buyResearch,
  capabilityBonus,
  fitRevealed,
  initialResearchState,
  insightKey,
  insightKnown,
  isStarterTheme,
  marketKnowledge,
  priceRevealed,
  researchInsight,
  researchNodeStatus,
  researchTheme,
  themeResearchCost,
  themeResearchStatus,
  toggleResearchAssignment,
} from './systems/research';
export { advanceAwards, pickCategoryWinner } from './systems/awards';
export {
  advancePolicies,
  defaultPolicies,
  policiesUnlocked,
  salaryCostFactor,
  setPolicies,
} from './systems/policies';
export {
  availableCreatorDefs,
  availableFeatures,
  availableGenres,
  availableMonetizationModels,
  availablePlatforms,
  availableThemes,
  featureAvailable,
  genreAvailable,
  monetizationFlagAvailable,
  researchableThemes,
  themeAvailable,
} from './systems/unlocks';
export { buildReviewLines, reviewVerdict } from './systems/review';
export { advanceSales, weeklyRevenue } from './systems/sales';
export {
  advanceMarket,
  clampHype,
  comboKey,
  comboPopularity,
  computeSegmentReviews,
  createMarketState,
  curveValueAt,
  effectiveSaturation,
  expectedWeeklyUnits,
  marketSize,
  overHypeGap,
  platformAvailable,
  platformStage,
  priceModifier,
  registerReleaseSaturation,
  saturationModifier,
  trendDirection,
  trendStage,
} from './systems/market';
export type { SalesContext, SegmentReviewsInput, SegmentReviewsResult } from './systems/market';
export {
  advanceEconomy,
  availableCredit,
  creditLimit,
  estimateRunwayWeeks,
  launchMarketingCampaign,
  recordIncome,
  repayLoan,
  takeLoan,
  weeklyFixedCosts,
} from './systems/economy';
export {
  addReputationDebt,
  advanceMoral,
  advanceRegulation,
  applyReleaseMoralEffects,
  hasMtx,
  isRehash,
  lootBoxesBanned,
  nudgeMoralDrift,
  scandalChance,
  scandalCushion,
  scandalMagnitude,
  scandalSalesFactor,
  topDebtSource,
} from './systems/morale';
export {
  aggregateReputation,
  applyReputationDeltas,
  communitySalesModifier,
  employerPoolModifiers,
  initialReputation,
  mergeDeltas,
  reputationDeltasFromReviews,
  withReputationDeltas,
} from './systems/reputation';
export type { ReputationDeltas } from './systems/reputation';
export {
  advanceCommunity,
  applyReleaseCommunityEffects,
  assignCreatorKey,
  availableCreators,
  bombSalesFactor,
  computeStreamOutcome,
  creatorFit,
  initialCommunityState,
  keysAllowed,
  resolveDilemma,
  respondToCrisis,
  sentimentSalesModifier,
  spawnCrisis,
  visibleReview,
} from './systems/community';
export type { DilemmaChoice } from './systems/community';
export { computeLegacy, retireStudio } from './systems/legacy';
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
  hireBlockReason,
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
