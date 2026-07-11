/**
 * Tipos del proyecto en desarrollo (docs/09 §1). Fase 1: los campos que usa el
 * bucle núcleo del garaje. Fases posteriores añadirán subGenreId, assignedStaff,
 * monetization y budget según el esquema de docs/09.
 */

/** Público objetivo (docs/02 §2 paso 1). */
export type Audience = 'hardcore' | 'amplio' | 'casual' | 'infantil';

/** Tamaño del proyecto: escala tiempo, coste y potencial (docs/02 §2). */
export type ProjectSize = 'pequeno' | 'mediano' | 'grande' | 'aaa';

/** Fase interna de desarrollo: 1 Concepto · 2 Producción · 3 Pulido (docs/02 §2 paso 3). */
export type DevPhaseNumber = 1 | 2 | 3;

/**
 * Reparto de esfuerzo de una fase de desarrollo: aspectId → proporción.
 * El núcleo lo guarda normalizado (las proporciones suman 1).
 */
export type FocusAllocation = Record<string, number>;

export interface Project {
  id: string;
  name: string;
  themeId: string;
  genreId: string;
  platformId: string;
  audience: Audience;
  size: ProjectSize;
  /** Precio de venta; en Fase 1 lo fija el tamaño (data/balance.ts). */
  price: number;
  /** Fase de desarrollo en curso. */
  phase: DevPhaseNumber;
  /** Reparto de esfuerzo por fase: focus[fase - 1]. */
  focus: [FocusAllocation, FocusAllocation, FocusAllocation];
  /** Features elegidas durante la fase de Concepto (docs/03 factor C). */
  chosenFeatureIds: string[];
  /** Ids de empleados asignados al proyecto (docs/09 §1). */
  assignedStaff: string[];
  /** Crunch activo: +output a corto, −moral/energía/lealtad (docs/05 §6). */
  crunch: boolean;
  /** Semanas de desarrollo transcurridas. */
  weeksSpent: number;
  /** Puntos acumulados de Diseño/Técnica según el reparto de esfuerzo (docs/03 factor B). */
  designPoints: number;
  techPoints: number;
  /** Inversión de QA acumulada en la fase de Pulido (docs/03 factor D). */
  qaInvested: number;
  /** Deuda de bugs acumulada, 0..∞ antes del clamp (docs/03 factor D). */
  bugDebt: number;
}
