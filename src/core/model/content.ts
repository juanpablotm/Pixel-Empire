import type { EraId } from './era';
import type { DevPhaseNumber } from './project';

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
  appearsInEra: EraId;
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
  /** Demanda base semanal de la plataforma (ventas simples de Fase 1; docs/04 §6 llegará después). */
  baseMarketSize: number;
  /** Fit género×plataforma, 0..1 por género (docs/03 factor A). */
  genreAffinity: Record<string, number>;
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
