import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import type { ProjectSize } from '../model/project';
import type { ScaleStage } from '../model/gameState';

/**
 * Fase 10.2-B — el pase económico (docs/20 §"10.2-B — Plan del pase económico").
 * Aquí viven los INVARIANTES del pase: las relaciones entre números que, si se
 * rompen, rompen el diseño aunque cada valor suelto parezca razonable. Los
 * efectos dinámicos (ROI real, beneficio absoluto por tamaño, ritmo de escala)
 * los mide el arnés de bots `src/test/economyReport102B.ts`; lo que se puede
 * fijar como propiedad estructural, se fija aquí para que no se erosione con
 * el próximo retoque de balance.
 */

const SIZES: readonly ProjectSize[] = ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'];
const STAGES = [2, 3, 4, 5] as const;

/** Persona·semanas nominales de un tamaño: calendario × plantilla esperada. */
function personWeeks(size: ProjectSize): number {
  return (
    balance.development.phaseWeeksBySize[size] * 3 * balance.development.sizeGate[size].minStaff
  );
}

describe('W2 — la escalera de coste por tamaño (docs/20 W2)', () => {
  it('el coste base crece de forma estricta con el tamaño', () => {
    for (let i = 1; i < SIZES.length; i++) {
      expect(balance.economy.sizeBaseCost[SIZES[i]]).toBeGreaterThan(
        balance.economy.sizeBaseCost[SIZES[i - 1]],
      );
    }
  });

  it('el acantilado de Grande queda cerrado: su base pesa de verdad en el total', () => {
    // El diagnóstico de W2 era que en Mediano y Grande el coste base valía el
    // 5-7 % del total (la nómina lo dominaba TODO), así que subirlo no se
    // notaba. Con la escalera nueva el base pesa lo bastante como para que
    // elegir tamaño sea una decisión económica y no solo de calendario.
    const share = (size: ProjectSize) => {
      const payroll = personWeeks(size) * balance.economy.devCostPerPersonWeek;
      const base = balance.economy.sizeBaseCost[size];
      return base / (base + payroll);
    };
    expect(share('grande')).toBeGreaterThan(0.15);
    expect(share('muyGrande')).toBeGreaterThan(0.15);
    expect(share('aaa')).toBeGreaterThan(0.15);
  });

  it('el pequeño NO se encarece: subirlo agrandaba el acantilado que veníamos a aplanar', () => {
    // Deliberado (docs/20 W2, desviación medida con bots): con el base del
    // pequeño a 1.000 el optimizador quebraba en E2 s410 — el garaje nunca
    // juntaba la caja de su primer mediano. Y su ROI ya es el peor de la tabla.
    expect(balance.economy.sizeBaseCost.pequeno).toBeLessThan(1_000);
  });
});

describe('W2-bis — el AAA es una cima, no una trampa (docs/20 W2-bis)', () => {
  it('un equipo razonable de Corporación PUEDE llenar su alcance', () => {
    // El bug que se arregla: 40 personas daban alcance 0,77 (reseña 39). El
    // objetivo de poder del AAA tiene que caber en su propia plantilla mínima
    // con gente competente (~0,6 de poder por persona en su especialidad).
    const crew = balance.development.sizeGate.aaa.minStaff;
    expect(balance.quality.scope.powerTarget.aaa).toBeLessThanOrEqual(crew * 0.6);
  });

  it('sigue estrictamente POR ENCIMA del Muy grande en todos sus ejes', () => {
    const d = balance.development;
    // Más organización, más calendario, más alcance, más coste…
    expect(d.sizeGate.aaa.minStaff).toBeGreaterThan(d.sizeGate.muyGrande.minStaff);
    expect(d.phaseWeeksBySize.aaa).toBeGreaterThan(d.phaseWeeksBySize.muyGrande);
    expect(balance.quality.scope.powerTarget.aaa).toBeGreaterThan(
      balance.quality.scope.powerTarget.muyGrande,
    );
    expect(balance.economy.sizeBaseCost.aaa).toBeGreaterThan(
      balance.economy.sizeBaseCost.muyGrande,
    );
    // …más ingreso potencial (demanda × precio) y más premio en la gala…
    const potential = (size: ProjectSize) =>
      balance.sales.sizeDemandFactor[size] * balance.economy.priceBySize[size];
    expect(potential('aaa')).toBeGreaterThan(potential('muyGrande'));
    expect(balance.awards.competition.sizeBonus.aaa).toBeGreaterThan(
      balance.awards.competition.sizeBonus.muyGrande,
    );
    // …y más techo de calidad alcanzable donde queda techo que dar.
    for (const era of ['E4', 'E5', 'E6'] as const) {
      expect(balance.quality.capByEraSize[era].aaa).toBeGreaterThan(
        balance.quality.capByEraSize[era].muyGrande,
      );
    }
  });

  it('el overhead de la etapa 5 se alivió sin dejar de ser el escalón caro', () => {
    // EXP3 (10.2-A) demostró que la etapa 5 se paga sola: el trim es apoyo, no
    // la palanca — el arreglo real fue aligerar el AAA (la lumpiness de E6).
    const upkeep = balance.economy.upkeepExtraByStage;
    expect(upkeep[5]).toBeLessThan(30_000);
    expect(upkeep[5]).toBeGreaterThan(upkeep[4] * 2);
  });
});

