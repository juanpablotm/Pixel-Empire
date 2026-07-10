import type { Platform } from '../core/model/content';

/**
 * Plataformas semilla de E1 (docs/09 §4): micro-ordenadores ficticios de ~1980.
 * Sin licencia en E1 (plataformas abiertas); las consolas con dev-kit de pago
 * llegan en E2+ (docs/06 §4: 10k–100k según generación).
 */
export const platforms: readonly Platform[] = [
  {
    id: 'pcCasero',
    name: 'PC Casero',
    manufacturer: 'Varios ensambladores',
    appearsInEra: 'E1',
    baseMarketSize: 400,
    genreAffinity: { rpg: 1.0, estrategia: 1.0, aventura: 0.75, puzzle: 0.75 },
    licenseCost: 0,
  },
  {
    id: 'commo64',
    name: 'Commo 64',
    manufacturer: 'Commo Ltd.',
    appearsInEra: 'E1',
    baseMarketSize: 550,
    genreAffinity: { rpg: 0.75, estrategia: 0.5, aventura: 1.0, puzzle: 1.0 },
    licenseCost: 0,
  },
];

export function getPlatform(id: string): Platform {
  const platform = platforms.find((p) => p.id === id);
  if (!platform) throw new Error(`Plataforma desconocida: ${id}`);
  return platform;
}
