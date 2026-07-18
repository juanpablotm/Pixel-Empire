import type { EraId } from './era';

/**
 * Tipos del sistema de motores (Fase 9.2, docs/19 §9.2): el motor es el gran
 * gate tecnológico de los juegos grandes. Se CONSTRUYE uno propio (💰 + 💡 +
 * semanas de calendario) o se LICENCIA uno de terceros (moderno ya, pero con
 * royalty sobre las ventas y sin activo propio). Los motores ENVEJECEN de
 * forma emergente: su nivel es fijo y la exigencia de la era sube
 * (balance.quality.ceiling.engine.demandByEra) — la brecha creciente es el
 * envejecimiento, sin mecánica extra. Los datos viven en data/engines.ts.
 */

/**
 * Capacidades de un motor (docs/19 §9.2: "2D/3D/online/físicas…" y la
 * multiplataforma). Cada una suma nivel tecnológico y algunas gatean
 * contenido (features con `requiresEngineCapability`) o el número de
 * plataformas simultáneas de un lanzamiento (maxPlatforms).
 */
export type EngineCapabilityId =
  | 'graficos3d'
  | 'online'
  | 'fisicas'
  | 'biplataforma'
  | 'multiplataforma';

/** Definición de una capacidad (data/engines.ts). */
export interface EngineCapabilityDef {
  id: EngineCapabilityId;
  name: string;
  description: string;
  /** Puntos de nivel tecnológico que aporta al motor que la incluye. */
  techBonus: number;
  /** Primera era en la que se puede construir. */
  era: EraId;
  /** Nodo de I+D que hay que tener investigado para construirla (docs/02 §3). */
  requiresNode?: string;
  /** Sobrecoste al incluirla en un motor propio. */
  buildCostMoney: number;
  buildCostPoints: number;
  /** Plataformas simultáneas que habilita (bi = 2, multi = 4); sin ella, 1. */
  maxPlatforms?: number;
}

/**
 * Motor licenciable de terceros (data/engines.ts): moderno YA, sin obra ni
 * I+D, pero con royalty sobre los ingresos brutos de cada juego que lo use y
 * sin activo propio. El catálogo se renueva por eras (los viejos se retiran
 * de nuevos proyectos; los juegos ya lanzados conservan su royalty).
 */
export interface LicensedEngineDef {
  id: string;
  name: string;
  vendor: string;
  appearsInEra: EraId;
  /** Desde esta era ya no admite proyectos NUEVOS (los lanzados siguen). */
  retiresInEra?: EraId;
  /** Generación (≈ era en la que es puntero); alimenta el bonus de herramientas. */
  generation: number;
  /** Nivel tecnológico FIJO: un motor licenciado también envejece. */
  techLevel: number;
  capabilities: EngineCapabilityId[];
  /** Cuota de integración, POR JUEGO, al concebir. */
  upfrontFee: number;
  /** Fracción de los ingresos brutos del juego que se lleva el vendor (0..1). */
  royaltyPct: number;
}

/** Motor propio del estudio (vive en GameState.engines; serializable). */
export interface OwnedEngine {
  id: string;
  /** Nombre libre elegido por el jugador. */
  name: string;
  /** Generación 1..7 (≈ la era en la que es puntero). */
  generation: number;
  /** Nivel tecnológico total (base de la generación + capacidades). */
  techLevel: number;
  capabilities: EngineCapabilityId[];
  /** Semana en la que terminó su construcción (o su última mejora). */
  builtWeek: number;
}

/**
 * Obra en curso (GameState.engineBuild): se paga 💰 + 💡 por adelantado y el
 * tick descuenta semanas hasta terminar. Una sola obra a la vez: el
 * laboratorio no construye dos motores en paralelo.
 */
export interface EngineBuild {
  /** Si es una MEJORA, el id del motor existente; si es obra nueva, null. */
  upgradeOf: string | null;
  name: string;
  generation: number;
  capabilities: EngineCapabilityId[];
  weeksLeft: number;
  totalWeeks: number;
}
