import type { EraId } from '../core/model/era';
import type { ScaleStage } from '../core/model/gameState';
import type { MonetizationModel } from '../core/model/moral';
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

  /**
   * Modo sandbox (docs/01 §7, Fase 7G): desbloqueable tras terminar una
   * partida. Caja y 💡 de sobra para experimentar sin presión, empezando en
   * la era que se quiera. Solo datos: la simulación es exactamente la misma.
   */
  sandbox: {
    /**
     * Caja de sobra también para COMPRAR etapas (docs/18 V4-c): con el avance
     * de pago, experimentar con una Corporación exige cubrir su requisito de
     * 8M + el desembolso. En sandbox no hay presión: se empieza pudiendo todo.
     */
    initialCapital: 20_000_000,
    researchPoints: 200,
  },

  economy: {
    /** Capital inicial del garaje: 10.000 💰 [DECIDIDO, docs/12 §6]. */
    initialCapital: 10_000,
    /** Coste fijo semanal del garaje (luz, alquiler...); infraestructura de docs/06 §4. */
    weeklyUpkeep: 100,
    /**
     * Alquiler/infraestructura extra semanal por etapa de escala (docs/02 §4,
     * docs/18 V4-d): cada etapa QUEMA considerablemente más. Un estudio grande
     * no es riesgo cero: sostenerlo exige seguir sacando éxitos. Esto mata el
     * "punto dulce" invencible (una Corporación quema ~1,5M 💰/año solo en
     * infraestructura, antes de nóminas).
     */
    upkeepExtraByStage: {
      1: 0,
      2: 300,
      3: 1_500,
      4: 7_000,
      5: 30_000,
    } satisfies Record<ScaleStage, number>,
    /** Coste de desarrollo: ~500 💰 por persona·semana [DECIDIDO, docs/12 §6]. */
    devCostPerPersonWeek: 500,
    /** Precio recomendado por tamaño, dentro del rango 20–60 💰 [DECIDIDO, docs/12 §6]. */
    priceBySize: {
      pequeno: 20,
      mediano: 30,
      grande: 45,
      muyGrande: 50,
      aaa: 60,
    } satisfies Record<ProjectSize, number>,
    /**
     * Coste base fijo por tamaño (docs/17 E1, escalado en 8.8): se cobra AL
     * INICIAR el proyecto, además de la licencia de plataforma y del coste por
     * persona·semana. Hace que ir a lo grande sea una decisión con peso
     * económico, no solo de tiempo. Escala fuerte: un AAA compromete
     * presupuesto de corporación de entrada (40k era ruido para una caja de 8M).
     */
    sizeBaseCost: {
      pequeno: 500,
      mediano: 2_000,
      grande: 8_000,
      muyGrande: 60_000,
      aaa: 250_000,
    } satisfies Record<ProjectSize, number>,
    /** Semanas consecutivas en negativo antes de la bancarrota (docs/06 §1: "sostenido"). */
    bankruptcyGraceWeeks: 8,

    /** Precio como palanca moral (docs/06 §2): rango y umbrales sobre el recomendado. */
    pricing: {
      /** El jugador elige el precio dentro de [min, max] × recomendado. */
      minMultiplier: 0.5,
      maxMultiplier: 1.5,
      /** Desde aquí (× recomendado) el precio cuenta como "abusivo". */
      abusiveMultiplier: 1.25,
      /** Hasta aquí (× recomendado) cuenta como "generoso". */
      generousMultiplier: 0.8,
      /**
       * modificadorPrecio(precio, público) = (recomendado/precio)^elasticidad
       * (docs/04 §6): los públicos sensibles al precio compran menos si es caro.
       */
      elasticityByAudience: { hardcore: 0.6, amplio: 1, casual: 1.4, infantil: 1.6 },
    },

    /** Préstamos [DECIDIDO, docs/12 §6]: línea de crédito flexible. */
    loans: {
      /** Interés semanal sobre el principal vivo (~1 %/semana). */
      weeklyInterest: 0.01,
      /** Principal máximo: ~6 meses de costes fijos actuales. */
      capWeeksOfFixedCosts: 26,
      /** La reputación agregada escala la línea de crédito: 0 → min, 100 → max. */
      creditFactorMin: 0.5,
      creditFactorMax: 1.5,
      /** Línea mínima aunque los costes fijos sean ínfimos (garaje). */
      floorAmount: 5_000,
    },

    /**
     * Campañas de marketing escalonadas (docs/17 E2): coste y alcance
     * crecientes; las caras son MUY caras pero MUY efectivas. ROI positivo con
     * rendimientos decrecientes (el hype se topa en 1.0 y el pico decae rápido)
     * salvo que empujes a la zona roja de sobre-hype (market.hype.overHype). Los
     * nombres viven en data/marketTexts.ts (marketingLevelNames), alineados por
     * índice. Comprar las cuatro satura el hype (>1.0): es la vía al sobre-hype.
     */
    marketing: {
      levels: [
        { cost: 2_000, hypeBoost: 0.08 },
        { cost: 10_000, hypeBoost: 0.18 },
        { cost: 40_000, hypeBoost: 0.32 },
        { cost: 120_000, hypeBoost: 0.5 },
      ],
    },

    /** Semanas retenidas en el libro de caja (Finanzas, docs/10 §10.9). */
    cashflowMaxWeeks: 52,
    /** Semanas de flujo medio usadas para estimar el runway. */
    runwayLookbackWeeks: 4,
  },

  /** factorMonetización v1 [DECIDIDO, docs/12 §6] y sus consecuencias. */
  monetization: {
    /** Multiplicador de los ingresos por venta: unidades × precio × factor. */
    salesFactor: {
      premium: 1,
      'premium+dlc': 1.15,
      'premium+mtx': 1,
      f2p: 0.3,
    } satisfies Record<MonetizationModel, number>,
    /**
     * Ingresos MTX semanales = unidades × precio × coef × agresividad
     * (premium+mtx ≈ +0.6·agg; f2p ≈ 0.8·agg sobre su valor de referencia).
     */
    mtxCoef: {
      premium: 0,
      'premium+dlc': 0,
      'premium+mtx': 0.6,
      f2p: 0.8,
    } satisfies Record<MonetizationModel, number>,
    /** Un juego gratis llega a más gente: multiplicador de demanda del F2P. */
    f2pDemandBoost: 1.3,
  },

  /**
   * Reputación segmentada (docs/06 §1). Escala 0..100 por segmento; los pesos
   * del agregado viven en data/segments.ts (junto al resto de datos de segmento).
   */
  reputation: {
    /** Reputación inicial de un estudio desconocido (neutra). */
    initial: 50,
    /** Asimetría [DECIDIDO, docs/06 §3]: perder reputación es más rápido que ganarla. */
    lossMultiplier: 1.5,
    /** Deltas por reseña al lanzar: (reseña_seg − neutral) / divisor, con topes. */
    review: { neutral: 60, divisor: 8, maxGain: 3, maxLoss: 4 },
    /** La comunidad reacciona a la reseña media, algo más fría. */
    communityReview: { divisor: 10, maxGain: 2.5, maxLoss: 3 },
    /** Colchón de comunidad en ventas (docs/06 §3): 1 + coef·(rep−50)/50. */
    communitySalesCoef: 0.25,
    /**
     * Golpes/premios de reputación por palanca al lanzar (docs/06 §2): cada
     * palanca tiene víctimas concretas. Puntos ± por segmento (la asimetría
     * de pérdida se aplica encima).
     */
    levers: {
      lootboxes: { hardcore: -6, comunidad: -2.5, prensa: -2 },
      /** Loot boxes en juego infantil: los golpes se multiplican (docs/06 §5). */
      lootboxChildMultiplier: 2,
      battlePass: { hardcore: -2, comunidad: -1 },
      dayOneDLC: { hardcore: -4, comunidad: -3 },
      /** × agresividad, en modelos con MTX. */
      mtxPerAggression: { hardcore: -6, comunidad: -2.5 },
      abusivePrice: { casual: -4, comunidad: -3, hardcore: -2 },
      generousPrice: { casual: 3, comunidad: 3, hardcore: 1 },
      /** Secuela-refrito: repetir combo reciente (docs/06 §2). */
      rehash: { critica: -5, hardcore: -3 },
      /** Lanzamiento honesto: premium sin trampas y precio no abusivo. */
      honestRelease: { comunidad: 2, hardcore: 2 },
    },
    /** Reputación de empleador → pool de contratación (docs/05 §7). */
    employer: {
      /** Multiplicador de la prob. de candidatos senior/estrella: 0 → min, 100 → max. */
      tierFactorMin: 0.6,
      tierFactorMax: 1.4,
      /** Prima salarial exigida: rep 0 → +25 %, rep 100 → −10 %. */
      salaryPremiumMin: 0.9,
      salaryPremiumMax: 1.25,
      /** Golpes directos a la reputación de empleador. */
      firedHit: 3,
      quitHit: 1.5,
      /** Drenaje semanal por empleado (no fundador) bajo crunch (docs/05 §6). */
      crunchPerEmployeeWeek: 0.15,
    },
  },

  /** El dilema moral (docs/06 §5): deuda oculta, deriva visible y escándalos. */
  moral: {
    /** Ganancias de deuda de reputación por palanca de codicia. */
    debt: {
      lootboxRelease: 4,
      /** Extra si el juego con loot boxes apunta a público infantil. */
      lootboxChildExtra: 4,
      battlePassRelease: 1,
      dayOneDlcRelease: 2.5,
      /** × agresividad, en modelos con MTX. */
      mtxAggressionRelease: 4,
      abusivePriceRelease: 2,
      rehashRelease: 2,
      /** Por empleado (no fundador) y semana de crunch. */
      crunchPerEmployeeWeek: 0.15,
      /** El público olvida despacio: decaimiento multiplicativo semanal. */
      decayPerWeek: 0.98,
      /** Restos menores se limpian para no acumular ruido. */
      cleanupThreshold: 0.05,
    },
    /** Un "refrito": repetir combo tema×género a este plazo del anterior (docs/06 §2). */
    rehashWindowWeeks: 52,
    /** Deriva moral visible (Balanza "El Precio", docs/10 §7.4), rango −1..1. */
    drift: {
      lootboxRelease: -0.25,
      dayOneDlcRelease: -0.15,
      mtxAggressionRelease: -0.2,
      abusivePriceRelease: -0.15,
      rehashRelease: -0.1,
      crunchPerWeek: -0.02,
      /** Lanzamiento honesto (premium sin trampas, precio no abusivo). */
      honestRelease: 0.15,
      generousPriceRelease: 0.1,
      /** Cuidar al equipo (formar/motivar) también inclina la balanza. */
      careAction: 0.03,
      decayPerWeek: 0.95,
      /** Hasta esta agresividad, un modelo con MTX aún cuenta como "honesto". */
      honestAggressivenessMax: 0.2,
    },
    /** Escándalos (docs/06 §5): probabilidad y magnitud escalan con la deuda. */
    scandal: {
      /** Deuda "gratis": por debajo no hay riesgo. */
      freeDebt: 5,
      /** Probabilidad semanal por punto de deuda por encima del margen. */
      chancePerDebtPoint: 0.025,
      maxChancePerWeek: 0.35,
      /** Magnitud = clamp(deuda / debtForMaxMagnitude, min, 1). */
      debtForMaxMagnitude: 15,
      minMagnitude: 0.4,
      /** El escándalo "cobra" esta fracción de la deuda de su fuente. */
      dischargeFraction: 0.6,
      /**
       * Semanas mínimas entre escándalos: episódicos, no crónicos (con la
       * duración típica de 6–8 semanas, deja aire entre golpe y golpe).
       */
      cooldownWeeks: 16,
      /**
       * Colchón/amplificador por reputación previa (docs/06 §5): los golpes se
       * multiplican por 1 − coef·(repAgregada−50)/50, acotado a [min, max].
       */
      cushionCoef: 0.5,
      cushionMin: 0.6,
      cushionMax: 1.4,
    },
  },

  /** Puntuación de Legado (docs/06 §6): normalizaciones de cada eje 0..100. */
  legacy: {
    /**
     * Riqueza: 100 puntos al alcanzar este capital máximo histórico.
     * Afinado en 7G (bots de partida completa): con 500k saturaba —
     * el umbral de corporación ya es 800k; 100 de riqueza debe exigir
     * un imperio de verdad, no solo llegar a la etapa 4.
     */
    wealthCapitalScale: 2_000_000,
    /** Prestigio: mezcla de reputación agregada y reseña media histórica. */
    prestigeRepWeight: 0.6,
    prestigeReviewWeight: 0.4,
    /** Impacto: puntos por apostar temprano por una moda + récord de ventas. */
    impactPerEarlyRelease: 20,
    impactBestSellerScale: 60_000,
    impactBestSellerWeight: 40,
    /** Obras maestras: reseña media ≥ este umbral cuenta como obra (docs/06 §6). */
    masterpieceReview: 90,
    masterpiecePoints: 25,
    /** Ética: parte de la reputación de empleador/comunidad menos los pecados. */
    ethicsEmployerWeight: 0.5,
    ethicsCommunityWeight: 0.5,
    ethicsScandalPenalty: 8,
    ethicsCrunchWeekPenalty: 0.5,
    ethicsCrunchPenaltyCap: 30,
    ethicsFiredPenalty: 1,
  },

  development: {
    /**
     * Semanas de CALENDARIO por fase, según tamaño (×3 fases). La duración la
     * fija SOLO el tamaño: el calendario avanza 1 semana por tick y la plantilla
     * NO acelera (más gente ejecuta mejor, no más rápido; ver maxCrewRatio).
     * Calibrado a docs/02 §6: juego pequeño de garaje 6 semanas (~4–8) y AAA
     * de 120 semanas (~2,3 años, dentro del "2–3 años").
     */
    phaseWeeksBySize: {
      pequeno: 2,
      mediano: 6,
      grande: 14,
      muyGrande: 24,
      aaa: 40,
    } satisfies Record<ProjectSize, number>,
    /**
     * Dotación relativa (crewRatio = output / plantilla esperada del tamaño, con
     * la esperada = sizeGate[size].minStaff). Con la plantilla justa vale 1: el
     * ritmo de QA/bugs es el nominal. Más gente (o motores/crunch) ejecuta mejor
     * pero con rendimientos decrecientes: se topa aquí (ley de Brooks).
     */
    maxCrewRatio: 1.5,
    /** Deuda de bugs extra por semana con el equipo a media dotación (× (1 − crewRatio)). */
    understaffBugsPerWeek: 0.05,
    /**
     * Requisitos por tamaño de proyecto (docs/17 E1, docs/18 V4-b): plantilla
     * mínima y etapa de escala mínima. El "Muy grande" pide Estudio grande; el
     * AAA queda bloqueado hasta Corporación (etapa 5) y exige una organización
     * de 40 personas — su crewRatio espera esa plantilla: intentarlo con menos
     * lo deja a medio cocer. La UI atenúa los tamaños bloqueados con su
     * requisito; el núcleo lo valida en startProject (sizeBlockReason). El
     * coste base va en economy.sizeBaseCost.
     */
    sizeGate: {
      pequeno: { minStaff: 1, minStage: 1 },
      mediano: { minStaff: 3, minStage: 2 },
      grande: { minStaff: 8, minStage: 3 },
      muyGrande: { minStaff: 15, minStage: 4 },
      aaa: { minStaff: 40, minStage: 5 },
    } satisfies Record<ProjectSize, { minStaff: number; minStage: ScaleStage }>,
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
    featureScopeTarget: {
      pequeno: 4,
      mediano: 8,
      grande: 14,
      muyGrande: 18,
      aaa: 22,
    } satisfies Record<ProjectSize, number>,
    /** innovationMod: rango 0.9–1.15 [DECIDIDO, docs/12 §3]. */
    innovation: {
      min: 0.9,
      max: 1.15,
      /** Modificador de una combinación tema×género nunca lanzada por el estudio. */
      freshCombo: 1.05,
      /** Cuánto baja por cada lanzamiento previo con la misma combinación. */
      repeatStep: 0.05,
    },
    /**
     * techoQ(era, tamaño): límite de Q por era (docs/03 §3). Sube con las
     * eras (mejor tecnología permite mejores juegos); en eras tardías un
     * juego pequeño ya no puede ser una obra maestra absoluta.
     */
    capByEraSize: {
      E1: { pequeno: 85, mediano: 85, grande: 85, muyGrande: 85, aaa: 85 },
      E2: { pequeno: 88, mediano: 88, grande: 88, muyGrande: 88, aaa: 88 },
      E3: { pequeno: 88, mediano: 91, grande: 91, muyGrande: 91, aaa: 91 },
      E4: { pequeno: 90, mediano: 93, grande: 94, muyGrande: 94, aaa: 94 },
      E5: { pequeno: 92, mediano: 95, grande: 96, muyGrande: 96, aaa: 96 },
      E6: { pequeno: 93, mediano: 96, grande: 98, muyGrande: 98, aaa: 98 },
      E7: { pequeno: 94, mediano: 97, grande: 100, muyGrande: 100, aaa: 100 },
    } satisfies Record<EraId, Record<ProjectSize, number>>,
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
      /**
       * Semanas de TRABAJO que el equipo saca en una semana real de calendario
       * al crunchear (docs/02 §6.1): dobles turnos = el proyecto avanza 2 de su
       * plazo por cada semana que pasa, así que sale en la mitad de tiempo. Es
       * la ÚNICA vía de comprimir el plazo, y es una decisión explícita que se
       * paga: todo lo que se acumula por semana escala igual (el doble de deuda
       * de bugs), más el desgaste de moral/energía/lealtad de abajo. La
       * plantilla, en cambio, nunca acorta el calendario.
       */
      weeksPerTick: 2,
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
    /**
     * Despedir golpea la moral y lealtad de los que quedan (docs/05 §6). Un
     * despido puntual solo tiene ese coste modesto (+ finiquito y el firedHit de
     * empleador). Los despidos MASIVOS (docs/17 E3) escalan: 3+ en una ventana de
     * 8 semanas es un ERE sonado que golpea fuerte a Empleador, hunde más la
     * moral de los supervivientes y —al filtrarse como noticia— toca a la
     * Comunidad. La ventana vive en state.recentFireWeeks (docs/05 §7).
     */
    firing: {
      teamMoraleHit: 8,
      teamLoyaltyHit: 5,
      massLayoff: {
        windowWeeks: 8,
        threshold: 3,
        employerHit: 6,
        teamMoraleHit: 6,
        teamLoyaltyHit: 4,
        communityRepHit: 3,
        sentimentHit: 6,
      },
    },

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

    /**
     * Las 5 etapas de escala (docs/02 §4, docs/18 V4-a/c). Cumplir el
     * REQUISITO (capital + plantilla) solo HABILITA la ampliación: el avance
     * SE COMPRA con un desembolso (upgradeCost) desde la cronología de escala
     * (expandStudio). El coste es siempre menor que el requisito de capital,
     * así comprar nunca deja la caja en negativo. Los umbrales están
     * escalonados para que Corporación aterrice hacia E5–E6 (docs/18 V4-c).
     */
    scale: {
      /**
       * Lo que hace falta tener para poder COMPRAR la entrada a cada etapa.
       * El requisito de plantilla de cada una cabe SIEMPRE en el aforo de la
       * anterior (4≤4, 8≤10, 20≤25): sin ese cuidado habría una etapa
       * incomprable. El de capital supera siempre el coste de la ampliación.
       */
      requirementsByStage: {
        2: { capital: 25_000, staff: 0 },
        3: { capital: 200_000, staff: 4 },
        4: { capital: 1_500_000, staff: 8 },
        5: { capital: 8_000_000, staff: 20 },
      } satisfies Record<Exclude<ScaleStage, 1>, { capital: number; staff: number }>,
      /** El desembolso de la ampliación (la mudanza/obra; docs/18 V4-c). */
      upgradeCostByStage: {
        2: 10_000,
        3: 100_000,
        4: 750_000,
        5: 4_000_000,
      } satisfies Record<Exclude<ScaleStage, 1>, number>,
      staffCapByStage: { 1: 1, 2: 4, 3: 10, 4: 25, 5: 100 } satisfies Record<ScaleStage, number>,
      /** Proyectos en paralelo permitidos por etapa (docs/02 §4). */
      projectCapByStage: { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 } satisfies Record<ScaleStage, number>,
      /** Tamaño del pool de contratación por etapa (más escala, más candidatos). */
      poolSizeByStage: { 1: 3, 2: 3, 3: 4, 4: 6, 5: 8 } satisfies Record<ScaleStage, number>,
    },
  },

  /** Investigación (docs/02 §3 y docs/12 §6): puntos 💡 y su goteo. */
  research: {
    /** ~1 💡 por persona·semana en I+D [DECIDIDO, docs/12 §6]. */
    pointsPerPersonWeek: 1,
    /** 💡 al lanzar un juego, por tamaño ("se acumulan al desarrollar juegos"). */
    releasePointsBySize: {
      pequeno: 2,
      mediano: 4,
      grande: 7,
      muyGrande: 9,
      aaa: 12,
    } satisfies Record<ProjectSize, number>,

    /**
     * Progresión del conocimiento (docs/17 P1/P2). Todo data-driven: qué temas
     * son libres, cuánto cuesta investigar el resto (por era del tema) y el
     * atajo predictivo por combo.
     */
    knowledge: {
      /**
       * Temas libres desde el inicio (docs/17 P1): 2–3 para que el arranque no
       * sea monótono. El resto se desbloquea con 💡. Todos son de E1.
       */
      starterThemes: ['fantasia', 'cienciaFiccion', 'espacio'] as readonly string[],
      /**
       * Coste en 💡 de investigar un tema, por la era en que se puede investigar
       * (su `appearsInEra`). Barato en E1 (los puntos escasean); sube con las
       * eras (hay más 💡 en circulación). La era HABILITA la opción; el tema
       * cuesta 💡 igualmente (docs/17 P1: pasar de era no regala temas).
       */
      themeCostByEra: { E1: 6, E2: 10, E3: 14, E4: 18, E5: 22, E6: 26, E7: 30 } satisfies Record<
        EraId,
        number
      >,
      /**
       * "Investigar resultados" de un combo lanzado (docs/17 P2): 💡 por revelar
       * el atajo predictivo de esa combinación (fit del combo + balance del
       * género). Barato: aprender de lo que YA hiciste debe ser accesible.
       */
      insightCost: 4,
    },
  },

  /** Premios anuales (docs/06 §7): umbrales por categoría y recompensas. */
  awards: {
    /** La ceremonia se celebra cada fin de año (52 ticks = 1 año, docs/02 §1). */
    intervalWeeks: 52,
    /** Umbrales de candidatura (sin rivales aún: o los superas, o el premio vuela). */
    thresholds: {
      goty: { minReview: 78 },
      innovacion: { minInnovation: 1.03, minReview: 62 },
      tecnica: { minPolish: 0.92, minReview: 62 },
      diseno: { minFit: 0.85, minReview: 68 },
      pueblo: { minCasualReview: 74 },
    },
    /** Recompensas por premio ganado (docs/06 §7). */
    rewards: {
      /** Reputación: sobre todo Crítica/Prensa; el talento también toma nota. */
      repDeltas: { critica: 2.5, prensa: 2, empleador: 1 },
      /** Hype pendiente para el próximo proyecto, por premio (con tope). */
      hypePerAward: 0.08,
      hypeCap: 0.25,
    },
  },

  /** Gestión por políticas en la escala grande (docs/02 §4 y docs/10 §14). */
  policies: {
    /**
     * Etapa de escala desde la que las políticas están disponibles: el
     * Estudio grande (aforo 25; con 5 etapas desde 8.8, la 3 solo tiene 10).
     */
    minStage: 4 as ScaleStage,
    /** Política salarial: coste semanal vs ánimo de la plantilla. */
    salary: {
      austera: { costFactor: 0.92, moralePerWeek: -1, loyaltyPerWeek: -0.7, employerRepPerWeek: -0.06 },
      mercado: { costFactor: 1, moralePerWeek: 0, loyaltyPerWeek: 0, employerRepPerWeek: 0 },
      generosa: { costFactor: 1.12, moralePerWeek: 0.6, loyaltyPerWeek: 0.5, employerRepPerWeek: 0.06 },
    },
    /** La política generosa/anti-crunch solo sube la moral hasta este techo. */
    moraleCap: 85,
    /** Anti-crunch: prohibido crunchear; el equipo se siente seguro. */
    antiCrunch: { moralePerWeek: 0.4 },
    /** Formación automática: cada N semanas, al empleado más flojo. */
    autoTraining: { intervalWeeks: 4 },
    /** Bonus automático a quien tenga la moral bajo el umbral (máx. K/semana). */
    autoBonus: { moraleThreshold: 40, maxPerWeek: 2 },
  },

  market: {
    /** Evolución de popularidades por tick (docs/04 §2): base guionizada + ruido suave. */
    popularity: {
      /**
       * Amplitud del ruido semanal (± sobre la popularidad, antes del clamp 0..1).
       * Con la persistencia forman un AR(1): la desviación estacionaria vale
       * ~amplitud/√(3·(1−persistencia²)) ≈ 0,037 (antes 0,022; docs/18 V2 pedía
       * modas "más vivas"). Las flechas ↑→↓ y la etapa del ciclo se leen de la
       * CURVA BASE (ver trendStateAt), así que el ruido nunca las hace parpadear:
       * solo matiza la popularidad efectiva de ventas/fit.
       */
      noiseAmplitude: 0.03,
      /** Persistencia de la desviación: cada tick la popularidad revierte hacia la curva base. */
      noisePersistence: 0.88,
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
      /**
       * Ganancia semanal base por tamaño de proyecto. Con passiveCap ya NO fija
       * el hype final (eso lo hace el tope), sino la VELOCIDAD con la que se
       * llega a la meseta: por eso los desarrollos largos siguen generando más
       * expectación total, pero ninguno se dispara por pura duración.
       */
      gainBySize: {
        pequeno: 0.07,
        mediano: 0.05,
        grande: 0.04,
        muyGrande: 0.04,
        aaa: 0.045,
      } satisfies Record<ProjectSize, number>,
      /**
       * Meseta del hype PASIVO (docs/18 V3): el que sube solo, sin comprar nada.
       * La ganancia semanal se multiplica por (1 − hype/passiveCap), así que el
       * hype pasivo se acerca a este valor y se para; la zona roja (overHype-
       * Threshold) queda fuera de su alcance. Llegar arriba exige DECISIÓN —
       * marketing (docs/06 §4) o creadores (docs/07 §3) — no tiempo.
       *
       * Antes, la ganancia iba acoplada a la duración (que varía ×20 entre
       * tamaños): un Grande llegaba a 0,78 y un AAA topaba en 1,0 hacia la
       * semana 32 de 80, sin que el jugador hiciera nada. Con el tope, el hype
       * pasivo al lanzar aterriza en ~0,16 / 0,25 / 0,31 / 0,35 (pequeño →
       * AAA), inmune a la duración y al crunch.
       *
       * Consecuencia [DECIDIDO · Fase 8.7]: si ya compraste hype por encima de
       * la meseta, el pasivo deja de aportar (el factor se satura a 0). Comprar
       * marketing tarde rinde más que comprarlo pronto.
       */
      passiveCap: 0.35,
      /** La moda alimenta la expectación: ganancia × (base + span·popCombo). */
      popCouplingBase: 0.4,
      popCouplingSpan: 0.6,
      max: 1,
      /** Zona roja del Manómetro de Hype (docs/10 §7.5): sobre-hype a partir de aquí. */
      overHypeThreshold: 0.65,
      /**
       * Castigo por sobre-hype al lanzar (docs/17 E2, el doble filo de docs/04
       * §4): si el hype entró en la zona roja (≥ overHypeThreshold) pero el juego
       * NO cumple (reseña < reviewBar), la brecha se cobra. brecha =
       * clamp01((hype−umbral)/(1−umbral)) × clamp01((reviewBar−reseña)/reviewBar),
       * 0 por debajo de minGap. Solo pega cuando hay MUCHO hype Y reseña baja.
       *   · peor COLA de ventas: el pico day-one se mantiene (ya compraron por el
       *     hype), pero el boca a boca hunde la cola (× 1 − brecha·tailPenaltyMax).
       *   · golpe de reputación a quienes se sienten estafados (hardcore/comunidad,
       *     × brecha). Independiente del flag overPromised (ese dispara además la
       *     crisis de promesa rota de docs/07 §4).
       */
      overHype: {
        reviewBar: 68,
        minGap: 0.05,
        tailPenaltyMax: 0.45,
        repHit: { hardcore: 5, comunidad: 4 },
      },
      /** Puntos de reseña restados con hype 1.0 (penalizaciónExpectativas, docs/04 §5). */
      reviewPenaltyMax: 10,
      /** Hasta este hype las expectativas no endurecen la reseña. */
      freeHype: 0.25,
      /** Empuje a las ventas de salida: pico × (1 + coef·hype) (docs/04 §6). */
      salesSpikeCoef: 1.2,
    },

    /** De Calidad a Reseña (docs/04 §5). Los sesgos por segmento viven en data/segments.ts. */
    reviews: {
      /**
       * estándarEra (docs/02 §5): el listón del público sube con las eras —
       * la misma Q puntúa peor cuanto más tarde (lo compensan los techos de
       * calidad crecientes, las features nuevas y la investigación).
       */
      eraStandard: {
        E1: 1,
        E2: 0.97,
        E3: 0.94,
        E4: 0.92,
        E5: 0.9,
        E6: 0.88,
        E7: 0.86,
      } satisfies Record<EraId, number>,
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

  /** La capa social (docs/07): sentimiento, creadores, leaks, bombing y crisis. */
  community: {
    /** Termómetro de sentimiento 0..100 (docs/07 §2). */
    sentiment: {
      initial: 50,
      /** Reversión semanal hacia la reputación de comunidad (el poso lento). */
      revertRate: 0.15,
      /** Lastre semanal mientras hay crisis abiertas / bombing activo. */
      crisisDragPerWeek: 2,
      bombDragPerWeek: 1.5,
      /** Sacudida al lanzar: (reseña − neutral) / divisor, con tope ±. */
      releaseNeutralReview: 60,
      releaseDivisor: 3,
      releaseJoltCap: 12,
      /** Sacudidas inmediatas por palanca moral al lanzar (docs/06 §2). */
      levers: {
        lootboxes: -6,
        /** × agresividad, en modelos con MTX. */
        mtxPerAggression: -5,
        dayOneDLC: -3,
        abusivePrice: -4,
        generousPrice: 4,
        honestRelease: 2,
      },
      /** modificadorComunidad(sentimiento) = 1 + coef·(sentimiento−50)/50 (docs/04 §6). */
      salesCoef: 0.25,
    },

    /** Feed de posts (docs/10 §7.3). */
    feed: {
      maxPosts: 30,
      /** Probabilidad semanal de un post ambiental (solo sabor). */
      ambientChance: 0.4,
      /** Bandas del termómetro para el tono ambiental. */
      positiveBand: 62,
      negativeBand: 38,
    },

    /** Reparto de claves (docs/07 §3): recurso limitado por lanzamiento. */
    keys: {
      bySize: {
        pequeno: 2,
        mediano: 3,
        grande: 4,
        muyGrande: 5,
        aaa: 5,
      } satisfies Record<ProjectSize, number>,
      /** Hype inmediato al anunciar la colaboración: (alcance/escala) × boost. */
      reachScale: 1_000,
      hypeBoost: 0.04,
      hypeBoostCap: 0.12,
    },

    /** resultadoCreador = fit × factorCalidad × factorBugs (docs/07 §3). */
    creators: {
      /** fit = wG·afinidadGénero + wA·afinidadPúblico. */
      fitGenreWeight: 0.6,
      fitAudienceWeight: 0.4,
      /** factorCalidad = clamp01(Q / (floor + span·exigencia)): el exigente pide Q≈100. */
      qualityFloor: 60,
      qualitySpan: 40,
      /** factorBugs = max(0, 1 − penal·bugLevel). */
      bugPenalty: 1.6,
      /** Umbrales del resultado: ≥ éxito · ≥ tibio · debajo, desastre. */
      successThreshold: 0.6,
      lukewarmThreshold: 0.35,
      /** Empuje al pico de ventas: (alcance/escala) × resultado × coef, con tope total. */
      spikeBoostCoef: 0.3,
      spikeBoostCap: 1.5,
      /** Δ reputación por segmento objetivo: share × (resultado − neutral) × coef, tope ±cap. */
      repNeutral: 0.45,
      repCoef: 8,
      repCap: 4,
      /** Sacudidas de sentimiento por directo. */
      sentimentSuccess: 2.5,
      sentimentDisaster: -3,
      /**
       * Bug en directo (docs/07 §3): determinista por bugLevel — solo si
       * lanzaste un juego con bugs a los creadores; el PRNG elige a quién.
       */
      liveBugThreshold: 0.35,
      /** El directo del afectado se hunde: resultado × este factor. */
      liveBugOutcomeFactor: 0.3,
      /** Severidad de la crisis: clamp(bugLevel × coef, min de crisis, 1). */
      liveBugSeverityCoef: 1.4,
    },

    /** Leak de la build alpha (docs/07 §4): exige empleados (alguien que filtre). */
    leak: {
      minPhase: 2,
      minHype: 0.25,
      /** El PRNG solo decide el timing dentro de la ventana elegible. */
      chancePerWeek: 0.12,
      transparency: { hype: -0.05, sentiment: 4, communityRep: 1.5, drift: 0.05 },
      capitalize: { hype: 0.1, drift: -0.05 },
    },

    /** Dilema de sobre-hype al cruzar la zona roja del manómetro (docs/10 §7.5). */
    overHype: {
      moderate: { hypeMargin: 0.05, sentiment: 2, communityRep: 1, drift: 0.05 },
      promise: { hype: 0.15, drift: -0.1 },
    },

    /** Promesa vs realidad (docs/07 §4): expectativa = base + span×hype al lanzar. */
    promise: {
      expectedBase: 55,
      expectedSpan: 30,
      /** Brecha mínima (puntos de reseña) para que estalle la crisis. */
      minGap: 8,
      /** Brecha con la que la severidad llega a 1. */
      gapForMaxSeverity: 30,
      /** Cumplir lo prometido premia (el sobre-hype que sí entrega). */
      deliveredSentiment: 6,
      deliveredCommunityRep: 2,
    },

    /** Crisis con reloj (docs/07 §5). El colchón reutiliza moral.scandal.cushion*. */
    crisis: {
      minSeverity: 0.15,
      /** Golpe de sentimiento al estallar (× severidad). */
      spawnSentimentHit: 8,
      /** Ignorar el reloj = silencio forzado con los golpes multiplicados. */
      lateFactor: 1.3,
      /** Silencio: la reputación de comunidad decide amainar (≥) o pudrirse (<). */
      silenceFadeRep: 55,
      silence: {
        fade: { repDeltas: { comunidad: -1 }, sentiment: -2 },
        rot: {
          repDeltas: { comunidad: -4, hardcore: -2, prensa: -2 },
          sentiment: -8,
          bombExtendWeeks: 3,
        },
      },
      /** 'culpar' se destapa (backfire) desde esta severidad — determinista. */
      culparBackfireSeverity: 0.6,
      /** Efectos 'acorta'/'alarga' sobre el bombing ligado. */
      bombShortenFactor: 0.5,
      bombExtendWeeks: 3,
      /** 'acorta' sobre el escándalo de docs/06 que la originó. */
      scandalShortenFactor: 0.5,
      /** Duración del bombing = round(semanasBase × (floor + (1−floor)×severidad)). */
      bombDurationSeverityFloor: 0.5,
      /** Crisis resueltas retenidas como historial en el estado. */
      historyMax: 8,
    },

    /** Las "Estrellas mediáticas" asignadas dan hype extra (docs/07 §6). */
    mediaStarHypeCoef: 1,
  },

  sales: {
    /** factorReseña = (reseña/100)^exponente: las reseñas altas venden desproporcionadamente más. */
    reviewExponent: 2,
    /**
     * La demanda escala con el tamaño del proyecto. Recalibrado al fijar el
     * calendario (la plantilla ya no acelera): un juego grande cuesta ahora
     * ~56× las persona-semanas de uno pequeño y un AAA ~300× (semanas × crew
     * esperada), no 3,5× y 6× como cuando más gente acortaba el plazo. Para que
     * ir a lo grande sea una apuesta con sentido —y no ruina segura— su público
     * potencial crece en el mismo orden (los AAA venden órdenes de magnitud más
     * que un indie). El precio por tamaño (20→60 💰) aporta el resto del margen.
     */
    sizeDemandFactor: {
      pequeno: 1,
      mediano: 5,
      grande: 20,
      muyGrande: 40,
      aaa: 70,
    } satisfies Record<ProjectSize, number>,
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