describe('W3 — ampliar de etapa: capital + trayectoria (docs/20 W3)', () => {
  const scale = balance.staff.scale;

  it('cada requisito crece con la etapa, en las CUATRO dimensiones', () => {
    for (let i = 1; i < STAGES.length; i++) {
      const prev = scale.requirementsByStage[STAGES[i - 1]];
      const cur = scale.requirementsByStage[STAGES[i]];
      expect(cur.capital).toBeGreaterThan(prev.capital);
      expect(cur.staff).toBeGreaterThanOrEqual(prev.staff);
      expect(cur.gamesReleased).toBeGreaterThan(prev.gamesReleased);
      expect(cur.topReputation).toBeGreaterThanOrEqual(prev.topReputation);
    }
  });

  it('la subida de capital es INTERMEDIA, no un muro (y nunca temprana)', () => {
    // EXP1 probó que el capital no regula las etapas 4-5, así que sube ~×2,5-3
    // y el trabajo fino lo hace la trayectoria. La primera ampliación NO se
    // toca: un muro temprano solo añade tedio (y con 60k los bots quebraban).
    const previous = { 2: 25_000, 3: 200_000, 4: 1_500_000, 5: 8_000_000 } as const;
    expect(scale.requirementsByStage[2].capital).toBe(previous[2]);
    for (const stage of [3, 4, 5] as const) {
      const factor = scale.requirementsByStage[stage].capital / previous[stage];
      expect(factor).toBeGreaterThan(1.5);
      expect(factor).toBeLessThanOrEqual(3.5);
    }
  });

  it('ampliar cuesta la mitad del requisito: comprar nunca deja la caja en rojo', () => {
    for (const stage of STAGES) {
      const req = scale.requirementsByStage[stage].capital;
      expect(scale.upgradeCostByStage[stage]).toBeLessThan(req);
      expect(scale.upgradeCostByStage[stage] / req).toBeCloseTo(0.5, 1);
    }
  });

  it('el requisito de plantilla cabe siempre en el aforo de la etapa anterior', () => {
    for (const stage of STAGES) {
      const previous = (stage - 1) as ScaleStage;
      expect(scale.requirementsByStage[stage].staff).toBeLessThanOrEqual(
        scale.staffCapByStage[previous],
      );
    }
  });
});

describe('Préstamos — la deuda muerde (docs/20 §"Préstamos — rediseño, no parche")', () => {
  const loans = balance.economy.loans;

  it('la cuota obligatoria supera al interés: una deuda desatendida DECRECE', () => {
    // El fallo de 10.1: sin amortización forzosa el interés capitalizaba al
    // infinito (124,9 mil millones en la partida de la Fábrica) sin tocar caja
    // jamás. Con cuota > interés, la deuda no puede dispararse.
    expect(loans.minPaymentRate).toBeGreaterThan(loans.weeklyInterest);
  });

  it('pero la cuota no es confiscatoria: saldar lleva años, no semanas', () => {
    // Con ~2,5 %/sem netos de ~1,5 %, la deuda tarda del orden de 2-3 años en
    // saldarse sola. Endeudarse es una decisión con consecuencia, no una
    // sentencia inmediata: hay tiempo de reaccionar (y de que muerda).
    const netRate = loans.minPaymentRate - loans.weeklyInterest;
    expect(netRate).toBeLessThan(0.03);
    expect(Math.log(0.5) / Math.log(1 - netRate)).toBeGreaterThan(26);
  });

  it('la espiral avisa antes de ser irreversible y no grita por un puente trivial', () => {
    expect(loans.spiral.incomeRatio).toBeLessThan(1);
    expect(loans.spiral.minWeeklyInterest).toBeGreaterThan(0);
  });
});
