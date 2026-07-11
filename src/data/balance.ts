import type { EraId } from '../core/model/era';
import type { ScaleStage } from '../core/model/gameState';
import type { ProjectSize } from '../core/model/project';
import type { SalaryTier, Specialty } from '../core/model/staff';

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
    /** Alquiler extra sobre el coste fijo del garaje según etapa de escala (docs/02 §4). */
    upkeepExtraByStage: { 1: 0, 2: 150, 3: 600, 4: 2_000 } satisfies Record<ScaleStage, number>,
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

  staff: {
    /**
     * El fundador: tus skills iniciales (docs/02 §4, garaje: "tus skills son
     * todo"). Determinista; no cobra salario, no renuncia y no se despide.
     */
    founder: {
      id: 'fundador',
      name: 'Fundador',
      specialty: 'diseno' as Specialty,
      skills: { diseno: 70, tecnica: 55, arte: 45, audio: 40, marketing: 30 } satisfies Record<
        Specialty,
        number
      >,
      traits: ['workaholic'],
      morale: 75,
      energy: 100,
      loyalty: 100,
      level: 1,
    },

    /** Salario semanal junior / senior / estrella: 300 / 800 / 2.000 💰 [DECIDIDO, docs/12 §6]. */
    salaries: { junior: 300, senior: 800, estrella: 2_000 } satisfies Record<SalaryTier, number>,
    /** Coste de contratación: 2–4 semanas del salario del candidato [DECIDIDO, docs/12 §6] → 3. */
    hiringCostWeeks: 3,
    /** Finiquito al despedir, en semanas de salario. */
    severanceWeeks: 4,

    /** Formar: invertir dinero en subir una skill (docs/05 §6). */
    training: { cost: 1_200, skillGain: 5, moraleBoost: 2 },
    /** Motivar: bonus puntual o subida de salario permanente (docs/05 §6). */
    motivation: {
      bonusWeeks: 4,
      bonusMinCost: 500,
      bonusMorale: 15,
      bonusLoyalty: 5,
      raisePct: 0.1,
      raiseMorale: 10,
      raiseLoyalty: 15,
    },

    /** Desgaste semanal por trabajo y recuperación por descanso (docs/05 §4). */
    work: {
      energyDrain: 3,
      restEnergyRecovery: 8,
      restMoraleRecovery: 2,
      /** El descanso recupera la moral solo hasta este techo (motivar la sube más). */
      restMoraleCap: 70,
    },
    /** Crunch: +output a corto, −moral/energía/lealtad; palanca de codicia (docs/05 §6). */
    crunch: {
      outputBoost: 1.25,
      energyDrain: 10,
      moraleDrain: 4,
      loyaltyDrain: 2,
      /** Deuda de bugs extra por semana de crunch ("prisa", docs/03 factor D). */
      extraBugsPerWeek: 0.02,
    },
    /** Burnout: energía sostenidamente baja → penalización fuerte (docs/05 §4). */
    burnout: {
      energyThreshold: 20,
      weeksToBurnout: 3,
      exitEnergy: 60,
      outputPenalty: 0.5,
      competencePenalty: 0.5,
      moraleHit: 10,
      moraleDrainPerWeek: 2,
    },
    /** Renuncias por moral/lealtad bajas (docs/05 §7); el fundador nunca renuncia. */
    quits: {
      moraleThreshold: 35,
      loyaltyThreshold: 30,
      baseChance: 0.15,
      maxChance: 0.3,
      /** Presión extra si el empleado está en burnout. */
      burnoutExtraPressure: 0.3,
      /** Golpe de moral al resto cuando alguien se va. */
      teamMoraleHit: 3,
    },
    /** Despedir golpea la moral y lealtad de los que quedan (docs/05 §6). */
    firing: { teamMoraleHit: 8, teamLoyaltyHit: 5 },

    /** Nivel/XP: crece trabajando; mejora skills y sube el salario (docs/05 §1). */
    xp: {
      perWeekWorked: 1,
      perLevel: 30,
      skillGainSpecialty: 2,
      skillGainOthers: 1,
      salaryRaisePct: 0.08,
      /** Hasta este nivel un empleado cuenta como junior (mentoría y química). */
      juniorMaxLevel: 2,
      maxLevel: 10,
    },
    /** La moral reacciona al lanzamiento: éxitos suben, flops hunden (docs/05 §4). */
    releaseMorale: {
      hitReview: 75,
      hitMorale: 15,
      hitLoyalty: 5,
      okReview: 60,
      okMorale: 5,
      flopReview: 40,
      flopMorale: 10,
      flopLoyalty: 3,
    },

    /** Factor E = competencia × moral × sinergia, rango 0.5–1.3 [DECIDIDO, docs/12 §3]. */
    teamFactor: {
      competenceMin: 0.5,
      competenceSpan: 0.75,
      moraleMin: 0.7,
      moraleSpan: 0.4,
      min: 0.5,
      max: 1.3,
    },
    /** Química v1: clamp(1 + Σ pares (0.03·afín − 0.04·conflicto), 0.8, 1.2) [DECIDIDO, docs/12 §5]. */
    chemistry: {
      affinityBonus: 0.03,
      conflictPenalty: 0.04,
      min: 0.8,
      max: 1.2,
      /** Dos especialidades distintas son "complementarias" si ambas pesan ≥ esto en el género. */
      complementaryWeight: 0.2,
      /** Tamaño de equipo desde el que el Llanero solitario genera fricción. */
      soloConflictTeamSize: 4,
      compatibleTraitPairs: [
        ['visionario', 'perfeccionista'],
        ['generalista', 'especialistaObsesivo'],
      ],
      conflictTraitPairs: [
        ['estrellaMediatica', 'estrellaMediatica'],
        ['perfeccionista', 'rapidoDescuidado'],
      ],
    },

    /** Pool de contratación (docs/05 §6); su calidad crecerá con era/reputación (Fases 3–4). */
    candidates: {
      poolSize: 3,
      refreshWeeks: 12,
      /** Marketing llega con las campañas (Fase 5): en E1–E2 "lo haces tú" (docs/05 §2). */
      specialties: ['diseno', 'tecnica', 'arte', 'audio'] as readonly Specialty[],
      tierWeights: { junior: 0.5, senior: 0.38, estrella: 0.12 } satisfies Record<
        SalaryTier,
        number
      >,
      specialtySkillByTier: {
        junior: [35, 54],
        senior: [58, 76],
        estrella: [80, 92],
      } satisfies Record<SalaryTier, readonly [number, number]>,
      otherSkillRange: [15, 45] as readonly [number, number],
      /** El Generalista nivela: skills secundarias dentro de este rango. */
      generalistaSkillRange: [40, 60] as readonly [number, number],
      /** El Especialista obsesivo: +especialidad / −secundarias. */
      especialistaSkillShift: 5,
      moraleRange: [60, 80] as readonly [number, number],
      energyRange: [80, 100] as readonly [number, number],
      loyaltyRange: [40, 60] as readonly [number, number],
      levelByTier: {
        junior: [1, 2],
        senior: [3, 5],
        estrella: [6, 8],
      } satisfies Record<SalaryTier, readonly [number, number]>,
      traitCountMin: 1,
      traitCountMax: 3,
    },

    /** Escala Garaje → Estudio pequeño (docs/02 §4): hito de capital y aforo por etapa. */
    scale: {
      stage2CapitalThreshold: 15_000,
      staffCapByStage: { 1: 1, 2: 8, 3: 40, 4: 200 } satisfies Record<ScaleStage, number>,
    },
  },

  market: {
    /** Evolución de popularidades por tick (docs/04 §2): base guionizada + ruido suave. */
    popularity: {
      /** Amplitud del ruido semanal (± sobre la popularidad, antes del clamp 0..1). */
      noiseAmplitude: 0.02,
      /** Persistencia de la desviación: cada tick la popularidad revierte hacia la curva base. */
      noisePersistence: 0.85,
      /** Semanas hacia atrás para medir la dirección ↑→↓ sobre la curva base. */
      directionLookbackWeeks: 6,
      /** Cambio mínimo de la curva base en ese lapso para marcar ↑ o ↓. */
      directionThreshold: 0.02,
      /** Umbrales de etapa del ciclo de vida (docs/04 §2). */
      stage: { deadLevel: 0.15, emergingLevel: 0.35, peakLevel: 0.65 },
    },

    /** Saturación por lanzamientos similares (docs/04 §3): sube al lanzar, decae al olvidar. */
    saturation: {
      /** Cuánto suma cada lanzamiento al contador de su combo género|tema. */
      releaseIncrement: 1,
      /** Peso de la saturación de otros temas del mismo género (secuelas "de género"). */
      sameGenreWeight: 0.5,
      /** Decaimiento multiplicativo semanal del contador (el público "olvida"). */
      decayPerWeek: 0.94,
      /** k del modificador: modificadorVentas = 1 − k·saturación [DECIDIDO, docs/04 §3]. */
      k: 0.25,
      /** Un juego similar reciente es "lo normal": no penaliza hasta superar este margen. */
      freeAllowance: 1,
      /** Suelo del modificador de ventas por saturación. */
      minModifier: 0.25,
    },

    /** Hype base (docs/04 §4): crece durante el desarrollo, doble filo al lanzar. */
    hype: {
      /** El hype empieza a acumularse en esta fase de desarrollo (el "anuncio"). */
      startPhase: 2,
      /** Ganancia semanal base por tamaño de proyecto (los grandes generan más expectación). */
      gainBySize: { pequeno: 0.07, mediano: 0.05, grande: 0.04, aaa: 0.045 } satisfies Record<
        ProjectSize,
        number
      >,
      /** La moda alimenta la expectación: ganancia × (base + span·popCombo). */
      popCouplingBase: 0.4,
      popCouplingSpan: 0.6,
      max: 1,
      /** Zona roja del Manómetro de Hype (docs/10 §7.5): sobre-hype a partir de aquí. */
      overHypeThreshold: 0.65,
      /** Puntos de reseña restados con hype 1.0 (penalizaciónExpectativas, docs/04 §5). */
      reviewPenaltyMax: 10,
      /** Hasta este hype las expectativas no endurecen la reseña. */
      freeHype: 0.25,
      /** Empuje a las ventas de salida: pico × (1 + coef·hype) (docs/04 §6). */
      salesSpikeCoef: 1.2,
    },

    /** De Calidad a Reseña (docs/04 §5). Los sesgos por segmento viven en data/segments.ts. */
    reviews: {
      /** estándarEra: el listón sube con las eras (E2+ se define en Fase 6). */
      eraStandard: { E1: 1 } as Partial<Record<EraId, number>>,
      /** afinidadModa = span × (popCombo − neutral): ± puntos por estar (o no) de moda. */
      modaSpan: 12,
      modaNeutral: 0.5,
    },

    /** Ciclos de vida de plataformas (docs/04 §7). */
    platforms: {
      /** Ruido semanal (±proporción) sobre la base instalada guionizada. */
      noiseAmplitude: 0.01,
      /** Semanas tras el lanzamiento que cuentan como etapa "lanzamiento". */
      launchWindowWeeks: 10,
      /** Ventana y umbral (relativo al pico de la curva) para crecimiento/madurez/declive. */
      directionLookbackWeeks: 8,
      directionThreshold: 0.02,
    },
  },

  sales: {
    /** factorReseña = (reseña/100)^exponente: las reseñas altas venden desproporcionadamente más. */
    reviewExponent: 2,
    /** La demanda escala con el tamaño del proyecto. */
    sizeDemandFactor: { pequeno: 1, mediano: 1.8, grande: 3, aaa: 5 } satisfies Record<
      ProjectSize,
      number
    >,
    /**
     * Curva de lanzamiento (docs/04 §6): pico inicial + cola larga.
     *   curva(t) = pico(hype)·spikeDecay^t + tailAmp·tailDecay(reseña)^t
     */
    launch: {
      /** Altura base del pico de salida (se multiplica por el empuje del hype). */
      spikeBase: 1.5,
      /** Decaimiento semanal del pico (rápido: las primeras semanas concentran ventas). */
      spikeDecay: 0.55,
      /** Altura de la cola larga. */
      tailAmp: 0.35,
      /** Decaimiento semanal de la cola, interpolado por reseña: mala → Min, perfecta → Max. */
      tailDecayMin: 0.88,
      tailDecayMax: 0.96,
    },
    /** Ruido determinista (PRNG) sobre las ventas semanales, ±proporción. */
    weeklyNoise: 0.1,
    /** Por debajo de estas unidades semanales el juego sale del mercado. */
    cutoffUnits: 5,
  },
} as const;
