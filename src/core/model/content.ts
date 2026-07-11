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
  /** Curva guionizada de popularidad por semana (docs/04 §2); el ruido la matiza en runtime. */
  basePopularityCurve: CurvePoint[];
}

export interface Theme {
  id: string;
  name: string;
  appearsInEra: EraId;
  /** Curva guionizada de popularidad por semana (docs/04 §2). */
  basePopularityCurve: CurvePoint[];
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

export interface Feature {
  id: string;
  name: string;
  description: string;
  /** Aporte al featureScore (docs/03 factor C). */
  qualityValue: number;
  /** Semanas extra de desarrollo que añade (se suman a la fase de Producción). */
  timeCostWeeks: number;
  /** Deuda de bugs que añade al elegirla (docs/03 factor D). */
  bugRisk: number;
  appearsInEra: EraId;
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
