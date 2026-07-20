import type { MonetizationConfig } from './moral';

/**
 * Tipos del proyecto en desarrollo (docs/09 §1). Fase 4: incluye precio y
 * monetización como palancas morales (docs/06 §2). Fases posteriores añadirán
 * subGenreId y budget según el esquema de docs/09.
 */

/** Público objetivo (docs/02 §2 paso 1). */
export type Audience = 'hardcore' | 'amplio' | 'casual' | 'infantil';

/** Tamaño del proyecto: escala tiempo, coste y potencial (docs/02 §2; 5 desde 8.8). */
export type ProjectSize = 'pequeno' | 'mediano' | 'grande' | 'muyGrande' | 'aaa';

/** Orden canónico de tamaños, para comparar "al menos X" (docs/17 E1). */
export const SIZE_ORDER: readonly ProjectSize[] = [
  'pequeno',
  'mediano',
  'grande',
  'muyGrande',
  'aaa',
];

export function sizeAtLeast(size: ProjectSize, min: ProjectSize): boolean {
  return SIZE_ORDER.indexOf(size) >= SIZE_ORDER.indexOf(min);
}

/** Fase interna de desarrollo: 1 Concepto · 2 Producción · 3 Pulido (docs/02 §2 paso 3). */
export type DevPhaseNumber = 1 | 2 | 3;

/**
 * Reparto de esfuerzo de una fase de desarrollo: aspectId → proporción.
 * El núcleo lo guarda normalizado (las proporciones suman 1).
 */
export type FocusAllocation = Record<string, number>;

/**
 * La ventana disputada que retiene un proyecto terminado (Fase 9.5, docs/19
 * §9.5): quién lanza contra ti, qué y cuándo. windowEndWeek es la última
 * semana aplastada; retrasar fija delayedUntilWeek = windowEndWeek + 1.
 */
export interface PendingRelease {
  rivalId: string;
  rivalName: string;
  gameName: string;
  /** Semana de lanzamiento del bombazo rival. */
  releaseWeek: number;
  /** Última semana dentro de la ventana disputada. */
  windowEndWeek: number;
}

/**
 * Contrato con un publisher, congelado al FIRMAR (Fase 9.6, docs/19 §9.6):
 * los términos no cambian aunque tu reputación suba después. El publisher
 * pagó los costes de arranque y el adelanto; a cambio se lleva revShare del
 * bruto de este juego, para siempre — y a veces la IP.
 */
export interface PublisherDeal {
  publisherId: string;
  publisherName: string;
  /** Fracción de los ingresos brutos que se queda el publisher (0..1). */
  revShare: number;
  /** Adelanto cobrado al firmar (no recuperable; para el P&L y la ficha). */
  advance: number;
  /** El publisher se quedó la IP: limita franquicias/secuelas (9.7). */
  keepsIp: boolean;
  /** Su red de distribución: demanda del juego × (1 + boost) al lanzar. */
  distributionBoost: number;
  /** Bolsa de marketing restante: campañas que aún paga el publisher. */
  marketingBudgetLeft: number;
  /** Marketing ya pagado por el publisher (no cuenta en TU coste del P&L). */
  marketingCovered: number;
  /** Costes de arranque que pagó el publisher (licencias + base + motor). */
  upfrontCovered: number;
}

/**
 * Acceso anticipado en curso (Fase 9.6, docs/19 §9.6 y docs/07 §4.1): el
 * juego se vende a medio hacer mientras el desarrollo sigue hacia la 1.0.
 * Entra dinero y feedback; la comunidad mira el reloj.
 */
export interface EarlyAccessState {
  startWeek: number;
  /** Unidades vendidas durante el acceso anticipado. */
  unitsSold: number;
  /** Ingresos acumulados del acceso anticipado. */
  revenue: number;
}

