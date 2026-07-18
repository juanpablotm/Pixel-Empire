/**
 * API pública del núcleo de simulación (docs/08 §3). Todo lo que esté fuera
 * de core/ (state/, save/, ui/) importa desde aquí, no de los módulos internos.
 */
export type { EraDef, EraId } from './model/era';
export type { GameOverInfo, GameState, LogEntry, ScaleStage, Studio } from './model/gameState';
export type {
  Award,
  AwardCategoryResult,
  AwardCeremony,
  AwardNominee,
} from './model/awards';
export type {
  MarketKnowledge,
  ResearchNodeDef,
  ResearchState,
  StudioCapability,
} from './model/research';
export type { SalaryPolicy, StudioPolicies } from './model/policies';
export type { Squad } from './model/squad';
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
  FeatureAffinity,
  Genre,
  Platform,
  Theme,
  Trait,
} from './model/content';
export type {
  CurvePoint,
  Fever,
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
  bestKeySkill01,
  computeCeilingContext,
  keySpecialtyOf,
  maturity01,
  studioExperience,
  teamPower,
} from './systems/maturity';
export type { CeilingContext } from './systems/maturity';
export type {
  EngineBuild,
  EngineCapabilityDef,
  EngineCapabilityId,
  LicensedEngineDef,
  OwnedEngine,
} from './model/engine';
export {
  adequacyBand,
  advanceEngineBuild,
  availableLicensedEngines,
  buildableCapabilities,
  capabilityBuildable,
  engineAdequacy01,
  engineBuildBlockReason,
  engineBuildCost,
  engineDemand,
  engineHasCapability,
  engineMaxPlatforms,
  engineReferenceAdequacy01,
  engineTechLevel,
  getOwnedEngine,
  maxBuildableGeneration,
  resolveEngine,
  startEngineBuild,
} from './systems/engines';
export type {
  AdequacyBand,
  EngineBuildCost,
  EngineBuildSpec,
  ResolvedEngine,
} from './systems/engines';
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
export { advanceEras, eraNovelties } from './systems/eras';
export type { EraNovelties } from './systems/eras';
export {
  addReleaseResearchPoints,
  advanceResearch,
  balanceRevealed,
  buyResearch,
  capabilityBonus,
  featureFitRevealed,
  featureInsightKey,
  fitRevealed,
  initialResearchState,
  insightKey,
  insightKnown,
  learnFeatureInsights,
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
export {
  assignSquadToProject,
  createSquad,
  disbandSquad,
  getSquads,
  renameSquad,
  setSquadMembers,
  squadMembers,
  squadOf,
  squadsUnlocked,
  withdrawTeam,
} from './systems/squads';
export {
  advanceAwards,
  categoryBar,
  pickCategoryWinner,
  prestigeBonus,
  rankLabel,
  studioScore,
} from './systems/awards';
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
  activeFeverFor,
  activeFevers,
  advanceMarket,
  buildFever,
  clampHype,
  comboKey,
  comboPopularity,
  computeSegmentReviews,
  createMarketState,
  curveValueAt,
  effectiveSaturation,
  expectedWeeklyUnits,
  feverBoost,
  feverShape,
  feverWeeksLeft,
  marketSize,
  overHypeGap,
  platformAvailable,
  platformStage,
  priceModifier,
  registerReleaseSaturation,
  saturationModifier,
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
  advanceStaff,
  applyReleaseMorale,
  computeSynergy,
  computeTeamFactor,
  computeTeamOutput,
  createFounder,
  crunchSensitivity,
  expandBlockReason,
  expandStudio,
  fireEmployee,
  generateCandidates,
  hireBlockReason,
  hireCandidate,
  hiringCost,
  motivateEmployee,
  refreshCandidatePool,
  salaryTierOf,
  scaleStageInfo,
  scaleUpgradeCost,
  setCrunch,
  staffCap,
  teamInnovationBonus,
  toggleAssignment,
  trainEmployee,
} from './systems/staff';
export type { MotivationKind, ScaleStageInfo } from './systems/staff';
