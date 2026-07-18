import type { EraDef, EraId } from '../core/model/era';

/**
 * Las 7 eras históricas (docs/02 §5, baseline v1). El paso de era es
 * automático por tiempo: `startWeek` marca su llegada (52 semanas = 1 año,
 * año 1 = 1980; ver balance.time). El listón de nota por era (`eraBar`, 9.1)
 * y los techos de Q por era son números de balance y viven en data/balance.ts.
 *
 * Los `unlocks` del esquema de docs/09 §7 se derivan del propio contenido
 * (campo `appearsInEra` de géneros/temas/plataformas/features/creadores/
 * monetización) vía `eraUnlocks()`: una sola fuente de verdad, sin listas
 * duplicadas que puedan desincronizarse.
 */
export const eras: readonly EraDef[] = [
  {
    id: 'E1',
    name: 'La chispa',
    period: '~1980–1985',
    startWeek: 1,
    transitionHeadline: 'Unos chavales programan juegos en el garaje.',
    transitionSummary:
      'Micro-ordenadores como el PC Casero y el Commo 64. Se venden copias en cinta y disco. Todo está por inventar.',
  },
  {
    id: 'E2',
    name: 'Las consolas',
    period: '~1985–1992',
    startWeek: 261,
    transitionHeadline: 'Las consolas invaden los salones: empieza la era de los cartuchos.',
    transitionSummary:
      'La Gameling portátil y la Master V traen licencias de plataforma y dev-kits de pago. Nacen los shooters, las plataformas y los juegos de deportes.',
  },
  {
    id: 'E3',
    name: 'El salto 3D',
    period: '~1993–2000',
    startWeek: 677,
    transitionHeadline: 'El CD-ROM y los 32 bits lo cambian todo: el 3D ha llegado.',
    transitionSummary:
      'La Playsystem y la N-Cube disparan presupuestos y marketing. Voz digitalizada, cinemáticas, terror y carreras. El listón de calidad sube.',
  },
  {
    id: 'E4',
    name: 'La red',
    period: '~2001–2008',
    startWeek: 1093,
    transitionHeadline: 'Internet conecta a los jugadores: nace el online.',
    transitionSummary:
      'PC online, la Playsystem 2 y los primeros parches post-venta y DLC. El multijugador online se puede investigar. El mercado se globaliza.',
  },
  {
    id: 'E5',
    name: 'Digital y móvil',
    period: '~2009–2015',
    startWeek: 1509,
    transitionHeadline: 'Tiendas digitales y smartphones: todo el mundo juega.',
    transitionSummary:
      'El móvil multiplica el mercado y llegan el free-to-play y las microtransacciones. Los indies florecen; las loot boxes asoman. El público se vuelve exigente.',
  },
  {
    id: 'E6',
    name: 'Servicios y streamers',
    period: '~2016–2023',
    startWeek: 1873,
    transitionHeadline: 'El streaming manda: los juegos son servicios y los streamers, prensa.',
    transitionSummary:
      'Cloud, early access, pases de batalla y battle royale. Los creadores de contenido deciden qué se juega. La regulación acecha a las loot boxes.',
  },
  {
    id: 'E7',
    name: 'El futuro cercano',
    period: '~2024+',
    startWeek: 2289,
    transitionHeadline: 'Realidad mixta e IA generativa: el futuro ya está aquí.',
    transitionSummary:
      'Visores de realidad mixta, compañeros con IA y modelos de negocio especulativos. Lo que hagas ahora define tu legado.',
  },
];

/** Orden canónico de las eras para comparar "la era ya llegó" (docs/02 §5). */
export const eraOrder: readonly EraId[] = eras.map((e) => e.id);

export function getEra(id: EraId): EraDef {
  const era = eras.find((e) => e.id === id);
  if (!era) throw new Error(`Era desconocida: ${id}`);
  return era;
}

export function eraIndex(id: EraId): number {
  return eraOrder.indexOf(id);
}

export function eraAtLeast(era: EraId, minEra: EraId): boolean {
  return eraIndex(era) >= eraIndex(minEra);
}

/** Era que corresponde a una semana absoluta (la última cuyo startWeek llegó). */
export function eraForWeek(week: number): EraId {
  let current: EraId = eras[0].id;
  for (const era of eras) {
    if (week >= era.startWeek) current = era.id;
  }
  return current;
}