export interface Project {
  id: string;
  name: string;
  themeId: string;
  genreId: string;
  /** Plataforma PRINCIPAL (fija el fit y el sabor); siempre platformIds[0]. */
  platformId: string;
  /**
   * Todas las plataformas del lanzamiento (Fase 9.2, docs/19 §9.2): el motor
   * decide cuántas caben (capacidades bi/multiplataforma). La demanda de
   * ventas SUMA sus bases instaladas; cada una paga su licencia al iniciar.
   * Opcional: los proyectos de saves previos se leen con `?? [platformId]`.
   */
  platformIds?: string[];
  /**
   * Motor del proyecto (Fase 9.2): id de un motor propio (state.engines), de
   * uno licenciado (data/engines.ts) o null = "código artesanal" (nivel 0,
   * lo de siempre en 1980). Es el término tecnológico del techoQ (docs/03
   * §3.1) y decide plataformas, features gateadas y royalty al lanzar.
   * Opcional: los proyectos de saves previos se leen con `?? null`.
   */
  engineId?: string | null;
  audience: Audience;
  size: ProjectSize;
  /**
   * Precio de venta elegido en la concepción (docs/06 §2: palanca moral).
   * En F2P es el valor de referencia por jugador, no un precio de venta.
   */
  price: number;
  /** Modelo de negocio y agresividad (docs/09 §9): la gran palanca de codicia. */
  monetization: MonetizationConfig;
  /** Compras de campañas de marketing (una entrada por compra, docs/06 §4).
   * Desde 9.1 admite repetidos: las campañas se relanzan sin tope (docs/19). */
  marketingUsed: number[];
  /** Creadores con clave de acceso para este lanzamiento (docs/07 §3). */
  creatorCampaign: string[];
  /**
   * Marketing engañoso (docs/07 §4): se activó "capitalizar el leak" o
   * "prometer la luna". Si al lanzar el juego no cumple, el backlash estalla
   * como crisis de promesa rota — siempre trazable a esa decisión.
   */
  overPromised: boolean;
  /**
   * Semana en que arrancó el desarrollo (docs/17 U4). Fija el coste de
   * desarrollo atribuible al juego para el P&L de "sale del mercado":
   * (releaseWeek − startWeek) × devCostPerPersonWeek. Opcional para que los
   * proyectos de saves previos sigan siendo válidos (heredan coste dev 0).
   */
  startWeek?: number;
  /**
   * Semanas de calendario que el proyecto pasó EN PAUSA, sin nadie asignado
   * (docs/18 V5). Se descuentan del coste de desarrollo del P&L: si nadie
   * trabajó, no hubo coste de desarrollo que atribuir. Sin esto, retirar al
   * equipo para que descanse inflaría el "costó" del juego —y el crunch, que
   * comprime el calendario, lo abarataría—, o sea justo la lección inversa a la
   * que el descanso existe para enseñar. Opcional: los saves previos heredan 0.
   */
  pausedWeeks?: number;
  /**
   * Ventana disputada (Fase 9.5, docs/19 §9.5): el proyecto TERMINÓ, pero un
   * gigante lanza un juego de su mismo género en la misma ventana. El juego
   * espera en el cajón (pausa con decisión) hasta que el jugador elige lanzar
   * igual (confirmContestedRelease) o esquivar (delayContestedRelease).
   * Opcional: solo existe mientras la decisión está pendiente.
   */
  pendingRelease?: PendingRelease;
  /**
   * Lanzamiento retrasado a propósito (Fase 9.5): el proyecto terminado
   * espera a esta semana para salir (fin de la ventana disputada + 1). Las
   * semanas de espera cuentan como pausa (pausedWeeks): nadie desarrolla,
   * pero la nómina corre — ese es el precio de esquivar.
   */
  delayedUntilWeek?: number;
  /**
   * Contrato con el publisher que financia este juego, o undefined =
   * AUTO-publicado (Fase 9.6, docs/19 §9.6). Congelado al firmar en la
   * concepción. Opcional: los proyectos de saves previos son auto-publicados.
   */
  publisherDeal?: PublisherDeal;
  /**
   * Acceso anticipado en curso, o undefined = desarrollo a puerta cerrada
   * (Fase 9.6). Solo proyectos auto-publicados. Opcional: saves previos no
   * lo llevan.
   */
  earlyAccess?: EarlyAccessState;
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
  /**
   * Hype acumulado 0..1 (docs/04 §4, versión base de Fase 3): crece durante
   * el desarrollo, más deprisa si el combo está de moda. Doble filo al lanzar.
   */
  hype: number;
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
