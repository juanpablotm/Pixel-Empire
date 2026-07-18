import type { EngineCapabilityId } from './engine';
import type { EraId } from './era';
import type { CurvePoint } from './market';
import type { Audience, DevPhaseNumber } from './project';
import type { Specialty } from './staff';

/**
 * Esquemas del contenido data-driven (docs/09). Las instancias viven en
 * src/data/; aquí solo las formas. Fase 1: los campos que usa el bucle núcleo;
 * los esquemas crecerán hacia los completos de docs/09 en fases posteriores.
 */

export interface Genre {
  id: string;
  name: string;
  /** Balance ideal Diseño/Técnica del género (docs/03 factor B; suman 1). */
  idealDesign: number;
  idealTech: number;
  /** Ponderación de especialidades para el teamFactor (docs/03 factor E; suman 1). */
  specialtyWeights: Record<Specialty, number>;
  appearsInEra: EraId;
  /** Nodo de investigación necesario para desbloquearlo (docs/02 §3). */
  requiresResearch?: string;
  // La popularidad de género/tema es plana e igual para todo lo disponible
  // desde el modelo "fiebre" (Fase 9.4, docs/19 §9.4): se acabaron las curvas
  // guionizadas de años que premiaban acampar. La variación temporal la dan
  // solo las fiebres (core/systems/market.ts). Solo las PLATAFORMAS conservan
  // curva (su ciclo de vida real de consola).
}

export interface Theme {
  id: string;
  name: string;
  appearsInEra: EraId;
}

export interface Platform {
  id: string;
  name: string;
  manufacturer: string;
  appearsInEra: EraId;
  /** Semana en la que sale al mercado; antes está "anunciada" (docs/04 §7). */
  releaseWeek: number;
  /** Semana en la que se descataloga (no admite proyectos nuevos). */
  endWeek: number;
  /**
   * Ciclo de vida guionizado (docs/04 §7): base instalada por semana absoluta,
   * en unidades de demanda semanal potencial (alimenta el tamañoMercado).
   */
  lifecycleCurve: CurvePoint[];
  /** Fit género×plataforma, 0..1 por género (docs/03 factor A). */
  genreAffinity: Record<string, number>;
  /** Multiplicador del tamaño de mercado por público objetivo (docs/09 §4). */
  audienceBias: Record<Audience, number>;
  /** Coste de licencia/dev-kit al empezar un proyecto (docs/06 §4). */
  licenseCost: number;
}

/**
 * Encaje de una feature con un género (Fase 9.3, docs/19 §9.3): 'encaja'
 * aporta su calidad completa; 'neutro' aporta a medias; 'noEncaja' no aporta
 * (resta un poco) y multiplica sus bugs. Los multiplicadores viven en
 * balance.quality.featureAffinity.
 */
export type FeatureAffinity = 'encaja' | 'neutro' | 'noEncaja';

export interface Feature {
  id: string;
  name: string;
  description: string;
  /** Aporte al featureScore (docs/03 factor C), ponderado por encaje desde 9.3. */
  qualityValue: number;
  /** Semanas extra de desarrollo que añade (se suman a la fase de Producción). */
  timeCostWeeks: number;
  /** Deuda de bugs que añade al elegirla (docs/03 factor D). */
  bugRisk: number;
  appearsInEra: EraId;
  /** Nodo de investigación necesario para desbloquearla (docs/02 §3 y docs/09 §5). */
  requiresResearch?: string;
  /**
   * Capacidad que debe tener el MOTOR del proyecto para elegirla (Fase 9.2,
   * docs/19 §9.2): el multijugador online exige un motor con Online. Se valida
   * en toggleFeature contra el motor elegido al concebir.
   */
  requiresEngineCapability?: EngineCapabilityId;
  /**
   * Afinidad por género (Fase 9.3, docs/19 §9.3): géneros donde la feature
   * ENCAJA (verde) y donde NO ENCAJA (rojo). Los no listados son neutros
   * (ámbar). El encaje pondera el featureScore y el riesgo de bugs.
   */
  fitsGenres?: string[];
  clashesGenres?: string[];
  /**
   * Variantes excluyentes de un mismo trade-off (Fase 9.3): las features que
   * comparten grupo son puntos distintos del dilema barato/rápido vs
   * caro/calidad (mundo abierto procedural vs artesanal; voces vs doblaje).
   * Elegir una desmarca la otra (toggleFeature).
   */
  variantGroup?: string;
}

/** Rasgo de personalidad de un empleado (docs/05 §3 y docs/09 §6). */
export interface Trait {
  id: string;
  name: string;
  description: string;
  modifiers: Partial<{
    /** Multiplicador del output semanal (1 = neutro). */
    speed: number;
    /** Bonus a la competencia efectiva (proporción, p. ej. 0.06 = +6 %). */
    qualityBonus: number;
    /** Deuda de bugs extra (o menos, si es negativo) por semana trabajada. */
    bugRisk: number;
    /** Aporte al innovationMod del proyecto (docs/03 §3). */
    innovation: number;
    /** Multiplicador del daño del crunch (2 = le afecta el doble). */
    crunchSensitivity: number;
    /** Aporte plano a la sinergia (documental; la química usa pares, docs/12 §5). */
    synergy: number;
    /** Hype extra al asociar su nombre a un juego (se usa en Fase 5, docs/07). */
    hypeBonus: number;
    /** Aceleración del XP de los juniors del equipo (docs/05 §3). */
    mentorBonus: number;
  }>;
}

/** Un aspecto de una fase de desarrollo y a qué contribuye su esfuerzo. */
export interface DevAspect {
  id: string;
  name: string;
  /** Cuánto del esfuerzo en este aspecto cuenta como Diseño / Técnica (docs/03 factor B). */
  designWeight: number;
  techWeight: number;
  /** Cuánto cuenta como inversión de QA (reduce bugs; docs/03 factor D). */
  qaWeight: number;
}

/** Especificación de una de las 3 fases de desarrollo (docs/02 §2 paso 3). */
export interface DevPhaseSpec {
  phase: DevPhaseNumber;
  name: string;
  aspects: DevAspect[];
}
