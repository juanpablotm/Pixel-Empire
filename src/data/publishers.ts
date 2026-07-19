import type { EraId } from '../core/model/era';
import type { ProjectSize } from '../core/model/project';

/**
 * Publishers (Fase 9.6, docs/19 §9.6 y docs/06 §4.1): quienes ponen el dinero
 * cuando tú no lo tienes — a cambio de la parte del león. Cada entrada es un
 * PERFIL DE TRATO, no números sueltos: el adelanto concreto lo calcula
 * core/systems/publishers.ts sobre el coste del tamaño (los factores viven en
 * balance.publishers). Entrada escalonada por eras, como los rivales: la
 * industria moderna (E5+) trata mejor al desarrollador — para entonces,
 * idealmente, ya no los necesitas.
 */

export interface PublisherDef {
  id: string;
  name: string;
  /** Frase de sabor para la tarjeta de oferta (quiénes son y qué buscan). */
  blurb: string;
  appearsInEra: EraId;
  /** Desde esta era deja de ofrecer tratos (absorbido/retirado del negocio). */
  retiresInEra?: EraId;
  /** Fracción de los ingresos BRUTOS del juego que SE QUEDA el publisher. */
  revShare: number;
  /**
   * Multiplicador sobre el coste de desarrollo estimado del tamaño → adelanto.
   * >1 = te financian con margen; <1 = adelanto corto (trato "justo" en %).
   */
  advanceCoverage: number;
  /** Se queda la IP: ese juego no es tuyo para franquicias/secuelas (9.7). */
  demandsIp: boolean;
  /** Exige lanzar en UNA sola plataforma (aunque tu motor admita más). */
  exclusivePlatform: boolean;
  /**
   * Multiplicador sobre balance.publishers.marketingBudgetBySize: la bolsa de
   * marketing que el publisher paga por este juego (0 = no pone un duro).
   */
  marketingBudgetMult: number;
  /**
   * Alcance de su red de distribución: demanda del juego × (1 + boost).
   * La otra mitad del trato: el 30 % de un pastel MÁS GRANDE. Sin esto el
   * contrato sería pura trampa (lección de bots de 9.6: el firmado pobre
   * nunca acumulaba para independizarse).
   */
  distributionBoost: number;
  /** Tamaños de proyecto que financia. */
  sizes: ProjectSize[];
  /** Reputación agregada mínima para que se siente a negociar contigo. */
  minReputation: number;
}

export const publisherDefs: readonly PublisherDef[] = [
  // 1980: los dos de siempre. El coloso que te lo paga todo (y se lo queda
  // todo) y el conservador que respeta tu IP pero te ata a una plataforma.
  {
    id: 'magnavista',
    name: 'Magnavista Corp',
    blurb: 'El coloso del sector. Cheques generosos, letra pequeña voraz.',
    appearsInEra: 'E1',
    revShare: 0.75,
    advanceCoverage: 1.35,
    demandsIp: true,
    exclusivePlatform: false,
    marketingBudgetMult: 1.5,
    distributionBoost: 0.35,
    sizes: ['pequeno', 'mediano', 'grande'],
    minReputation: 0,
  },
  {
    id: 'cartuchoBros',
    name: 'Cartucho Bros.',
    blurb: 'Distribuidora familiar: tu juego sigue siendo tuyo, pero solo en SU plataforma.',
    appearsInEra: 'E1',
    retiresInEra: 'E5',
    revShare: 0.7,
    advanceCoverage: 1.15,
    demandsIp: false,
    exclusivePlatform: true,
    marketingBudgetMult: 1,
    distributionBoost: 0.25,
    sizes: ['pequeno', 'mediano'],
    minReputation: 0,
  },
  // E2–E3: el músculo del marketing y el trato "justo" que exige currículum.
  {
    id: 'titan',
    name: 'Titán Interactive',
    blurb: 'Maquinaria de marketing masivo. Tu juego en todos los escaparates… con su logo delante.',
    appearsInEra: 'E2',
    revShare: 0.72,
    advanceCoverage: 1.25,
    demandsIp: false,
    exclusivePlatform: false,
    marketingBudgetMult: 2,
    distributionBoost: 0.45,
    sizes: ['mediano', 'grande', 'muyGrande'],
    minReputation: 0,
  },
  {
    id: 'nebula',
    name: 'Nébula Soft',
    blurb: 'El sello de prestigio: reparto decente y respeto por el autor. Solo firma con estudios con nombre.',
    appearsInEra: 'E3',
    revShare: 0.65,
    advanceCoverage: 1,
    demandsIp: false,
    exclusivePlatform: false,
    marketingBudgetMult: 0.75,
    distributionBoost: 0.2,
    sizes: ['pequeno', 'mediano', 'grande'],
    minReputation: 60,
  },
  // E4: el socio (carísimo) de los juegos enormes.
  {
    id: 'goliath',
    name: 'Goliath Publishing',
    blurb: 'Financia superproducciones que ningún estudio puede pagar solo. La IP es el precio.',
    appearsInEra: 'E4',
    revShare: 0.7,
    advanceCoverage: 1.3,
    demandsIp: true,
    exclusivePlatform: false,
    marketingBudgetMult: 1.5,
    distributionBoost: 0.35,
    sizes: ['grande', 'muyGrande', 'aaa'],
    minReputation: 0,
  },
  // E5: la boutique digital. La industria ya no muerde tanto… cuando llega.
  {
    id: 'indieForge',
    name: 'IndieForge Digital',
    blurb: 'Sello boutique de la era digital: reparto blando, adelanto corto, cero humos.',
    appearsInEra: 'E5',
    revShare: 0.55,
    advanceCoverage: 0.8,
    demandsIp: false,
    exclusivePlatform: false,
    marketingBudgetMult: 0.5,
    distributionBoost: 0.15,
    sizes: ['pequeno', 'mediano'],
    minReputation: 0,
  },
];

export function getPublisher(id: string): PublisherDef {
  const def = publisherDefs.find((p) => p.id === id);
  if (!def) throw new Error(`Publisher desconocido: ${id}`);
  return def;
}
