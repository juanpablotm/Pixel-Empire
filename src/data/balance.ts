import type { EraId } from '../core/model/era';
import type { ProjectSize } from '../core/model/project';

/**
 * Balance central (docs/09 §11): todo número que afecte al juego vive aquí,
 * nunca hardcodeado en la lógica. Balancear = editar este archivo.
 * Cifras baseline v1 según docs/12 (§3 calidad, §6 economía).
 */
export const balance = {
  time: {
    /** Semana en la que empieza una partida nueva. */
    startWeek: 1,
    /** Año de calendario de la semana 1 (solo para mostrar fechas). */
    startYear: 1980,
    /** Era inicial: el garaje, ~1980 (docs/02 §5). */
    startEra: 'E1' as EraId,
    /** Milisegundos reales por tick (1 semana) a velocidad x1 (docs/02 §1). */
    baseTickMs: 1000,
    /** Máximo de entradas retenidas en el historial de eventos. */
    logMaxEntries: 100,
  },

  economy: {
    /** Capital inicial del garaje: 10.000 💰 [DECIDIDO, docs/12 §6]. */
    initialCapital: 10_000,
    /** Coste fijo semanal del garaje (luz, alquiler...); infraestructura de docs/06 §4. */
    weeklyUpkeep: 100,
    /** Coste de desarrollo: ~500 💰 por persona·semana [DECIDIDO, docs/12 §6]. */
    devCostPerPersonWeek: 500,
    /** Precio de venta por tamaño, dentro del rango 20–60 💰 [DECIDIDO, docs/12 §6]. */
    priceBySize: { pequeno: 20, mediano: 30, grande: 45, aaa: 60 } satisfies Record<
      ProjectSize,
      number
    >,
    /** Semanas consecutivas en negativo antes de la bancarrota (docs/06 §1: "sostenido"). */
    bankruptcyGraceWeeks: 8,
  },

  development: {
    /** Semanas por fase de desarrollo según tamaño (×3 fases; garaje: juego pequeño 4–8 semanas, docs/02 §6). */
    phaseWeeksBySize: { pequeno: 2, mediano: 4, grande: 7, aaa: 12 } satisfies Record<
      ProjectSize,
      number
    >,
    /** Deuda de bugs acumulada por semana de Concepto/Producción (docs/03 factor D). */
    baseBugsPerWeek: 0.02,
    /** Reducción de deuda de bugs por semana con el 100 % del esfuerzo en QA. */
    qaReductionPerWeek: 0.15,
  },

  quality: {
    /** Pesos de composición v1: wF, wB, wC, wD [DECIDIDO, docs/12 §3]. */
    weights: { fit: 0.3, balance: 0.25, features: 0.2, polish: 0.25 },
    /** Ponderación de las partes del Fit (docs/03 factor A). */
    fitWeights: { themeGenre: 0.5, genrePlatform: 0.25, audience: 0.25 },
    /** objetivoAlcance(tamaño): suma de valorCalidad de features para featureScore = 1 (docs/03 factor C). */
    featureScopeTarget: { pequeno: 4, mediano: 8, grande: 14, aaa: 22 } satisfies Record<
      ProjectSize,
      number
    >,
    /** teamFactor del fundador en solitario (etapa garaje); Fase 2 lo sustituye por el cálculo real. */
    teamFactorGaraje: 0.95,
    /** innovationMod: rango 0.9–1.15 [DECIDIDO, docs/12 §3]. */
    innovation: {
      min: 0.9,
      max: 1.15,
      /** Modificador de una combinación tema×género nunca lanzada por el estudio. */
      freshCombo: 1.05,
      /** Cuánto baja por cada lanzamiento previo con la misma combinación. */
      repeatStep: 0.05,
    },
    /** techoQ(era, tamaño): límite de Q por era (docs/03 §3). E2+ se define en Fase 6. */
    capByEraSize: {
      E1: { pequeno: 85, mediano: 85, grande: 85, aaa: 85 },
    } as Partial<Record<EraId, Record<ProjectSize, number>>>,
  },

  reviews: {
    /** Umbrales de tono del desglose para factores 0..1: ✔ ≥ good, ~ ≥ ok, ✘ debajo (docs/03 §5). */
    goodThreshold: 0.75,
    okThreshold: 0.5,
    /** El pulido exige más para el ✔ ("impecable"). */
    polishGoodThreshold: 0.95,
    polishOkThreshold: 0.7,
    /** Umbrales de tono del teamFactor (rango 0.5–1.3). */
    teamGoodThreshold: 1.0,
    teamOkThreshold: 0.85,
    /** Umbrales de tono del innovationMod (rango 0.9–1.15). */
    innovationGoodThreshold: 1.02,
    innovationOkThreshold: 1.0,
    /** Medidor de Fit en la concepción: verde ≥, ámbar ≥, rojo debajo (docs/03 factor A). */
    fitMeter: { verde: 0.75, ambar: 0.55 },
  },

  sales: {
    /** factorReseña = (reseña/100)^exponente: las reseñas altas venden desproporcionadamente más. */
    reviewExponent: 2,
    /** La demanda escala con el tamaño del proyecto. */
    sizeDemandFactor: { pequeno: 1, mediano: 1.8, grande: 3, aaa: 5 } satisfies Record<
      ProjectSize,
      number
    >,
    /** Decaimiento semanal de ventas, interpolado por reseña: mala → decayMin, perfecta → decayMax (cola larga). */
    decayMin: 0.5,
    decayMax: 0.85,
    /** Ruido determinista (PRNG) sobre las ventas semanales, ±proporción. */
    weeklyNoise: 0.1,
    /** Por debajo de estas unidades semanales el juego sale del mercado. */
    cutoffUnits: 5,
  },
} as const;
