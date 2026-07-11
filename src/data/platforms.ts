import type { Platform } from '../core/model/content';

/**
 * Plataformas semilla de E1 (docs/09 §4): micro-ordenadores ficticios de ~1980.
 * Sin licencia en E1 (plataformas abiertas); las consolas con dev-kit de pago
 * llegan en E2+ (docs/06 §4: 10k–100k según generación).
 *
 * lifecycleCurve (docs/04 §7): base instalada guionizada por semana absoluta,
 * en unidades de demanda semanal potencial. El PC Casero crece lento y no
 * muere; el Commo 64 domina pronto, toca techo y declina hasta descatalogarse.
 */
export const platforms: readonly Platform[] = [
  {
    id: 'pcCasero',
    name: 'PC Casero',
    manufacturer: 'Varios ensambladores',
    appearsInEra: 'E1',
    releaseWeek: 0,
    endWeek: 10_000,
    lifecycleCurve: [
      { week: 0, value: 320 },
      { week: 60, value: 420 },
      { week: 200, value: 620 },
      { week: 400, value: 700 },
    ],
    genreAffinity: { rpg: 1.0, estrategia: 1.0, aventura: 0.75, puzzle: 0.75 },
    audienceBias: { hardcore: 1.15, amplio: 1.0, casual: 0.85, infantil: 0.7 },
    licenseCost: 0,
  },
  {
    id: 'commo64',
    name: 'Commo 64',
    manufacturer: 'Commo Ltd.',
    appearsInEra: 'E1',
    releaseWeek: 0,
    endWeek: 300,
    lifecycleCurve: [
      { week: 0, value: 480 },
      { week: 50, value: 640 },
      { week: 110, value: 680 },
      { week: 180, value: 420 },
      { week: 260, value: 120 },
      { week: 300, value: 0 },
    ],
    genreAffinity: { rpg: 0.75, estrategia: 0.5, aventura: 1.0, puzzle: 1.0 },
    audienceBias: { hardcore: 0.85, amplio: 1.05, casual: 1.15, infantil: 1.1 },
    licenseCost: 0,
  },
];

export function getPlatform(id: string): Platform {
  const platform = platforms.find((p) => p.id === id);
  if (!platform) throw new Error(`Plataforma desconocida: ${id}`);
  return platform;
}
