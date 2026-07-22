import type { EraId } from '../core/model/era';
import type { ScaleStage } from '../core/model/gameState';
import type { MonetizationModel } from '../core/model/moral';
import type { ProjectSize } from '../core/model/project';
import type { RivalProfile, RivalTier } from '../core/model/rivals';
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
     * capital + el desembolso (25M + 12,5M desde 10.2-B). En sandbox no hay
     * presión: se empieza pudiendo todo. (El gate de TRAYECTORIA de 10.2-B sí
     * se cumple jugando: el sandbox regala caja, no carrera.)
     */
    initialCapital: 60_000_000,
    researchPoints: 200,
  },

  economy: {
    /**
     * Capital inicial del garaje [DECIDIDO docs/12 §6; recalibrado en 9.6]:
     * bajó de 10.000 a 4.000 💰 para que la escasez temprana sea real
     * (docs/19 §9.6). Un pequeño cuesta ~4.100 💰 con todo (500 de arranque +
     * 600/semana de desarrollo y luz durante 6 semanas): auto-publicar el
     * primer juego es una apuesta que pasa por números rojos hasta que las
     * ventas llegan, y la oferta del publisher (o el préstamo) es una
     * decisión de verdad, no decoración. Con 6–10k los bots demostraron que
     * la oferta jamás se firma (el pequeño se autofinancia de sobra).
     */
    initialCapital: 4_000,
    /** Coste fijo semanal del garaje (luz, alquiler...); infraestructura de docs/06 §4. */
    weeklyUpkeep: 100,
    /**
     * Alquiler/infraestructura extra semanal por etapa de escala (docs/02 §4,
     * docs/18 V4-d): cada etapa QUEMA considerablemente más. Un estudio grande
     * no es riesgo cero: sostenerlo exige seguir sacando éxitos. Esto mata el
     * "punto dulce" invencible (una Corporación quema ~1M 💰/año solo en
     * infraestructura, antes de nóminas).
     *
     * Etapa 5 recortada en 10.2-B (30k → 22k, docs/20 W2-bis): EXP3 demostró
     * que la etapa 5 SÍ se paga sola (margen operativo +26M), así que el
     * overhead nunca fue la "trampa de Corporación" — el trim es APOYO al
     * arreglo real (aligerar el AAA), no la palanca principal.
     */
    upkeepExtraByStage: {
      1: 0,
      2: 300,
      3: 1_500,
      4: 7_000,
      5: 22_000,
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
     * económico, no solo de tiempo.
     *
     * ESCALERA DE 10.2-B (docs/20 W2), la palanca central del pase económico.
     * El contrafactual de la 10.2-A (EXP2) midió, a igualdad TOTAL de
     * condiciones, un ROI que se disparaba con el tamaño (Mediano ~57–62× →
     * Grande/Muy grande ~123–166×): el acantilado estaba en Grande, y el coste
     * base era el 5–7 % del total justo ahí. Estos números lo aplanan:
     * ~32k / 256k / 1M / 4M de coste TOTAL objetivo (×8 por escalón) del
     * Mediano al AAA, mientras el ingreso escala ~×5–6 → **más beneficio
     * absoluto al subir de tamaño, peor margen**. Esa es la regla de diseño.
     *
     * DOS DESVIACIONES de la propuesta original de W2, ambas medidas con bots:
     *
     * · El PEQUEÑO se queda en 500 y NO sube a 1.000. Con 1.000 el optimizador
     *   QUEBRABA en E2 s410: el garaje vive de márgenes de ~1k/semana y nunca
     *   llegaba a juntar la caja de su primer mediano (se quedaba encerrado en
     *   juegos pequeños con nómina de estudio). Además encarecer el pequeño va
     *   CONTRA el objetivo de W2: su ROI (3,3×) ya es el peor de la tabla, así
     *   que subirlo agranda el acantilado que veníamos a aplanar.
     * · El AAA aterriza en 1,2M, entre los 800k propuestos y el 1,6M vetado.
     *   El veto a 1,6M (docs/20 §10.2-B) sigue en pie —dejaría al AAA
     *   estrictamente dominado por el Muy grande y nadie lo haría jamás—, pero
     *   con 800k el contrafactual medía un ROI de AAA (31–55×) POR ENCIMA del
     *   Muy grande (24–41×): el escalón cimero volvía a ser el más rentable, y
     *   eso es exactamente la condición 1 de W2 incumplida. A 1,2M el ROI
     *   queda justo por debajo del Muy grande en E5 y E6 mientras el beneficio
     *   ABSOLUTO sigue doblándolo largamente — que es la forma correcta de que
     *   la cima sea una cima: más dinero, peor margen.
     *
     * GUARDARRAÍL INNEGOCIABLE (se verifica en balance.test.ts y con los bots,
     * src/test/economyReport102B.ts): tras aplicar la escalera, el BENEFICIO
     * ABSOLUTO debe seguir CRECIENDO con el tamaño. Si crecer diese menos
     * dinero, nadie crecería y se rompería el Pilar 5.
     */
    sizeBaseCost: {
      pequeno: 500,
      mediano: 5_000,
      grande: 88_000,
      muyGrande: 460_000,
      aaa: 1_200_000,
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

    /**
     * Préstamos [DECIDIDO, docs/12 §6; interés en 10.1 (docs/20 W1);
     * REDISEÑADOS en 10.2-B (docs/20 §"Préstamos — rediseño, no parche")].
     *
     * El arreglo de la 10.1 resultó COSMÉTICO: la Fábrica cerraba la partida
     * con 124,9 mil millones de interés acumulado que jamás la tocaban, porque
     * (a) `availableCredit` solo descontaba el principal y (b) nada obligaba a
     * amortizar, así que la deuda capitalizaba al infinito como un número
     * decorativo. Dos cambios cierran el círculo:
     *   1. la línea disponible descuenta la DEUDA VIVA (principal + interés):
     *      endeudarte estrecha tu propio crédito;
     *   2. hay AMORTIZACIÓN FORZOSA semanal que SÍ drena caja (`minPayment`).
     * Objetivo de diseño (docs/06 §4): endeudarse empuja hacia la codicia
     * porque hay que devolverlo, no es dinero gratis.
     */
    loans: {
      /**
       * Interés semanal sobre la DEUDA VIVA (~1 %/semana). Desde 10.1 (docs/20
       * W1) el interés CAPITALIZA en la deuda en vez de cobrarse como cuota:
       * cada tick `interesAcumulado += round(deudaViva × este valor)` y la
       * deuda viva = principal + interés compone semana a semana. Desde 10.2-B
       * la cuota mínima obligatoria muerde por encima de esta tasa, así que
       * una deuda desatendida DECRECE despacio en vez de dispararse.
       */
      weeklyInterest: 0.01,
      /**
       * Amortización FORZOSA semanal (10.2-B): cada tick el banco se cobra
       * `max(minPaymentFloor, round(deudaViva × minPaymentRate))` de la CAJA,
       * topado a la deuda viva y aplicado primero al interés y luego al
       * principal. Con 2,5 % de cuota contra 1 % de interés, la deuda viva
       * baja ~1,5 %/semana: un préstamo desatendido se salda en ~3 años
       * pagando, y mientras tanto la cuota compite con la nómina. Si no hay
       * caja, la cuota se cobra igual y empuja a los números rojos — esa es la
       * consecuencia real que faltaba.
       */
      minPaymentRate: 0.025,
      /** Suelo de la cuota: una deuda residual se salda sin arrastrarse años. */
      minPaymentFloor: 100,
      /** Principal máximo: ~6 meses de costes fijos actuales. */
      capWeeksOfFixedCosts: 26,
      /** La reputación agregada escala la línea de crédito: 0 → min, 100 → max. */
      creditFactorMin: 0.5,
      creditFactorMax: 1.5,
      /** Línea mínima aunque los costes fijos sean ínfimos (garaje). */
      floorAmount: 5_000,
      /**
       * Espiral de deuda (docs/20 W1c): aviso importante cuando el servicio de
       * la deuda supera esta fracción del ingreso medio reciente — el jugador
       * debe VER venir la espiral de muerte, no descubrirla cuando ya es
       * irreversible. El aviso salta en el flanco de subida y no vuelve a
       * saltar hasta que la deuda se enfría por debajo del umbral. Desde 10.2-B
       * lo que se compara es la CUOTA obligatoria (el drenaje real de caja), no
       * el interés teórico; el suelo absoluto sigue midiéndose sobre el interés
       * para no gritar por un puente trivial.
       */
      spiral: {
        /** La cuota semanal supera este × ingreso medio reciente → espiral. */
        incomeRatio: 0.5,
        /** Ventana (semanas) del ingreso medio reciente que se compara. */
        lookbackWeeks: 12,
        /**
         * Suelo absoluto: por debajo de este interés semanal NO se avisa aunque
         * el ingreso sea 0 — una deuda trivial (préstamo puente pequeño) no es
         * una espiral. Con ~1 %/sem, esto equivale a una deuda viva ≥ 50k 💰.
         */
        minWeeklyInterest: 500,
      },
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

  /**
   * Publishers (Fase 9.6, docs/19 §9.6): la muleta útil pero cara del early
   * game. Los PERFILES de trato (reparto, IP, exclusividad) viven en
   * data/publishers.ts; aquí, los factores económicos comunes a todas las
   * ofertas. El adelanto es NO recuperable y el reparto es sobre el BRUTO,
   * para siempre — sencillez leonina, legible en una tarjeta.
   */
  publishers: {
    advance: {
      /**
       * El adelanto cubre el coste de desarrollo estimado del tamaño
       * (semanas de calendario × devCostPerPersonWeek) × advanceCoverage del
       * publisher × ajuste por reputación. No incluye los costes de arranque
       * (licencias + coste base + cuota de motor): esos los paga el publisher
       * DIRECTAMENTE al firmar — tú no ves ese dinero, ni su factura.
       */
      repFactorMin: 0.9,
      repFactorMax: 1.15,
      /** Redondeo del adelanto (que la cifra de la tarjeta sea legible). */
      roundTo: 500,
    },
    /**
     * Bolsa de marketing base por tamaño (× marketingBudgetMult del
     * publisher): tus campañas de ese proyecto se pagan de la bolsa hasta
     * agotarla; a partir de ahí, de tu caja. Sin bolsa infinita: el marketing
     * sin tope de 9.1 sería explotable con dinero ajeno.
     */
    marketingBudgetBySize: {
      pequeno: 3_000,
      mediano: 8_000,
      grande: 25_000,
      muyGrande: 80_000,
      aaa: 200_000,
    } satisfies Record<ProjectSize, number>,
    /**
     * Tamaño mínimo del primer juego auto-publicado que celebra la
     * independencia (aviso "Te has independizado", tras ≥1 trato firmado).
     */
    independenceMinSize: 'mediano' as ProjectSize,
  },

  /**
   * Early Access (Fase 9.6, docs/19 §9.6 y docs/07 §4.1): lanzar a medio hacer
   * para financiarte y recibir feedback, con la comunidad mirando el reloj.
   * Solo juegos AUTO-publicados (el publisher controla su lanzamiento): es la
   * herramienta de autofinanciación del estudio independiente.
   */
  earlyAccess: {
    /** Era en que se inventa (docs/02 §5: tiendas digitales; decidido E5). */
    appearsInEra: 'E5' as EraId,
    /** Fase mínima de desarrollo para abrir el acceso anticipado (Pulido). */
    minPhase: 3,
    /** Precio EA = precio final × este factor (compras una promesa). */
    priceFactor: 0.7,
    /**
     * Escala de la demanda EA frente a un lanzamiento normal: un juego a
     * medias, sin reseña, solo atrae a los curiosos.
     */
    salesScale: 0.2,
    /** El hype empuja a los curiosos: demanda EA × (1 + coef × hype). */
    hypeCoef: 0.5,
    /** La novedad se agota sin 1.0: decaimiento semanal de las ventas EA. */
    weeklyDecay: 0.97,
    /**
     * Feedback de la comunidad, por semana en EA: QA extra (misma unidad que
     * qaInvested) y deuda de bugs que se corrige. El juego llega mejor a la
     * 1.0 que su gemelo desarrollado a puerta cerrada.
     */
    feedbackQaPerWeek: 0.35,
    feedbackBugFixPerWeek: 0.3,
    /** Semanas de gracia antes de que la comunidad empiece a quemarse. */
    patienceWeeks: 52,
    /**
     * Quema progresiva pasada la paciencia: cada semana extra resta
     * sentimiento y reputación, con una rampa que crece hasta rampMaxFactor
     * a lo largo de rampWeeks (demorarse un poco escuece; enquistarse arde).
     */
    burn: {
      sentimentPerWeek: 0.8,
      repPerWeek: { comunidad: 0.3, hardcore: 0.18 },
      rampWeeks: 26,
      rampMaxFactor: 2,
      /** Cada cuántas semanas de quema se repite el aviso en el historial. */
      logEveryWeeks: 8,
    },
    /**
     * 1.0: los compradores de EA ya tienen el juego. El pico day-one se
     * multiplica por (1 − penalización), con penalización = min(cap,
     * unidadesEA × cannibalFrac / unidadesEsperadasSemana0). Congelado al
     * lanzar, como overHypeTailPenalty (docs/17 E2).
     */
    spike: { cannibalFrac: 0.6, maxPenalty: 0.6 },
    /**
     * Traición: si la 1.0 sale por debajo de este listón de reseña, quienes
     * compraron la promesa se sienten estafados — golpe extra a comunidad y
     * hardcore, escalado por cuántos compraron (la penalización de pico
     * normalizada). Encima del castigo normal de una reseña floja.
     */
    betrayal: {
      reviewBar: 60,
      repHit: { comunidad: -5, hardcore: -4 },
      sentimentHit: -8,
    },
  },

  /**
   * Servicios en vivo / GaaS (Fase 9.7, docs/19 §9.7): operar un juego YA
   * lanzado como servicio. Ingreso continuo jugoso PERO con obligación real:
   * exige equipo asignado en exclusiva (el "plato girando") y dinero de
   * servidores, y si lo descuidas la base de jugadores se desangra y la
   * comunidad se enfría (o estalla, si además lo exprimes — docs/07 §5).
   * Determinista: el tick del servicio no usa PRNG (solo el sabor de la
   * crisis, si estalla, tira de él). Lógica en core/systems/liveService.ts.
   */
  liveOps: {
    /**
     * Nodo de I+D que desbloquea operar servicios (docs/02 §3): el nodo
     * "Juegos como servicio" de E6, que ya exige tecnologiaOnline. La era la
     * pone el nodo — GaaS llega con los servicios (docs/02 §5).
     */
    requiresResearch: 'serviciosOnline',
    /** Tamaño mínimo del juego: un pequeño no sostiene un servicio. */
    minSize: 'mediano' as ProjectSize,
    /**
     * Jugadores iniciales al convertir: totalUnits × seedShare × (reseña/100).
     * Un juego querido arranca con más parroquia dispuesta a quedarse.
     */
    seedShare: 0.25,
    /** Fracción de las ventas semanales (cajas) que se une al servicio. */
    joinRate: 0.5,
    /** Churn semanal base: hasta el servicio perfecto pierde gente despacio. */
    baseChurn: 0.02,
    /** Churn EXTRA a cuidado cero (careRatio 0): descuidar desangra rápido. */
    neglectChurn: 0.08,
    /**
     * Crecimiento por contenido nuevo: careRatio 1 × (reseña/100) × esto.
     * Con equipo completo y un buen juego casi compensa el churn base: el
     * servicio bien llevado se sostiene mientras el juego siga vendiendo.
     */
    contentGrowth: 0.025,
    /** Plantilla requerida por tamaño para careRatio 1 (ocupada en exclusiva).
     * Calibrada para que un Estudio grande (aforo 25) pueda sostener UN
     * servicio muy grande dedicándole un tercio de la oficina — apretado a
     * propósito: el plato girando compite con el pipeline de verdad. */
    requiredStaffBySize: {
      pequeno: 2,
      mediano: 3,
      grande: 5,
      muyGrande: 8,
      // Bajó de 16 a 11 en 10.2-B, en coherencia con el AAA aligerado
      // (docs/20 W2-bis): la dotación del plato sigue la escala del juego.
      aaa: 11,
    } satisfies Record<ProjectSize, number>,
    /** ARPU: 💰 por jugador y semana, antes de pase/agresividad. */
    arpuPerPlayerWeek: 0.5,
    /** El pase de batalla y la tienda agresiva multiplican el ARPU (codicia). */
    battlePassArpuBoost: 0.5,
    aggressivenessArpuCoef: 0.8,
    /** Upkeep de servidores: fijo por tamaño + variable por jugador. */
    upkeepBaseBySize: {
      pequeno: 200,
      mediano: 400,
      grande: 1_500,
      muyGrande: 4_000,
      aaa: 9_000,
    } satisfies Record<ProjectSize, number>,
    upkeepPerPlayer: 0.1,
    /**
     * Convertir un juego vendido en servicio con pase/tienda es media palanca
     * de codicia: aplica las levers de monetización (battlePass /
     * mtxPerAggression) y su deuda a este factor de la escala del lanzamiento.
     */
    convertLeverFactor: 0.5,
    /** Agresividad desde la que el servicio cuenta como "exprimido". */
    squeezeBar: 0.5,
    /**
     * Goteo semanal de deuda de reputación (mtxAgresivas) del servicio
     * exprimido, escalado por su tamaño de parroquia (players/refPlayers,
     * tope 1): exprimir a mucha gente acumula más pólvora (docs/06 §5).
     */
    squeezeDebtPerWeek: 0.15,
    /** Jugadores de referencia para escalar deuda y golpes de cierre. */
    refPlayers: 20_000,
    /**
     * Descuido (docs/19 §9.7): careRatio bajo la barra acumula semanas.
     * Aviso a las noticeWeeks (y recordatorio periódico), sentimiento que se
     * enfría cada semana… y si ADEMÁS el servicio está exprimido, a las
     * crashWeeks estalla una crisis con review bombing (docs/07 §5), una vez
     * por racha de descuido.
     */
    neglect: {
      bar: 0.6,
      noticeWeeks: 4,
      logEveryWeeks: 8,
      sentimentPerWeek: 0.5,
      crashWeeks: 8,
      crashSeverity: 0.7,
    },
    /**
     * Cierre del servicio (sunset): golpe a comunidad/hardcore y sentimiento
     * proporcional a los jugadores que dejas tirados (× players/refPlayers,
     * con tope 1). Cerrar un servicio moribundo apenas duele.
     */
    sunset: {
      repHitMax: { comunidad: 3, hardcore: 2 },
      sentimentHitMax: 6,
    },
    /** Bajo este nº de jugadores el servicio se apaga solo, sin pena. */
    minPlayers: 500,
  },

  /** factorMonetización v1 [DECIDIDO, docs/12 §6] y sus consecuencias. */
  monetization: {
    /** Multiplicador de los ingresos por venta: unidades × precio × factor. */
    salesFactor: {
      premium: 1,
      'premium+dlc': 1.25,
      'premium+mtx': 1,
      f2p: 0.3,
    } satisfies Record<MonetizationModel, number>,
    /**
     * Ingresos MTX semanales = unidades × precio × coef × agresividad.
     * Subidos en 9.1 (dilema con dientes): las palancas de codicia rinden
     * MÁS dinero, para que ser querido cueste un sacrificio real.
     */
    mtxCoef: {
      premium: 0,
      'premium+dlc': 0,
      'premium+mtx': 0.85,
      f2p: 1.1,
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
    /**
     * La reputación DECAE sola (Fase 9.1, docs/19 §9.1): cada semana el exceso
     * sobre el objetivo se erosiona (el público olvida a quien no lanza).
     * Por debajo del objetivo NO hay cura gratis: recuperarse exige actuar.
     */
    decay: { target: 50, ratePerWeek: 0.006 },
    /** Deltas por reseña al lanzar: (reseña_seg − neutral) / divisor, con topes.
     * neutral 65 desde 9.1: el público exigente ya no premia notas mediocres. */
    review: { neutral: 65, divisor: 8, maxGain: 3, maxLoss: 4 },
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
     * de 96 semanas (~1,85 años).
     *
     * El AAA bajó de 40 a 32 semanas por fase en 10.2-B (docs/20 W2-bis): con
     * 120 semanas y 40 personas era una TRAMPA (alcance 0,77 → reseña 39) y su
     * ejército permanente hundía E6 a un margen operativo de −53k/sem. Sigue
     * siendo con diferencia el proyecto más largo (96 vs 72 del Muy grande).
     */
    phaseWeeksBySize: {
      pequeno: 2,
      mediano: 6,
      grande: 14,
      muyGrande: 24,
      aaa: 32,
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
     * AAA queda bloqueado hasta Corporación (etapa 5) — su crewRatio espera su
     * plantilla: intentarlo con menos lo deja a medio cocer. La UI atenúa los
     * tamaños bloqueados con su requisito; el núcleo lo valida en startProject
     * (sizeBlockReason). El coste base va en economy.sizeBaseCost.
     *
     * El AAA bajó de 40 a 24 personas en 10.2-B (docs/20 W2-bis): un ejército
     * permanente de 40 corría en seco entre lanzamientos AAA (que son lumpy: 3
     * en toda E6) y ese coste fijo era el origen real del margen negativo de
     * E6 — no el overhead de etapa. Sigue exigiendo una organización grande
     * (24 > 15 del Muy grande) y solo cabe en el aforo de la Corporación.
     */
    sizeGate: {
      pequeno: { minStaff: 1, minStage: 1 },
      mediano: { minStaff: 3, minStage: 2 },
      grande: { minStaff: 8, minStage: 3 },
      muyGrande: { minStaff: 15, minStage: 4 },
      aaa: { minStaff: 24, minStage: 5 },
    } satisfies Record<ProjectSize, { minStaff: number; minStage: ScaleStage }>,
    /** Deuda de bugs acumulada por semana de Concepto/Producción (docs/03 factor D). */
    baseBugsPerWeek: 0.02,
    /**
     * Escala global de la deuda de bugs de las FEATURES (9.3): elegir con
     * criterio ya ahorra los bugs de los misfits, así que cada feature cuesta
     * algo más — el sobre del riesgo se reparte y el envolvente de dificultad
     * de 9.1 (nadie imprime 85+ en E2) se conserva. Calibrado con los bots.
     */
    featureBugScale: 1.3,
    /** Reducción de deuda de bugs por semana con el 100 % del esfuerzo en QA. */
    qaReductionPerWeek: 0.15,
  },

  quality: {
    /** Pesos de composición v1: wF, wB, wC, wD [DECIDIDO, docs/12 §3]. */
    weights: { fit: 0.3, balance: 0.25, features: 0.2, polish: 0.25 },
    /** Ponderación de las partes del Fit (docs/03 factor A). */
    fitWeights: { themeGenre: 0.5, genrePlatform: 0.25, audience: 0.25 },
    /**
     * objetivoAlcance(tamaño): suma de valorCalidad EFECTIVO de features para
     * featureScore = 1 (docs/03 factor C). Desde 9.3 el valor efectivo pondera
     * por encaje (featureAffinity): las que encajan valen entero, las neutras
     * la mitad — llenar el objetivo exige criterio, y llenarlo a base de
     * relleno neutro cuesta el doble de features (y sus bugs).
     */
    featureScopeTarget: {
      pequeno: 4,
      mediano: 8,
      grande: 13,
      muyGrande: 16,
      // El AAA bajó de 20 a 18 en 10.2-B (docs/20 W2-bis), en coherencia con su
      // plantilla y calendario más cortos: sigue siendo el catálogo más
      // ambicioso, pero llenarlo deja de exigir un catálogo imposible.
      aaa: 18,
    } satisfies Record<ProjectSize, number>,
    /**
     * Afinidad feature×género (Fase 9.3, docs/19 §9.3): multiplicador del
     * qualityValue según el encaje con el género del proyecto. Una feature que
     * NO encaja resta un poco del numerador y además multiplica su deuda de
     * bugs al elegirla: meterla hace daño neto SIEMPRE — fin del "apila todos
     * los features buenos".
     */
    featureAffinity: {
      encajaMult: 1,
      neutroMult: 0.5,
      noEncajaMult: -0.25,
      /** La tecnología forzada donde no pega sale cara: bugs extra al elegirla. */
      misfitBugMult: 1.75,
    },
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
     * techoQ(era, tamaño): envolvente de Q por era (docs/03 §3). Desde la
     * Fase 9.1 es solo UNO de los techos parciales (el techo real es el
     * mínimo con madurez/talento/motor, ver `ceiling`); desde 9.2 el término
     * tecnológico es el MOTOR del proyecto (ceiling.engine).
     *
     * Desde 10.2-B (docs/20 W2-bis) el AAA va UN PUNTO por encima del Muy
     * grande allá donde hay techo libre (E4–E6): aligerarlo no puede dejarlo
     * solapado con el escalón inferior — tiene que ser una cima también en
     * calidad alcanzable, no solo en dinero. En E7 ambos llegan a 100 (no hay
     * más techo que dar) y el AAA se separa por demanda, coste y premios.
     */
    capByEraSize: {
      E1: { pequeno: 85, mediano: 85, grande: 85, muyGrande: 85, aaa: 85 },
      E2: { pequeno: 88, mediano: 88, grande: 88, muyGrande: 88, aaa: 88 },
      E3: { pequeno: 88, mediano: 91, grande: 91, muyGrande: 91, aaa: 91 },
      E4: { pequeno: 90, mediano: 93, grande: 94, muyGrande: 94, aaa: 95 },
      E5: { pequeno: 92, mediano: 95, grande: 96, muyGrande: 96, aaa: 97 },
      E6: { pequeno: 93, mediano: 96, grande: 98, muyGrande: 98, aaa: 99 },
      E7: { pequeno: 94, mediano: 97, grande: 100, muyGrande: 100, aaa: 100 },
    } satisfies Record<EraId, Record<ProjectSize, number>>,

    /**
     * El techo dinámico (Fase 9.1, docs/19 §9.1 y docs/03 §3):
     *   techoQ = min(capEra, capMadurez, capTalento, capTech)
     * Siempre hay UN término que manda y el desglose lo nombra (Pilar 2).
     */
    ceiling: {
      /**
       * capMadurez = min + (max − min) · exp/(exp + halfway). La experiencia
       * se gana lanzando (sizeExp por juego) y creciendo (stageExp por etapa):
       * en el garaje el techo es ~45–52 juegues como juegues, y sube DESPACIO.
       */
      maturity: {
        min: 45,
        max: 100,
        sizeExp: {
          pequeno: 1.5,
          mediano: 2.5,
          grande: 5,
          muyGrande: 8,
          aaa: 12,
        } satisfies Record<ProjectSize, number>,
        /** La escala pesa fuerte: la cima de la madurez exige crecer, no solo
         * encadenar juegos pequeños (docs/02 §4 — cada etapa cambia el juego). */
        stageExp: { 1: 0, 2: 3, 3: 8, 4: 18, 5: 30 } satisfies Record<ScaleStage, number>,
        halfway: 55,
      },
      /**
       * capTalento = min + span · (mejor skill de la especialidad CLAVE del
       * género entre los asignados)/100. El mejor individuo, no la media: una
       * obra maestra (85+) exige una ESTRELLA (skill ≥ 80) en el rol clave.
       */
      talent: { min: 45, span: 50 },
      /**
       * capMotor (Fase 9.2, docs/19 §9.2): el MOTOR sustituye a la profundidad
       * de I+D como término tecnológico del techo. capTech = min + span ·
       * adecuación, con adecuación = clamp01(nivelMotor / demanda) y
       *   demanda = demandByEra(era) × sizeFactor(tamaño)
       *           × (genreDepBase + genreDepSpan · idealTech(género)).
       * Un AAA/shooter 3D sobre motor obsoleto TOPA BAJO; un juego pequeño y
       * narrativo depende mucho menos del motor. El ENVEJECIMIENTO es
       * emergente: el nivel del motor es fijo y la demanda de la era sube —
       * la brecha creciente es el motor quedándose viejo, sin mecánica extra.
       * Demanda 0 (E1) = sin expectativa: adecuación completa (código
       * artesanal, como en 1980).
       */
      engine: {
        min: 55,
        span: 45,
        demandByEra: {
          E1: 0,
          E2: 3,
          E3: 6,
          E4: 10,
          E5: 14,
          E6: 20,
          E7: 24,
        } satisfies Record<EraId, number>,
        /** El tamaño escala la exigencia: el AAA pide motor puntero. */
        sizeFactor: {
          pequeno: 0.55,
          mediano: 0.75,
          grande: 1,
          muyGrande: 1.15,
          aaa: 1.3,
        } satisfies Record<ProjectSize, number>,
        /** Dependencia del género: × (base + span·idealTech). El RPG narrativo
         * (idealTech 0.35) exige ~0.9; el shooter (0.6), ~1.06. */
        genreDepBase: 0.7,
        genreDepSpan: 0.6,
      },
    },

    /**
     * Encaje de alcance (ambición vs capacidad, docs/19 §9.1): no es un techo
     * sino un multiplicador de Q. poderEquipo = Σ asignados skill ponderada
     * por género (cuerpos Y talento); si no llena el objetivo del tamaño, la
     * calidad se hunde: alcanceFactor = max(suelo, alcance01^exponente).
     */
    scope: {
      /**
       * El AAA bajó de 26 a 15 en 10.2-B (docs/20 W2-bis): con 26 ni una
       * Corporación de 40 personas llenaba su alcance (0,77 medido en EXP2) y
       * la reseña se hundía a 39 — era un castigo, no una cima. Con 12, una
       * Corporación recién estrenada de 24 personas (su plantilla mínima
       * nueva) LLENA el alcance en cuanto tiene equipo decente, y sigue
       * pidiendo bastante más músculo que el Muy grande (9,5). El escalón
       * frente al Muy grande lo sostienen la plantilla (24 vs 15), el
       * calendario (96 vs 72 sem), el coste base (800k vs 460k) y la exigencia
       * de motor (sizeFactor 1,3 vs 1,15), no un alcance inalcanzable.
       */
      powerTarget: {
        pequeno: 0.5,
        mediano: 1.8,
        grande: 5,
        muyGrande: 9.5,
        aaa: 12,
      } satisfies Record<ProjectSize, number>,
      floor: 0.4,
      exponent: 1.25,
    },
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
    /** Umbrales de tono del techo dinámico (9.1): sobre el techoQ aplicado. */
    ceilingGoodThreshold: 85,
    ceilingOkThreshold: 65,
    /** Umbrales de tono del encaje de alcance (9.1): sobre alcance01. */
    scopeGoodThreshold: 0.95,
    scopeOkThreshold: 0.75,
    /** Umbrales de tono del listón de época (9.1): sobre Q − listón. */
    eraBarGoodDelta: 5,
    eraBarOkDelta: -5,
    /** Desde estos puntos de fatiga la línea pasa de ~ a ✘ (9.1). */
    fatigueBadPoints: 8,
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

    /**
     * Subequipos: asignación en bloque (docs/18 V5). Pura comodidad de UI, así
     * que aquí no hay nada que afecte a la simulación. Llegan con el Estudio
     * (etapa 3), que es cuando hay varios proyectos en paralelo y gente que
     * repartir; antes serían ruido sobre una plantilla de 4.
     */
    squads: {
      minStage: 3 as ScaleStage,
      /** Tope sano para la UI; con 100 empleados nadie gestiona más grupos. */
      maxSquads: 12,
    },

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
       *
       * GATE MIXTO desde 10.2-B (docs/20 W3): capital + plantilla + TRAYECTORIA.
       * El Experimento 1 de la 10.2-A demostró que **el capital no regula las
       * etapas 4–5** (con préstamo agresivo o sin él, la etapa 4 cae en E3 s680
       * y la 5 en E5 s1512): cuando los ingresos crecen exponencialmente, una
       * cifra de caja es un peaje, no un ritmo. Así que el regulador principal
       * pasa a ser la CARRERA — juegos lanzados y reputación conseguida — y el
       * capital solo sube de forma INTERMEDIA (~×2,5–3, no ×8) para que no
       * amplíes con la caja de un único juegazo. Nada de muro de capital
       * agresivo temprano: EXP1 retiró la evidencia de que el ritmo temprano
       * estuviese roto y solo habría añadido tedio — y los bots lo confirmaron
       * de la peor manera. Con la etapa 3 a 800k (×4) el optimizador quedaba
       * ENCERRADO en el aforo de 4 personas —sin caja para financiar siquiera
       * un mediano— y quebraba en E2 s362: el techo de ingresos de una etapa
       * tiene que poder pagar la siguiente o no es un ritmo, es una jaula.
       *
       * - `gamesReleased`: lanzamientos acumulados. Evita el "dos aciertos →
       *   megacorporación": crecer exige haber HECHO carrera. Es el regulador
       *   fino, el que marca el ritmo.
       * - `topReputation`: la CIMA histórica de la mejor reputación de segmento
       *   (`stats.peakReputation`), no la de hoy. Se pide el mejor segmento y no
       *   el agregado (docs/06 §1: la reputación es un vector) porque para
       *   crecer basta con haber sido bueno para ALGUIEN; y se pide la cima y no
       *   el estado actual porque con el estado actual la fábrica cínica —cuya
       *   codicia hunde el vector justo cuando junta el capital— quedaba
       *   encerrada en la etapa 3 para siempre (bots de 10.2-B), rompiendo "las
       *   3 filosofías siguen viables". Es un gate de haber tenido público
       *   alguna vez, no de tenerlo contento ahora.
       */
      requirementsByStage: {
        2: { capital: 25_000, staff: 0, gamesReleased: 3, topReputation: 0 },
        3: { capital: 500_000, staff: 4, gamesReleased: 8, topReputation: 55 },
        4: { capital: 5_000_000, staff: 8, gamesReleased: 18, topReputation: 60 },
        5: { capital: 25_000_000, staff: 20, gamesReleased: 32, topReputation: 65 },
      } satisfies Record<
        Exclude<ScaleStage, 1>,
        { capital: number; staff: number; gamesReleased: number; topReputation: number }
      >,
      /**
       * El desembolso de la ampliación (la mudanza/obra; docs/18 V4-c). Ratio
       * limpio desde 10.2-B: ampliar cuesta el 50 % del requisito de capital.
       */
      upgradeCostByStage: {
        2: 12_000,
        3: 250_000,
        4: 2_500_000,
        5: 12_500_000,
      } satisfies Record<Exclude<ScaleStage, 1>, number>,
      staffCapByStage: { 1: 1, 2: 4, 3: 10, 4: 25, 5: 100 } satisfies Record<ScaleStage, number>,
      /** Proyectos en paralelo permitidos por etapa (docs/02 §4). */
      projectCapByStage: { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 } satisfies Record<ScaleStage, number>,
      /** Tamaño del pool de contratación por etapa (más escala, más candidatos). */
      poolSizeByStage: { 1: 3, 2: 3, 3: 4, 4: 6, 5: 8 } satisfies Record<ScaleStage, number>,
    },
  },

  /**
   * Motores propios (Fase 9.2, docs/19 §9.2): construir cuesta 💰 + 💡 + N
   * semanas de calendario (una obra a la vez, pagada por adelantado, avanzada
   * por el tick). Mejorar un motor existente cuesta la FRACCIÓN upgradeFactor
   * de construir de cero: ese es el sumidero recurrente — cada era toca pasar
   * por caja. Reutilizar el motor entre juegos amortiza la inversión. Qué
   * generación puedes construir lo gatean los nodos de I+D (generationGate) y
   * la propia era (nunca por delante de su número).
   */
  engines: {
    /** Nivel tecnológico base por generación (las capacidades suman encima).
     * Calibrado sobre demandByEra: un motor de la gen N con sus capacidades
     * cubre de sobra su era y envejece en las dos siguientes. */
    baseLevelByGeneration: {
      1: 2,
      2: 4,
      3: 7,
      4: 11,
      5: 15,
      6: 21,
      7: 26,
    } satisfies Record<number, number>,
    /** Coste 💰 de construir de cero, por generación. */
    moneyByGeneration: {
      1: 6_000,
      2: 15_000,
      3: 50_000,
      4: 150_000,
      5: 400_000,
      6: 1_200_000,
      7: 2_500_000,
    } satisfies Record<number, number>,
    /** Coste 💡 de construir de cero, por generación. */
    pointsByGeneration: {
      1: 8,
      2: 14,
      3: 25,
      4: 40,
      5: 60,
      6: 90,
      7: 120,
    } satisfies Record<number, number>,
    /** Semanas de obra, por generación. */
    weeksByGeneration: {
      1: 6,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 26,
      7: 32,
    } satisfies Record<number, number>,
    /** Mejorar un motor existente (subir generación / añadir capacidades)
     * cuesta esta fracción de la obra nueva: amortizar tiene premio. */
    upgradeFactor: 0.6,
    /**
     * Generación máxima construible por nodo de I+D (docs/02 §3): sin
     * arquitectura investigada solo sale la gen 1 (un motorcito de garaje).
     * La era también acota: nunca se construye por delante de su número.
     */
    generationGate: {
      base: 1,
      motorPropio1: 3,
      motorPropio2: 5,
      motorPropio3: 7,
    },
    /**
     * Herramientas: el motor hace cundir al equipo del proyecto que lo usa
     * (sustituye al viejo devOutput de los nodos motorPropio*; docs/02 §6.1:
     * NO acorta el calendario — mejora la ejecución en el mismo plazo).
     */
    devOutputByGeneration: {
      1: 0.05,
      2: 0.08,
      3: 0.1,
      4: 0.12,
      5: 0.15,
      6: 0.18,
      7: 0.2,
    } satisfies Record<number, number>,
    /** Umbrales del semáforo de adecuación al concebir (sobre adecuación 0..1). */
    adequacyMeter: { verde: 0.85, ambar: 0.55 },
  },

  /** Investigación (docs/02 §3 y docs/12 §6): puntos 💡 y su goteo. */
  research: {
    /** ~1 💡 por persona·semana en I+D [DECIDIDO, docs/12 §6]. */
    pointsPerPersonWeek: 1,
    /**
     * 💡 al lanzar un juego, por tamaño ("se acumulan al desarrollar juegos").
     *
     * NO se tocó en 10.3 a propósito (docs/20 W6b): subirlo era la palanca
     * obvia contra el retraso de 💡 del indie, pero riega TODA la partida y el
     * early game es justo lo que fija el CA 9.1(a) ("nadie imprime 80+ en E2").
     * Con pequeño 2→3 y mediano 4→5, el equilibrado se compraba antes su
     * primer motor y sacaba un 13,8 % de notas 80+ antes de E3, rompiendo el
     * CA. La compensación fue por el otro lado (coste de los nodos E5-E7).
     */
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

  /** Premios anuales (docs/06 §7): nominación, competición y recompensas. */
  awards: {
    /** La ceremonia se celebra cada fin de año (52 ticks = 1 año, docs/02 §1). */
    intervalWeeks: 52,
    /**
     * Umbrales de NOMINACIÓN (docs/18 V7): son los que dan identidad a cada
     * categoría (la Innovación pide riesgo, la Técnica pide pulido...). Si tu
     * mejor juego del año no los pasa, ni te nominan. Pasarlos NO es ganar:
     * después compites por el puesto contra el listón (`competition`).
     */
    thresholds: {
      goty: { minReview: 78 },
      innovacion: { minInnovation: 1.03, minReview: 62 },
      tecnica: { minPolish: 0.92, minReview: 62 },
      diseno: { minFit: 0.85, minReview: 68 },
      pueblo: { minCasualReview: 74 },
    },
    /**
     * Premios COMPETITIVOS (docs/18 V7): compites por un puesto contra un
     * listón de industria que sube con la era + nominados ficticios.
     *
     * Por qué solo es realista ganar en E6–E7: tu reseña NO crece con las eras
     * (desde 9.1 el listón `market.reviews.eraBar` 61→88 persigue al techo
     * dinámico de `quality.ceiling`, así que la nota alcanzable ronda 70–90 en
     * todas las eras) y la reputación satura pronto. Lo único que crece de
     * verdad es la ESCALA: por eso el listón sube ~6.5 puntos de E1 a E7 y el
     * bonus de tamaño vale hasta +12. Un garaje con un juego pequeño excelente
     * entra en el ranking; hace falta una corporación con un AAA excelente
     * para ganar el gordo.
     */
    competition: {
      /**
       * Listón de industria por era: puntuación típica de un nominado ficticio.
       *
       * Calibrado contra el TECHO real de cada era, que lo fijan los gates de
       * tamaño de la 8.8 (`development.sizeGate`): con reseña excelente (~85) y
       * prestigio alto (~+6), el máximo alcanzable es ~94 en E1 (solo llegas a
       * Mediano), ~97 en E2–E3 (Grande), ~100 en E4–E5 (Muy grande) y ~103 en
       * E6–E7 (AAA). El listón va justo por encima del techo de su era hasta
       * E5 y justo por debajo en E6–E7: por eso ganar solo es realista al
       * final, y solo con un juego excelente. No basta con ser grande (la
       * fábrica cínica ni se nomina) ni con ser querido (al indie le falta
       * escala): hace falta haber navegado el dilema.
       */
      barByEra: { E1: 96, E2: 99, E3: 99.5, E4: 101.5, E5: 102, E6: 103, E7: 103.5 } satisfies Record<
        EraId,
        number
      >,
      /** Nominados ficticios por categoría (tú entras como uno más). */
      nomineeCount: 4,
      /**
       * Dispersión de los nominados alrededor del listón (± puntos). No puede
       * acercarse al escalón de `sizeBonus`: si el ruido pesa como la escala,
       * el puesto lo decide el azar y no tu decisión (docs/00: mayormente
       * determinista). Con 4 nominados, el mejor sale ~+1.5 sobre el listón.
       */
      nomineeSpread: 2.5,
      /** Prestigio: hasta +N puntos por reputación (docs/18 V7: "calidad + reputación"). */
      prestigeWeight: 6,
      /** Mezcla del prestigio: la gala la deciden crítica y prensa. */
      prestigeMix: { critica: 0.6, prensa: 0.4 },
      /**
       * Escala: puntos por tamaño del juego, × el `scaleWeight` de la categoría.
       * El salto al AAA es deliberadamente grande (+6 sobre Muy grande): es lo
       * único que separa el techo de E6–E7 del de E4–E5, y con escalones de +3
       * la dispersión de los nominados se lo comía — un AAA de Corporación
       * ganaba o perdía por azar, y un Muy grande de E4 ganaba el GOTY.
       */
      sizeBonus: { pequeno: 0, mediano: 2, grande: 5, muyGrande: 8, aaa: 14 } satisfies Record<
        ProjectSize,
        number
      >,
    },
    /** Recompensas por premio ganado (docs/06 §7). */
    rewards: {
      /** Reputación: sobre todo Crítica/Prensa; el talento también toma nota. */
      repDeltas: { critica: 2.5, prensa: 2, empleador: 1 },
      /** Hype pendiente para el próximo proyecto, por premio (con tope). */
      hypePerAward: 0.08,
      hypeCap: 0.25,
      /**
       * Ser nominado sin ganar también cuenta (docs/18 V7): en las eras
       * tempranas ganar no es realista, así que la gala no puede ser estéril.
       * Por categoría nominada y no ganada.
       */
      nominationRepDeltas: { critica: 0.5, prensa: 0.5 },
    },
  },

  /**
   * Estudios rivales (Fase 9.5, docs/19 §9.5 y docs/04 §9): la industria
   * simulada. Sus perfiles viven en data/rivals.ts; aquí, todo su
   * comportamiento numérico. Calibrado con los bots (docs/08 §8) para crear
   * presión real (saturación ajena, ventanas, fichajes) sin volverse imposible.
   */
  rivals: {
    /** Fuerza inicial de cada tier, y baseline al que la fuerza revierte. */
    baseStrengthByTier: { indie: 30, medio: 55, gigante: 80 } satisfies Record<RivalTier, number>,
    /** Reversión semanal de la fuerza hacia el baseline del tier (fracción). */
    strengthRevertRate: 0.01,
    /**
     * Evolución por resultados (docs/19 §9.5 "crecen o decaen"): un hit suma
     * fuerza, un flop la resta. Los umbrales son POR TIER porque el listón de
     * cada casa es el suyo: un 70 es fiesta en un garaje y drama en un gigante.
     */
    strengthHitGain: 10,
    strengthFlopLoss: 10,
    hitReviewByTier: { indie: 76, medio: 80, gigante: 84 } satisfies Record<RivalTier, number>,
    flopReviewByTier: { indie: 54, medio: 60, gigante: 68 } satisfies Record<RivalTier, number>,
    /**
     * Reseña de un lanzamiento rival: uniforme en el rango de su tier,
     * desplazada por su fuerza (±span·(fuerza−baseline)/50) y su perfil.
     * Rangos anchos a propósito: los gigantes también sacan fiascos (y de un
     * garaje sale a veces la joya del año). El tope del indie queda bajo la
     * barra de fiebre: mover el mercado es cosa de los grandes.
     */
    reviewRangeByTier: {
      indie: [48, 82],
      medio: [56, 86],
      gigante: [60, 92],
    } satisfies Record<RivalTier, [number, number]>,
    strengthReviewSpan: 10,
    reviewBiasByProfile: { fabrica: -2, prestigio: 3, oportunista: 0 } satisfies Record<
      RivalProfile,
      number
    >,
    /**
     * Tamaño de sus juegos por tier e ÍNDICE de era (0..6). Calibrado contra
     * awards.competition.barByEra (docs/18 V7): los establecidos lanzan un
     * tamaño por encima de tu techo de era hasta E5 (por eso el listón de la
     * gala va delante de ti) y en E6–E7 tu AAA ya los alcanza.
     */
    sizeByTierEra: {
      indie: ['pequeno', 'pequeno', 'mediano', 'mediano', 'mediano', 'mediano', 'mediano'],
      medio: ['mediano', 'grande', 'muyGrande', 'muyGrande', 'muyGrande', 'muyGrande', 'muyGrande'],
      gigante: ['grande', 'grande', 'muyGrande', 'aaa', 'aaa', 'aaa', 'aaa'],
    } satisfies Record<RivalTier, readonly ProjectSize[]>,
    /** Semanas entre su último lanzamiento y el SIGUIENTE anuncio ([min, max]). */
    announceGapByTier: {
      indie: [14, 26],
      medio: [22, 40],
      gigante: [30, 56],
    } satisfies Record<RivalTier, [number, number]>,
    /** Antelación del anuncio: semanas entre anunciar y lanzar ([min, max]). */
    announceLeadWeeks: [10, 24] as [number, number],
    /** Retraso del primer anuncio al activarse un estudio ([min, max], escalona la entrada). */
    initialAnnounceDelay: [2, 30] as [number, number],
    /**
     * Probabilidad de que un HIT rival (reseña ≥ market.fevers.hitFeverBar)
     * encienda una fiebre (docs/04 §2.1: los rivales disparan la "fiebre del
     * oro" desde 9.5). Misma barra que el jugador, moneda propia.
     */
    feverChance: 0.5,
    /** Oportunista: probabilidad de perseguir una fiebre activa al anunciar. */
    chaseFeverChance: 0.75,
    /** Fábrica: probabilidad de anunciar una secuela de su mejor juego reciente. */
    sequelChance: 0.55,
    /** Resto de perfiles: probabilidad de tirar de género de especialidad. */
    specialtyChance: 0.7,
    /**
     * Promoción / caída de tier (docs/19 §9.5 "evolucionan"): fuerza sostenida
     * fuera de banda durante `sustainWeeks`. Un indie hundido bajo `closeBar`
     * durante `closeWeeks` CIERRA el estudio.
     */
    tierShift: {
      /**
       * Barras calibradas contra la reversión (playtest con rivalsReport.ts):
       * con baseline medio 55 y ~1 lanzamiento/48 sem, promocionar exige una
       * racha de 2–3 hits seguidos (pasa un par de veces por partida); con
       * demoteBar pegada al baseline indie, TODOS los indies morían — el
       * colchón de 6 puntos deja el cierre para los hundidos de verdad.
       */
      promoteBar: 66,
      demoteBar: 24,
      sustainWeeks: 20,
      closeBar: 10,
      closeWeeks: 39,
    },
    /** Historial de lanzamientos retenido por rival (panel + gala). */
    maxGamesKept: 10,
    /**
     * Ventanas de lanzamiento disputadas (docs/19 §9.5): la campaña masiva de
     * un GIGANTE (solo ellos hacen hype de ese calibre) domina la conversación
     * durante ±radiusWeeks alrededor de su fecha. Lanzar un juego del MISMO
     * género dentro aplasta tu pico day-one (× 1 − crushPenalty, congelado al
     * lanzar como el overHypeTailPenalty); la cola no se toca — el boca a boca
     * sigue siendo tuyo. Siempre con aviso previo: el anuncio se ve en el
     * calendario de Industria semanas antes (decides con información).
     */
    window: {
      radiusWeeks: 3,
      crushPenalty: 0.45,
    },
    /**
     * Caza de talento (docs/19 §9.5 + docs/05 §7): los rivales tientan a tus
     * empleados con la LEALTAD hundida — el descontento es la puerta, no el
     * azar. Una oferta pendiente como mucho; se resuelve con contraoferta
     * (igualas su salario, para siempre) o dejándole ir (el rival se
     * fortalece). Las renuncias espontáneas también pueden acabar en un rival.
     */
    poach: {
      /** Lealtad por debajo de la cual un empleado es cazable. */
      loyaltyThreshold: 40,
      /** Probabilidad semanal de intento por empleado vulnerable. */
      chancePerVulnerable: 0.02,
      /**
       * La mala fama de Empleador atrae buitres: factor 1.5 − rep/100
       * (rep 0 → ×1.5 · rep 50 → ×1 · rep 100 → ×0.5). Cuidar al equipo
       * también protege por fuera (docs/05 §7).
       */
      employerRepBase: 1.5,
      /** La oferta del rival: multiplicador sobre el salario actual. */
      offerSalaryMult: 1.5,
      /** Contraoferta: la lealtad y la moral respiran al sentirse valorado. */
      counterLoyaltyBoost: 20,
      counterMoraleBoost: 8,
      /** Fuerza que gana el rival al llevarse a alguien (estrella: skill ≥ 80). */
      strengthGain: 4,
      strengthGainStar: 10,
      /** Umbral de skill en su especialidad para contar como estrella (docs/05 §2). */
      starSkill: 80,
      /** Golpe a Empleador cuando un rival te levanta a alguien. */
      employerRepHit: 2,
      /** Probabilidad de que una renuncia espontánea acabe fichando por un rival. */
      quitSignChance: 0.6,
    },
  },

  /**
   * Adquisiciones de estudios (Fase 9.7, docs/19 §9.7): comprar un rival vivo
   * (indie o medio; los gigantes no se venden) lo SACA de la competencia y lo
   * convierte en FILIAL autónoma: lanza juegos sola (ingreso pasivo, cobrado
   * como flujo) a cambio de un desembolso grande + overhead continuo. La
   * directiva por filial es la palanca macro del dilema (docs/02 §4): exprimir
   * rinde más hoy y hunde moral→talento→reseñas mañana. Precios deterministas
   * sin PRNG (patrón publisherOffersFor). Lógica en core/systems/subsidiaries.ts.
   */
  acquisitions: {
    /** Etapa de escala mínima para comprar estudios (docs/02 §4: macro-gestión). */
    minStage: 4 as ScaleStage,
    /** Tiers comprables: los gigantes no están en venta (no te compras la industria). */
    buyableTiers: ['indie', 'medio'] as readonly RivalTier[],
    /** Precio: base del tier × (strengthBase + fuerza/100 × strengthSpan). */
    priceByTier: { indie: 250_000, medio: 1_600_000 } as Partial<Record<RivalTier, number>>,
    priceStrengthBase: 0.6,
    priceStrengthSpan: 1.2,
    /**
     * En racha no venden: con la fuerza en zona de promoción (≥ la barra de
     * tierShift) el estudio huele su salto y rechaza la oferta. No compras
     * barata a la estrella emergente.
     */
    refuseAboveStrength: 66,
    /** Overhead semanal continuo de la filial (el sumidero permanente). */
    upkeepByTier: { indie: 2_500, medio: 9_000 } as Partial<Record<RivalTier, number>>,
    /** Semanas entre lanzamientos de la filial ([min, max], como los rivales). */
    releaseGapByTier: {
      indie: [16, 28],
      medio: [26, 44],
    } as Partial<Record<RivalTier, [number, number]>>,
    /**
     * Bote del lanzamiento: base por tamaño × calidad^exponente, con la
     * calidad normalizada sobre un SUELO de reseña — por debajo del suelo el
     * juego no genera nada (un flop no es ingreso pasivo). Se cobra como
     * FLUJO (payoutRate del bote pendiente cada semana, cola de ~1,5 años).
     * Calibrado con bots (9.7): sin el suelo, la filial exprimida hasta el
     * cascarón seguía imprimiendo dinero — justo el "gratis" que no puede ser.
     */
    bountyBySize: {
      pequeno: 90_000,
      mediano: 500_000,
      grande: 1_100_000,
      muyGrande: 1_500_000,
      aaa: 3_000_000,
    } satisfies Record<ProjectSize, number>,
    bountyReviewFloor: 45,
    bountyReviewSpan: 55,
    bountyExponent: 1.75,
    payoutRate: 0.06,
    /**
     * La reseña de la filial sigue a su TALENTO con un span mayor que el de
     * los rivales (strengthReviewSpan 10): la fuerza de un rival vive cerca
     * de su baseline, pero el talento de una filial puede hundirse hasta el
     * suelo o construirse hasta el techo — y sus juegos lo GRITAN.
     */
    talentReviewSpan: 22,
    /** Techo del talento: ni la mejor gestión fabrica genios infinitos. */
    talentCap: 85,
    /** Moral inicial de la filial y baseline al que revierte en autónomo. */
    initialMorale: 55,
    moraleBaseline: 55,
    moraleRevertRate: 0.02,
    /** El talento sigue a la moral: deriva semanal = (moral − 50) × esto
     * (moral 100 → +0,2/sem ≈ +10/año; moral 0 → −0,2/sem, más los éxodos). */
    talentDriftPerMoralePoint: 0.004,
    /** Suelo del talento (ni la peor gestión lo deja en 0 absoluto). */
    talentFloor: 5,
    /**
     * Directivas de gestión (docs/02 §4, la política macro por filial):
     * exprimir = más juegos y más caja HOY, moral/talento en caída, tu fama
     * de Empleador sangra y acumula deuda de crunch; invertir = cuesta un 30 %
     * más y construye moral/talento (y algo de Empleador). reviewBias refleja
     * el juego apresurado vs el mimado.
     */
    directives: {
      exprimir: {
        incomeMult: 1.7,
        gapFactor: 0.75,
        upkeepFactor: 1,
        moralePerWeek: -1.2,
        talentPerWeek: 0,
        reviewBias: -4,
        // El precio corporativo del exprimir es un GOTEO, no una condena: la
        // filial ya paga el grueso con moral → talento → flops. Con −0,04 y
        // deuda 0,1 sem a sem, tres filiales exprimidas a la vez hundían la
        // reputación a 0 y quebraban a la fábrica entera (bots, 9.7).
        employerRepPerWeek: -0.02,
        debtPerWeek: 0.05,
      },
      autonomo: {
        incomeMult: 1,
        gapFactor: 1,
        upkeepFactor: 1,
        moralePerWeek: 0,
        talentPerWeek: 0,
        reviewBias: 0,
        employerRepPerWeek: 0,
        debtPerWeek: 0,
      },
      invertir: {
        incomeMult: 1,
        gapFactor: 1,
        upkeepFactor: 1.5,
        moralePerWeek: 1,
        talentPerWeek: 0.15,
        reviewBias: 2,
        employerRepPerWeek: 0.02,
        debtPerWeek: 0,
      },
    },
    /**
     * Fuga de talento (docs/05 §7 a escala de filial): moral bajo la barra
     * durante `weeks` seguidas → golpe al talento, noticia, y el talento
     * vuelve a la industria (un rival vivo se refuerza). Se repite mientras
     * la moral siga hundida: exprimir sin freno vacía la casa.
     */
    exodus: { moraleBar: 25, weeks: 10, talentHit: 8, rivalStrengthGain: 4 },
    /**
     * Vender la filial: la fórmula de compra sobre su TALENTO actual × este
     * factor. Solo recuperas de sobra lo pagado si la hiciste crecer.
     */
    sellFactor: 0.55,
    /** Historial de lanzamientos retenido por filial (panel de Industria). */
    maxGamesKept: 8,
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
    /**
     * Dotación automática de servicios (Fase 9.7, docs/19 §9.7): cada semana
     * asigna empleados LIBRES (sin proyecto, sin I+D, sin otro servicio) a los
     * servicios en vivo por debajo de su plantilla requerida. La Corporación
     * mantiene los platos girando por política; retirar gente sigue siendo
     * decisión manual. maxPerWeek acota el trasvase (nada de teletransportes).
     */
    autoLiveOps: { maxPerWeek: 3 },
  },

  market: {
    /**
     * Popularidad de géneros y temas (docs/04 §2, reescrito en 9.4, docs/19
     * §9.4). Se acabaron las curvas lentas de años que premiaban acampar en el
     * género de moda: todo lo disponible en su era se sienta en la MISMA base
     * plana, y el ruido la hace vagar dentro de una banda estrecha ~42–58 %.
     * Ningún género/tema es permanentemente mejor que otro: "¿qué juego hago?"
     * lo decide el fit/tu especialización, no "qué acampa arriba". La ÚNICA
     * fuente de variación fuerte son las FIEBRES (ver `fevers`), que rompen la
     * banda unos meses y luego decaen.
     */
    popularity: {
      /** Base plana e igual para todo género/tema disponible (antes de ruido/fiebre). */
      base: 0.5,
      /**
       * Banda de la popularidad SIN fiebre: el ruido vaga aquí dentro y nada la
       * cruza salvo una fiebre. Es la garantía visible de "hacer buenos juegos
       * importa más que elegir la tendencia" (docs/19 §9.4).
       */
      bandMin: 0.42,
      bandMax: 0.58,
      /**
       * Amplitud del ruido semanal (± sobre la base). Con la persistencia forman
       * un AR(1): la desviación estacionaria vale ~amplitud/√(3·(1−persistencia²))
       * ≈ 0,037, así que la popularidad vaga de forma legible dentro de la banda
       * y el panel tiene vida sin que nada domine.
       */
      noiseAmplitude: 0.03,
      /** Persistencia de la desviación: cada tick la popularidad revierte hacia la base. */
      noisePersistence: 0.88,
    },

    /**
     * Fiebres de mercado (Fase 9.4, docs/19 §9.4): la ÚNICA fuente de variación
     * temporal fuerte. De vez en cuando un género o tema entra en fiebre —un
     * pico de popularidad que dura unos meses y luego decae— y el jugador puede
     * aprovecharla o no. Nacen de forma orgánica (PRNG con semilla, legible) o
     * las enciende un HIT (tuyo; y de un rival en 9.5) → "fiebre del oro".
     * Vigilar al calibrar (con bots): ni tan frecuentes que se vuelvan el nuevo
     * óptimo, ni tan raras que no se noten. Todo aquí, nada en la lógica.
     */
    fevers: {
      /** Probabilidad por semana de que nazca una fiebre orgánica (si hay hueco). */
      spawnChancePerWeek: 0.02,
      /** Fiebres orgánicas activas a la vez como mucho (una de sabor, otra de sorpresa). */
      maxConcurrent: 2,
      /** Duración de la ventana (semanas): unos meses. Se sortea en [min, max]. */
      durationMinWeeks: 8,
      durationMaxWeeks: 16,
      /** Boost de popularidad en el pico (se suma a la base, clamp 0..1). Sorteado. */
      intensityMin: 0.3,
      intensityMax: 0.45,
      /** Fracción de la ventana hasta el pico: sube rápido, decae más largo. */
      peakFrac: 0.35,
      /** Reseña mínima para que un lanzamiento pueda encender una "fiebre del oro". */
      hitFeverBar: 85,
      /** Probabilidad de que un hit (reseña ≥ bar) encienda una fiebre. */
      hitFeverChance: 0.5,
      /**
       * Multiplicador de saturación al lanzar sobre un target en fiebre
       * (docs/04 §3): inundar una fiebre la satura MÁS rápido, así que subirse
       * tú con un buen juego la aprovecha, pero apilar secuelas la quema.
       */
      feverSaturationMult: 2.5,
    },

    /** Saturación por lanzamientos similares (docs/04 §3): sube al lanzar, decae al olvidar. */
    saturation: {
      /** Cuánto suma cada lanzamiento al contador de su combo género|tema. */
      releaseIncrement: 1,
      /** Peso de la saturación de otros temas del mismo género (secuelas "de género"). */
      sameGenreWeight: 0.5,
      /** Decaimiento multiplicativo semanal del contador (el público "olvida"). */
      decayPerWeek: 0.95,
      /** k del modificador: modificadorVentas = 1 − k·saturación [docs/04 §3; +peso en 9.1]. */
      k: 0.3,
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
        /**
         * Suelo de la cola (Fase 9.1): con el marketing SIN TOPE la brecha ya
         * no está acotada a 1, así que la pérdida de cola se limita aquí (una
         * cola nunca cae más del 90 %). El golpe de reputación sí escala con
         * la brecha completa (la reputación ya se acota sola en 0).
         */
        tailPenaltyCap: 0.9,
        repHit: { hardcore: 5, comunidad: 4 },
      },
      /**
       * Puntos de reseña restados por PUNTO de hype por encima de freeHype
       * (Fase 9.1: pendiente sin tope — el marketing es un amplificador de
       * alta varianza; con hype 1.0 resta ~9.75, con 2.0 resta ~22.75).
       */
      reviewPenaltyPerHype: 13,
      /** Hasta este hype las expectativas no endurecen la reseña. */
      freeHype: 0.25,
      /** Empuje a las ventas de salida: pico × (1 + coef·hype) (docs/04 §6). */
      salesSpikeCoef: 1.2,
    },

    /** De Calidad a Reseña (docs/04 §5). Los sesgos por segmento viven en data/segments.ts. */
    reviews: {
      /**
       * El listón por era (Fase 9.1, docs/19 §9.1): la reseña compara la Q
       * interna contra un listón EN PARTE OCULTO que sube más rápido que tu
       * comodidad. notaBase = barScore + gain·(Q − eraBar). Un mismo 70
       * interno saca ~80 en E2 y ~60 en E5. La UI nunca muestra el número:
       * solo la línea cualitativa del desglose.
       */
      eraBar: {
        E1: 61,
        E2: 66,
        E3: 69,
        E4: 72,
        E5: 78,
        E6: 83,
        E7: 88,
      } satisfies Record<EraId, number>,
      /** Nota que saca un juego exactamente EN el listón de su era. */
      barScore: 70,
      /** Pendiente: gain > 1 amplifica las diferencias de Q (el techo importa más). */
      gain: 1.3,
      /** afinidadModa = span × (popCombo − neutral): ± puntos por estar (o no) de moda. */
      modaSpan: 12,
      modaNeutral: 0.5,
      /**
       * La repetición SATURA la nota (docs/19 §9.1 [DECIDIDO]): la ejecución
       * perfecta de un juego seguro alcanza el techo UNA vez; repetir la misma
       * fórmula fatiga a público y crítica.
       *   fatiga = min(max, perRepeat·repesRecientes + perSaturation·max(0, satEff − satMargin))
       * repesRecientes cuenta lanzamientos del MISMO combo tema×género dentro
       * de la ventana rodante (el público olvida con los años).
       */
      fatigue: {
        perRepeat: 5,
        repeatWindowWeeks: 156,
        perSaturation: 5,
        satMargin: 0.6,
        max: 18,
      },
      /**
       * Banda legible (docs/19 §9.1 [DECIDIDO]): la nota final lleva un
       * desvío entero en [−band, +band] ("gusto crítico y humor del mercado"),
       * determinista (stream propio del PRNG) y SIEMPRE explicado en el
       * desglose. Deja de ser calculadora sin volverse injusto.
       */
      band: 4,
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
    /** factorReseña = (reseña/100)^exponente: las reseñas altas venden desproporcionadamente más.
     * Bajado en 9.1: con el listón nuevo las notas tempranas rondan 45–55 y
     * el exponente 2 asfixiaba la economía de E1–E2. */
    reviewExponent: 1.55,
    /**
     * Nivel del mercado plano (Fase 9.4, docs/19 §9.4): con la base de
     * popularidad ya plana (~0,5), la demanda usa la pop NORMALIZADA por esa
     * base (mercado normal = 1) × este factor. Fija cuánto vende "lo normal"
     * antes de fiebres; se calibró con los bots para conservar la tensión de la
     * escala (la corporación sigue pudiendo quemar) sin que las tres filosofías
     * quiebren. La FIEBRE multiplica por encima (pop/base > 1).
     */
    popDemandScale: 0.45,
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
      // El AAA se queda en 70 tras 10.2-B: se probó a subirlo a 80 para
      // asegurar su ventaja de ingreso sobre el Muy grande, pero al arreglar su
      // ALCANCE (docs/20 W2-bis) el AAA ya rinde ~2× el Muy grande en beneficio
      // absoluto sin tocar la demanda — inflarla solo engordaba el late-game
      // del optimizador. El escalón se defiende con lo que ya tiene.
      aaa: 70,
    } satisfies Record<ProjectSize, number>,
    /**
     * Curva de lanzamiento (docs/04 §6): pico inicial + cola larga.
     *   curva(t) = pico(hype)·spikeDecay^t + tailAmp·tailDecay(reseña)^t
     */
    launch: {
      /** Altura base del pico de salida (se multiplica por el empuje del hype).
       * Subido en 9.1 junto a tailAmp: con las notas tempranas en 45–65, el
       * margen de E1–E2 quedaba tan fino que la "novatada" del primer equipo
       * (un mediano flojo con juniors recién fichados) quebraba al estudio. */
      spikeBase: 1.6,
      /** Decaimiento semanal del pico (rápido: las primeras semanas concentran ventas). */
      spikeDecay: 0.55,
      /** Altura de la cola larga. */
      tailAmp: 0.4,
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
