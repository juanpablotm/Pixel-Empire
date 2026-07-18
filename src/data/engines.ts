import type {
  EngineCapabilityDef,
  EngineCapabilityId,
  LicensedEngineDef,
} from '../core/model/engine';

/**
 * Motores y tecnología (Fase 9.2, docs/19 §9.2): capacidades construibles y
 * el catálogo de motores licenciables de terceros. Nombres ficticios
 * reconocibles, como las plataformas (docs/09 §4). Los números de balance
 * (niveles por generación, costes de obra, demanda por era) viven en
 * data/balance.ts → balance.engines y balance.quality.ceiling.engine.
 */

/**
 * Capacidades de motor (docs/19 §9.2). Cada una suma nivel tecnológico;
 * algunas gatean features (`requiresEngineCapability` en data/features.ts) o
 * el número de plataformas simultáneas (maxPlatforms). Las de plataforma se
 * INVESTIGAN (docs/19 §9.2: "bi/tri/multi-plataforma es una capacidad del
 * motor que se investiga").
 */
export const engineCapabilities: readonly EngineCapabilityDef[] = [
  {
    id: 'graficos3d',
    name: 'Gráficos 3D',
    description: 'Renderizado 3D en tiempo real: la mesa de apuestas de la era del CD.',
    techBonus: 3,
    era: 'E3',
    requiresNode: 'tecnologia3d',
    buildCostMoney: 15_000,
    buildCostPoints: 8,
  },
  {
    id: 'fisicas',
    name: 'Físicas',
    description: 'Motor de físicas integrado: cajas que caen bien y ragdolls que dan risa.',
    techBonus: 2,
    era: 'E3',
    buildCostMoney: 10_000,
    buildCostPoints: 6,
  },
  {
    id: 'online',
    name: 'Online',
    description: 'Netcode propio: habilita el multijugador online y el cross-play.',
    techBonus: 2,
    era: 'E4',
    requiresNode: 'tecnologiaOnline',
    buildCostMoney: 20_000,
    buildCostPoints: 8,
  },
  {
    id: 'biplataforma',
    name: 'Kit biplataforma',
    description: 'Pipeline de exportación a una segunda plataforma en el mismo lanzamiento.',
    techBonus: 1,
    era: 'E3',
    requiresNode: 'kitBiplataforma',
    buildCostMoney: 12_000,
    buildCostPoints: 6,
    maxPlatforms: 2,
  },
  {
    id: 'multiplataforma',
    name: 'Pipeline multiplataforma',
    description: 'Compila para todo lo que exista: hasta cuatro plataformas a la vez.',
    techBonus: 2,
    era: 'E5',
    requiresNode: 'pipelineMultiplataforma',
    buildCostMoney: 40_000,
    buildCostPoints: 12,
    maxPlatforms: 4,
  },
];

export function getEngineCapability(id: EngineCapabilityId): EngineCapabilityDef {
  const cap = engineCapabilities.find((c) => c.id === id);
  if (!cap) throw new Error(`Capacidad de motor desconocida: ${id}`);
  return cap;
}

/**
 * Catálogo de motores licenciables (docs/19 §9.2). No existe hasta E3: en los
 * 80 el middleware no se vendía — o programas artesanal o construyes el tuyo.
 * Cada entrada tiene nivel FIJO (envejece igual que los propios); el catálogo
 * se renueva por eras con motores nuevos y los viejos se retiran de proyectos
 * nuevos. El trade-off frente al motor propio: moderno YA y sin obra, pero
 * royalty sobre cada venta y sin activo que amortizar.
 */
export const licensedEngines: readonly LicensedEngineDef[] = [
  {
    id: 'rayTech',
    name: 'RayTech 3D',
    vendor: 'Software del Abismo',
    appearsInEra: 'E3',
    retiresInEra: 'E5',
    generation: 3,
    techLevel: 10,
    capabilities: ['graficos3d', 'fisicas'],
    upfrontFee: 15_000,
    royaltyPct: 0.08,
  },
  {
    id: 'irreal2',
    name: 'Irreal Engine 2',
    vendor: 'Juegos Épicos',
    appearsInEra: 'E4',
    retiresInEra: 'E6',
    generation: 4,
    techLevel: 14,
    capabilities: ['graficos3d', 'fisicas', 'online'],
    upfrontFee: 40_000,
    royaltyPct: 0.1,
  },
  {
    id: 'unify',
    name: 'Unify',
    vendor: 'Unify Technologies',
    appearsInEra: 'E5',
    retiresInEra: 'E7',
    generation: 5,
    techLevel: 18,
    capabilities: ['graficos3d', 'fisicas', 'online', 'biplataforma'],
    upfrontFee: 25_000,
    royaltyPct: 0.07,
  },
  {
    id: 'irreal3',
    name: 'Irreal Engine 3',
    vendor: 'Juegos Épicos',
    appearsInEra: 'E5',
    retiresInEra: 'E7',
    generation: 5,
    techLevel: 19,
    capabilities: ['graficos3d', 'fisicas', 'online', 'biplataforma'],
    upfrontFee: 60_000,
    royaltyPct: 0.11,
  },
  {
    id: 'unify5',
    name: 'Unify 5',
    vendor: 'Unify Technologies',
    appearsInEra: 'E6',
    generation: 6,
    techLevel: 24,
    capabilities: ['graficos3d', 'fisicas', 'online', 'biplataforma', 'multiplataforma'],
    upfrontFee: 40_000,
    royaltyPct: 0.08,
  },
  {
    id: 'irreal5',
    name: 'Irreal Engine 5',
    vendor: 'Juegos Épicos',
    appearsInEra: 'E6',
    generation: 6,
    techLevel: 26,
    capabilities: ['graficos3d', 'fisicas', 'online', 'biplataforma', 'multiplataforma'],
    upfrontFee: 100_000,
    royaltyPct: 0.12,
  },
  {
    id: 'nebulaForge',
    name: 'Nebula Forge',
    vendor: 'Aureal Labs',
    appearsInEra: 'E7',
    generation: 7,
    techLevel: 30,
    capabilities: ['graficos3d', 'fisicas', 'online', 'biplataforma', 'multiplataforma'],
    upfrontFee: 150_000,
    royaltyPct: 0.12,
  },
];

export function getLicensedEngine(id: string): LicensedEngineDef {
  const engine = licensedEngines.find((e) => e.id === id);
  if (!engine) throw new Error(`Motor licenciable desconocido: ${id}`);
  return engine;
}

export function isLicensedEngineId(id: string): boolean {
  return licensedEngines.some((e) => e.id === id);
}
