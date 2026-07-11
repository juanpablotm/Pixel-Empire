import type { LegacyProfile } from '../core/model/moral';

/**
 * Frases-retrato del Legado (docs/06 §6): cada final cuenta una historia
 * distinta según el perfil del estudio. Solo texto; el cálculo vive en
 * core/systems/legacy.ts.
 */

export const legacyAxisLabels: Record<
  'riqueza' | 'prestigio' | 'impacto' | 'obras' | 'etica',
  string
> = {
  riqueza: 'Riqueza',
  prestigio: 'Prestigio',
  impacto: 'Impacto',
  obras: 'Obras maestras',
  etica: 'Ética',
};

/** Retrato según el eje dominante y el contexto (elegido en core/systems/legacy.ts). */
export const legacyVerdicts = {
  richButHated: 'Construiste un imperio. Un imperio inmensamente rico… y cordialmente odiado.',
  richAndLoved: 'Riqueza y cariño a la vez: el unicornio de la industria. Enhorabuena.',
  belovedButPoor: 'Un estudio adorado que nunca fue rico. Los jugadores aún cuentan tus juegos.',
  artisan: 'Obras maestras sobre la mesa y ética intacta: un taller de artesanos legendario.',
  pioneer: 'Llegaste antes que nadie a las modas que definieron una época. Un pionero.',
  greyFactory: 'Ni rico, ni querido, ni recordado: una fábrica gris que hizo juegos. Algunos, majos.',
  crashedAndBurned: 'La codicia pagó bien hasta que dejó de hacerlo. La bancarrota escribió el final.',
} as const;

export type LegacyVerdictKey = keyof typeof legacyVerdicts;

/** Umbrales de lectura del perfil (solo presentación del veredicto). */
export const legacyVerdictThresholds = {
  high: 65,
  low: 40,
};

export function legacyDominantAxis(profile: LegacyProfile): keyof typeof legacyAxisLabels {
  const axes = ['riqueza', 'prestigio', 'impacto', 'obras', 'etica'] as const;
  return axes.reduce((best, axis) => (profile[axis] > profile[best] ? axis : best), axes[0]);
}
